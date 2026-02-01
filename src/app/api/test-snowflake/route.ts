import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/snowflake';
import { getAllBookmarks } from '@/lib/db';

/**
 * GET /api/test-snowflake
 * Test Snowflake connection and return current bookmarks
 */
export async function GET() {
  try {
    // Test connection
    const connected = await testConnection();
    
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Snowflake',
      }, { status: 500 });
    }

    // Get bookmarks to verify data access
    const bookmarks = await getAllBookmarks();

    return NextResponse.json({
      success: true,
      message: '❄️ Connected to Snowflake!',
      bookmarkCount: bookmarks.length,
      bookmarks: bookmarks.slice(0, 5), // Show first 5
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
