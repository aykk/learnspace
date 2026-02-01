import { NextResponse } from 'next/server';
import { getAllClusters, getClusterById } from '@/lib/db';

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

    // Get all clusters
    const clusters = await getAllClusters();
    return NextResponse.json({
      clusters: clusters.map(parseClusterRecord),
    });
  } catch (error) {
    console.error('Get clusters error:', error);
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
