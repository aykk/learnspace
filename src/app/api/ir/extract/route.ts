import { NextRequest, NextResponse } from 'next/server';
import { extractIRFromUrl } from '@/lib/services/gemini';
import { insertIR, getIRByBookmarkId } from '@/lib/db';

/**
 * POST /api/ir/extract
 * Extract IR for a bookmark
 * Body: { bookmarkId: number, url: string, title?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookmarkId, url, title } = await request.json();

    if (!bookmarkId || !url) {
      return NextResponse.json(
        { error: 'bookmarkId and url required' },
        { status: 400 }
      );
    }

    // Check if IR already exists for this bookmark
    const existing = await getIRByBookmarkId(bookmarkId);
    if (existing) {
      return NextResponse.json({
        message: 'IR already exists for this bookmark',
        ir: parseIRRecord(existing),
      });
    }

    console.log(`\n❄️ [IR] Extracting IR for bookmark ${bookmarkId}: ${url}`);

    // Extract IR using Gemini
    const ir = await extractIRFromUrl(url, title || null);

    // Store in database
    await insertIR({
      id: ir.id,
      version: ir.version,
      bookmarkId,
      sourceUrl: ir.sourceUrl,
      sourceTitle: ir.sourceTitle,
      summary: ir.summary,
      keyTopics: ir.keyTopics,
      concepts: ir.concepts,
      difficulty: ir.difficulty,
      contentType: ir.contentType,
      estimatedReadTime: ir.estimatedReadTime,
      rawText: ir.rawText,
    });

    console.log(`❄️ [IR] Stored IR ${ir.id} for bookmark ${bookmarkId}`);

    return NextResponse.json({
      message: 'IR extracted successfully',
      ir,
    });
  } catch (error) {
    console.error('IR extraction error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ir/extract?bookmarkId=123
 * Get existing IR for a bookmark
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookmarkId = searchParams.get('bookmarkId');

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'bookmarkId query parameter required' },
        { status: 400 }
      );
    }

    const ir = await getIRByBookmarkId(Number(bookmarkId));

    if (!ir) {
      return NextResponse.json(
        { error: 'IR not found for this bookmark' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ir: parseIRRecord(ir),
    });
  } catch (error) {
    console.error('Get IR error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

function parseIRRecord(record: any) {
  // Handle both string (needs parsing) and object (already parsed) from Snowflake VARIANT
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
    version: record.VERSION,
    bookmarkId: record.BOOKMARK_ID,
    sourceUrl: record.SOURCE_URL,
    sourceTitle: record.SOURCE_TITLE,
    createdAt: record.CREATED_AT,
    summary: record.SUMMARY,
    keyTopics: parseJsonField(record.KEY_TOPICS),
    concepts: parseJsonField(record.CONCEPTS),
    difficulty: record.DIFFICULTY,
    contentType: record.CONTENT_TYPE,
    estimatedReadTime: record.ESTIMATED_READ_TIME,
    rawText: record.RAW_TEXT,
  };
}
