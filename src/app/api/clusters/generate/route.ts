import { NextResponse } from 'next/server';
import { getAllIRs, insertCluster, deleteAllClusters } from '@/lib/db';
import { generateClusters } from '@/lib/services/clustering';

/**
 * POST /api/clusters/generate
 * Generate clusters from all existing IRs
 */
export async function POST() {
  try {
    console.log('🧩 [Clusters] Starting cluster generation...');
    
    // Get all IRs
    const irs = await getAllIRs();
    
    if (irs.length === 0) {
      return NextResponse.json(
        { error: 'No IRs found. Add some bookmarks first!' },
        { status: 400 }
      );
    }

    console.log(`🧩 [Clusters] Found ${irs.length} IRs`);

    // Clear existing clusters
    const deletedCount = await deleteAllClusters();
    if (deletedCount > 0) {
      console.log(`🧩 [Clusters] Deleted ${deletedCount} existing clusters`);
    }

    // Generate new clusters using Gemini
    const clusters = await generateClusters(irs);

    // Store clusters in Snowflake
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

    console.log(`🧩 [Clusters] Successfully generated and stored ${clusters.length} clusters`);

    return NextResponse.json({
      success: true,
      clustersGenerated: clusters.length,
      clusters: clusters.map(c => ({
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
