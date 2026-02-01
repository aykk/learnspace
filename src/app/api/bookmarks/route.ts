import { NextRequest, NextResponse } from 'next/server';
import { insertBookmark, deleteBookmark, getAllBookmarks } from '@/lib/db';
import { extractIRFromUrl } from '@/lib/services/gemini';
import { insertIR, getIRByBookmarkId } from '@/lib/db';

// CORS headers for Chrome extension (runs from chrome-extension:// origin)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Background IR extraction - fire and forget
 */
async function extractIRInBackground(bookmarkId: number, url: string, title: string) {
  try {
    // Check if IR already exists
    const existing = await getIRByBookmarkId(bookmarkId);
    if (existing) {
      console.log('❄️  [IR] IR already exists for bookmark', bookmarkId);
      return;
    }

    console.log('❄️  [IR] Starting background extraction for bookmark', bookmarkId);
    
    // Extract IR using Gemini
    const ir = await extractIRFromUrl(url, title);
    
    // Store in Snowflake
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

    console.log('❄️  [IR] Successfully extracted and stored IR', ir.id, 'for bookmark', bookmarkId);
  } catch (error) {
    // Log but don't throw - this is background processing
    console.error('❄️  [IR] Background extraction error:', error);
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const rows = await getAllBookmarks();
    return NextResponse.json(rows, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, title, dateAdded } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400, headers: corsHeaders });
    }

    const id = await insertBookmark(url, title || url, dateAdded || null);

    console.log('\n❄️  [Learnspace DB] Row inserted into LEARNSPACE_BOOKMARKS:');
    console.log('   ID:', id, '| URL:', url, '| TITLE:', title || url);

    // Auto-extract IR in the background (don't await - fire and forget)
    extractIRInBackground(id, url, title || url).catch(err => {
      console.error('❄️  [IR] Background extraction failed for bookmark', id, ':', err.message);
    });

    return NextResponse.json({ ok: true, rowsInserted: 1, id }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400, headers: corsHeaders });
    }

    const deleted = await deleteBookmark(url);

    if (deleted > 0) {
      console.log('\n❄️  [Learnspace DB] Row deleted from LEARNSPACE_BOOKMARKS:', url);
    }

    return NextResponse.json({ ok: true, rowsDeleted: deleted }, { headers: corsHeaders });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: corsHeaders });
  }
}
