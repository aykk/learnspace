/**
 * Database layer for Learnspace - Snowflake backend
 */

import { query, execute } from './snowflake';

export interface Bookmark {
  ID: number;
  URL: string;
  TITLE: string | null;
  DATE_ADDED: string | null;
  LOAD_TIME: string;
}

// --- Bookmarks ---

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const rows = await query<Bookmark>(
    'SELECT ID, URL, TITLE, DATE_ADDED, LOAD_TIME FROM LEARNSPACE_BOOKMARKS ORDER BY LOAD_TIME DESC'
  );
  return rows;
}

export async function getBookmarksForPodcast(): Promise<{ URL: string; TITLE: string | null }[]> {
  const rows = await query<{ URL: string; TITLE: string | null }>(
    'SELECT URL, TITLE FROM LEARNSPACE_BOOKMARKS ORDER BY LOAD_TIME DESC LIMIT 15'
  );
  return rows;
}

export async function insertBookmark(url: string, title: string, dateAdded: string | null): Promise<number> {
  // Insert the bookmark
  await execute(
    'INSERT INTO LEARNSPACE_BOOKMARKS (URL, TITLE, DATE_ADDED) VALUES (?, ?, ?)',
    [url, title, dateAdded]
  );
  
  // Get the last inserted ID (Snowflake doesn't have last_insert_id, so we query by URL)
  const rows = await query<{ ID: number }>(
    'SELECT ID FROM LEARNSPACE_BOOKMARKS WHERE URL = ? ORDER BY LOAD_TIME DESC LIMIT 1',
    [url]
  );
  
  return rows[0]?.ID || 0;
}

export async function deleteBookmark(url: string): Promise<number> {
  // Get bookmark and its IR (if any) before deleting
  const bookmarks = await query<{ ID: number }>(
    'SELECT ID FROM LEARNSPACE_BOOKMARKS WHERE URL = ? LIMIT 1',
    [url]
  );
  const bookmarkId = bookmarks[0]?.ID;
  const existingIR = bookmarkId ? await getIRByBookmarkId(bookmarkId) : null;
  const irIdToRemove = existingIR?.ID ?? null;

  // Delete the bookmark
  const affected = await execute(
    'DELETE FROM LEARNSPACE_BOOKMARKS WHERE URL = ?',
    [url]
  );

  // If bookmark was deleted, cascade: delete IR and update clusters
  if (affected > 0 && bookmarkId) {
    try {
      await execute(
        'DELETE FROM INTERMEDIATE_REPRESENTATIONS WHERE BOOKMARK_ID = ?',
        [bookmarkId]
      );
      console.log(`❄️  [Learnspace DB] Deleted IR for bookmark ${bookmarkId}`);
    } catch (error) {
      console.error('Failed to delete IR:', error);
    }
    // Remove this IR from any clusters that contain it (or delete empty clusters)
    if (irIdToRemove) {
      try {
        await removeIRFromClusters(irIdToRemove);
      } catch (error) {
        console.error('Failed to update clusters after IR delete:', error);
      }
    }
  }

  return affected;
}

export async function clearAllBookmarks(): Promise<number> {
  // Get count before deletion
  const countRows = await query<{ COUNT: number }>('SELECT COUNT(*) as COUNT FROM LEARNSPACE_BOOKMARKS');
  const before = countRows[0]?.COUNT || 0;
  
  // Delete all bookmarks
  await execute('DELETE FROM LEARNSPACE_BOOKMARKS');
  
  // Also delete all IRs (cascade delete)
  try {
    await execute('DELETE FROM INTERMEDIATE_REPRESENTATIONS');
    console.log('❄️  [Learnspace DB] Deleted all IRs');
  } catch (error) {
    console.error('Failed to delete all IRs:', error);
  }
  
  // Also delete all clusters since they reference IRs
  try {
    await execute('DELETE FROM CLUSTERS');
    console.log('❄️  [Learnspace DB] Deleted all clusters');
  } catch (error) {
    console.error('Failed to delete all clusters:', error);
  }
  
  return before;
}

// --- Intermediate Representations ---

export interface IRRecord {
  ID: string;
  VERSION: number;
  BOOKMARK_ID: number;
  SOURCE_URL: string;
  SOURCE_TITLE: string | null;
  CREATED_AT: string;
  SUMMARY: string;
  KEY_TOPICS: string | string[]; // VARIANT in Snowflake returns as object
  CONCEPTS: string | any[]; // VARIANT in Snowflake returns as object
  DIFFICULTY: string;
  CONTENT_TYPE: string;
  ESTIMATED_READ_TIME: number | null;
  RAW_TEXT: string | null;
}

export async function insertIR(ir: {
  id: string;
  version: number;
  bookmarkId: number;
  sourceUrl: string;
  sourceTitle: string | null;
  summary: string;
  keyTopics: string[];
  concepts: any[];
  difficulty: string;
  contentType: string;
  estimatedReadTime?: number;
  rawText?: string;
}): Promise<void> {
  // Use SELECT with PARSE_JSON() instead of VALUES to avoid bind parameter issues
  await execute(
    `INSERT INTO INTERMEDIATE_REPRESENTATIONS 
     (ID, VERSION, BOOKMARK_ID, SOURCE_URL, SOURCE_TITLE, SUMMARY, KEY_TOPICS, CONCEPTS, 
      DIFFICULTY, CONTENT_TYPE, ESTIMATED_READ_TIME, RAW_TEXT)
     SELECT ?, ?, ?, ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), ?, ?, ?, ?`,
    [
      ir.id,
      ir.version,
      ir.bookmarkId,
      ir.sourceUrl,
      ir.sourceTitle,
      ir.summary,
      JSON.stringify(ir.keyTopics),
      JSON.stringify(ir.concepts),
      ir.difficulty,
      ir.contentType,
      ir.estimatedReadTime ?? null,
      ir.rawText ?? null,
    ]
  );
}

export async function getIRByBookmarkId(bookmarkId: number): Promise<IRRecord | null> {
  const rows = await query<IRRecord>(
    'SELECT * FROM INTERMEDIATE_REPRESENTATIONS WHERE BOOKMARK_ID = ? LIMIT 1',
    [bookmarkId]
  );
  return rows[0] || null;
}

export async function getAllIRs(): Promise<IRRecord[]> {
  const rows = await query<IRRecord>(
    'SELECT * FROM INTERMEDIATE_REPRESENTATIONS ORDER BY CREATED_AT DESC'
  );
  return rows;
}

// --- Clusters ---

export interface ClusterRecord {
  ID: string;
  NAME: string;
  DESCRIPTION: string | null;
  CREATED_AT: string;
  UPDATED_AT: string;
  IR_IDS: string | string[]; // VARIANT
  AGGREGATED_TOPICS: string | string[]; // VARIANT
  MEMBER_COUNT: number;
  AVG_DIFFICULTY: string | null;
}

export async function insertCluster(cluster: {
  id: string;
  name: string;
  description: string | null;
  irIds: string[];
  aggregatedTopics: string[];
  memberCount: number;
  avgDifficulty: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO CLUSTERS 
     (ID, NAME, DESCRIPTION, IR_IDS, AGGREGATED_TOPICS, MEMBER_COUNT, AVG_DIFFICULTY)
     SELECT ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), ?, ?`,
    [
      cluster.id,
      cluster.name,
      cluster.description,
      JSON.stringify(cluster.irIds),
      JSON.stringify(cluster.aggregatedTopics),
      cluster.memberCount,
      cluster.avgDifficulty,
    ]
  );
}

export async function getAllClusters(): Promise<ClusterRecord[]> {
  const rows = await query<ClusterRecord>(
    'SELECT * FROM CLUSTERS ORDER BY CREATED_AT DESC'
  );
  return rows;
}

export async function getClusterById(id: string): Promise<ClusterRecord | null> {
  const rows = await query<ClusterRecord>(
    'SELECT * FROM CLUSTERS WHERE ID = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function deleteAllClusters(): Promise<number> {
  const countRows = await query<{ COUNT: number }>('SELECT COUNT(*) as COUNT FROM CLUSTERS');
  const before = countRows[0]?.COUNT || 0;
  
  await execute('DELETE FROM CLUSTERS');
  return before;
}

/**
 * Parse IR_IDS from a cluster record (VARIANT can return string or array)
 */
function parseClusterIrIds(irIds: unknown): string[] {
  if (Array.isArray(irIds)) return irIds as string[];
  if (typeof irIds === 'string') {
    try {
      const parsed = JSON.parse(irIds);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Delete any clusters that have 0 links (empty clusters).
 * Call after incremental updates or when cleaning up.
 */
export async function deleteEmptyClusters(): Promise<number> {
  const clusters = await getAllClusters();
  let deleted = 0;
  for (const c of clusters) {
    const irIds = parseClusterIrIds(c.IR_IDS);
    if (irIds.length === 0) {
      await execute('DELETE FROM CLUSTERS WHERE ID = ?', [c.ID]);
      deleted++;
      console.log(`❄️  [Learnspace DB] Deleted empty cluster ${c.ID}`);
    }
  }
  return deleted;
}

/**
 * Update a cluster's IR_IDS and MEMBER_COUNT (e.g. after removing an IR)
 */
export async function updateClusterMembers(
  clusterId: string,
  irIds: string[],
  memberCount: number
): Promise<void> {
  await execute(
    'UPDATE CLUSTERS SET IR_IDS = PARSE_JSON(?), MEMBER_COUNT = ? WHERE ID = ?',
    [JSON.stringify(irIds), memberCount, clusterId]
  );
}

/**
 * Add IRs to an existing cluster (merge; never remove).
 * Used when refreshing: new links get assigned to existing clusters.
 */
export async function addIRsToCluster(
  clusterId: string,
  additionalIrIds: string[]
): Promise<void> {
  if (additionalIrIds.length === 0) return;
  const cluster = await getClusterById(clusterId);
  if (!cluster) return;
  const current = parseClusterIrIds(cluster.IR_IDS);
  const merged = [...new Set([...current, ...additionalIrIds])];
  await updateClusterMembers(clusterId, merged, merged.length);
}

/**
 * Remove a deleted IR from all clusters that contain it.
 * Deletes clusters that end up with zero members.
 */
export async function removeIRFromClusters(irId: string): Promise<void> {
  const clusters = await getAllClusters();
  
  for (const cluster of clusters) {
    const irIds = parseClusterIrIds(cluster.IR_IDS);
    if (!irIds.includes(irId)) continue;
    
    const newIrIds = irIds.filter((id) => id !== irId);
    const newCount = newIrIds.length;
    
    if (newCount === 0) {
      await execute('DELETE FROM CLUSTERS WHERE ID = ?', [cluster.ID]);
      console.log(`❄️  [Learnspace DB] Deleted empty cluster ${cluster.ID}`);
    } else {
      await updateClusterMembers(cluster.ID, newIrIds, newCount);
      console.log(`❄️  [Learnspace DB] Removed IR ${irId} from cluster ${cluster.ID} (${newCount} members left)`);
    }
  }
}

/**
 * Delete a cluster by ID
 */
export async function deleteCluster(clusterId: string): Promise<boolean> {
  try {
    const affected = await execute('DELETE FROM CLUSTERS WHERE ID = ?', [clusterId]);
    if (affected > 0) {
      console.log(`❄️  [Learnspace DB] Deleted cluster ${clusterId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete cluster ${clusterId}:`, error);
    throw error;
  }
}
