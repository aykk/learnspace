import { NextRequest, NextResponse } from 'next/server';
import { getAllClusters, getClusterById, deleteEmptyClusters, deleteCluster } from '@/lib/db';

/**
 * GET /api/clusters
 * Get all clusters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific cluster
      const cluster = await getClusterById(id);
      if (!cluster) {
        return NextResponse.json(
          { error: 'Cluster not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ cluster: parseClusterRecord(cluster) });
    }

    // Remove empty clusters from DB so they don't persist
    await deleteEmptyClusters();

    // Get all clusters (only non-empty after cleanup)
    const clusters = await getAllClusters();
    const parsed = clusters.map(parseClusterRecord);

    // Only return clusters with at least one member (safety filter)
    const nonEmpty = parsed.filter(
      (c) => (c.memberCount ?? 0) > 0 && (c.irIds?.length ?? 0) > 0
    );

    return NextResponse.json({
      clusters: nonEmpty,
    });
  } catch (error) {
    console.error('Get clusters error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clusters?id=clusterId
 * Delete a cluster by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Cluster ID required (query parameter: ?id=clusterId)' },
        { status: 400 }
      );
    }

    const deleted = await deleteCluster(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Cluster deleted' });
  } catch (error) {
    console.error('Delete cluster error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

function parseClusterRecord(record: any) {
  const parseJsonField = (field: any) => {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    }
    return field;
  };

  return {
    id: record.ID,
    name: record.NAME,
    description: record.DESCRIPTION,
    createdAt: record.CREATED_AT,
    updatedAt: record.UPDATED_AT,
    irIds: parseJsonField(record.IR_IDS),
    aggregatedTopics: parseJsonField(record.AGGREGATED_TOPICS),
    memberCount: record.MEMBER_COUNT,
    avgDifficulty: record.AVG_DIFFICULTY,
  };
}
