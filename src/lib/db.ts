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
  const affected = await execute(
    'DELETE FROM LEARNSPACE_BOOKMARKS WHERE URL = ?',
    [url]
  );
  return affected;
}

export async function clearAllBookmarks(): Promise<number> {
  // Get count before deletion
  const countRows = await query<{ COUNT: number }>('SELECT COUNT(*) as COUNT FROM LEARNSPACE_BOOKMARKS');
  const before = countRows[0]?.COUNT || 0;
  
  await execute('DELETE FROM LEARNSPACE_BOOKMARKS');
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
