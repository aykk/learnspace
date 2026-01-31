import { NextRequest, NextResponse } from 'next/server';
import { insertBookmark, deleteBookmark, getAllBookmarks } from '@/lib/db';

// CORS headers for Chrome extension (runs from chrome-extension:// origin)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
