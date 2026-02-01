import { NextResponse } from 'next/server';
import { getAllIRs, getAllClusters, insertCluster, addIRsToCluster, deleteEmptyClusters } from '@/lib/db';
import { generateClusters, assignUnassignedIRsToClusters } from '@/lib/services/clustering';
import type { ClusterRecord } from '@/lib/db';

function parseIrIds(irIds: unknown): string[] {
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
 * POST /api/clusters/generate
 * Incremental cluster update: never deletes existing clusters.
 * - If no clusters exist: generate initial clusters from all IRs.
 * - If clusters exist: only assign unassigned IRs to existing clusters or create new clusters.
 * Clusters can only lose size or be deleted when the user removes a link (bookmark).
 */
export async function POST() {
  try {
    console.log('🧩 [Clusters] Starting cluster generation (incremental, never delete)...');

    const irs = await getAllIRs();
    if (irs.length === 0) {
      return NextResponse.json(
        { error: 'No IRs found. Add some bookmarks first!' },
        { status: 400 }
      );
    }

    const existingClusterRecords = await getAllClusters();

    // First-time: no clusters yet → run full clustering
    if (existingClusterRecords.length === 0) {
      console.log(`🧩 [Clusters] No existing clusters; generating initial set from ${irs.length} IRs`);
      const clusters = await generateClusters(irs);
      for (const cluster of clusters) {
        await insertCluster({
          id: cluster.id,
          name: cluster.name,
          description: cluster.description,
          irIds: cluster.irIds,
          aggregatedTopics: cluster.aggregatedTopics,
          memberCount: cluster.memberCount,
          avgDifficulty: cluster.avgDifficulty,
        });
      }
      console.log(`🧩 [Clusters] Created ${clusters.length} initial clusters`);
      return NextResponse.json({
        success: true,
        mode: 'initial',
        clustersGenerated: clusters.length,
        clusters: clusters.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          memberCount: c.memberCount,
          avgDifficulty: c.avgDifficulty,
        })),
      });
    }

    // Incremental: find IRs not in any existing cluster
    const allAssignedIrIds = new Set<string>();
    for (const c of existingClusterRecords) {
      const ids = parseIrIds(c.IR_IDS);
      ids.forEach((id) => allAssignedIrIds.add(id));
    }
    const unassignedIRs = irs.filter((ir) => !allAssignedIrIds.has(ir.ID));

    if (unassignedIRs.length === 0) {
      console.log('🧩 [Clusters] All IRs already assigned; nothing to add.');
      return NextResponse.json({
        success: true,
        mode: 'incremental',
        clustersGenerated: 0,
        assignmentsApplied: 0,
        newClustersCreated: 0,
        message: 'All links already in clusters. Add new bookmarks to assign them.',
      });
    }

    const existingClusters = existingClusterRecords.map((c: ClusterRecord) => ({
      id: c.ID,
      name: c.NAME,
      description: c.DESCRIPTION || '',
      irIds: parseIrIds(c.IR_IDS),
    }));

    const { assignments, newClusters } = await assignUnassignedIRsToClusters(
      existingClusters,
      unassignedIRs
    );

    // Apply assignments: add each IR to the specified existing clusters
    for (const { irId, addToClusterIds } of assignments) {
      for (const clusterId of addToClusterIds) {
        await addIRsToCluster(clusterId, [irId]);
      }
    }

    // Insert new clusters
    for (const cluster of newClusters) {
      await insertCluster({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        irIds: cluster.irIds,
        aggregatedTopics: cluster.aggregatedTopics,
        memberCount: cluster.memberCount,
        avgDifficulty: cluster.avgDifficulty,
      });
    }

    const emptyDeleted = await deleteEmptyClusters();
    if (emptyDeleted > 0) console.log(`🧩 [Clusters] Deleted ${emptyDeleted} empty clusters`);

    console.log(
      `🧩 [Clusters] Incremental update: ${assignments.length} assignments applied, ${newClusters.length} new clusters created`
    );

    return NextResponse.json({
      success: true,
      mode: 'incremental',
      clustersGenerated: newClusters.length,
      assignmentsApplied: assignments.length,
      newClustersCreated: newClusters.length,
      clusters: newClusters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        memberCount: c.memberCount,
        avgDifficulty: c.avgDifficulty,
      })),
    });
  } catch (error) {
    console.error('Cluster generation error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
