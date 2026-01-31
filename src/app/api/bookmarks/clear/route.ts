import { NextResponse } from 'next/server';
import { clearAllBookmarks } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function DELETE() {
  try {
    const deleted = await clearAllBookmarks();
    console.log('\n❄️  [Learnspace DB] Cleared all bookmarks:', deleted, 'rows');
    return NextResponse.json({ ok: true, rowsDeleted: deleted }, { headers: corsHeaders });
  } catch (error) {
    console.error('Clear all error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: corsHeaders });
  }
}
