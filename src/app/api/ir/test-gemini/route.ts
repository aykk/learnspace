import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * GET /api/ir/test-gemini
 * Test Gemini API connectivity and list available models
 */
export async function GET() {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    // List available models
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      return NextResponse.json({
        error: `Failed to list models (${listRes.status})`,
        details: errorText,
        apiKeyPrefix: GEMINI_API_KEY.substring(0, 10) + '...',
      }, { status: listRes.status });
    }

    const data = await listRes.json();
    
    // Filter to models that support generateContent
    const generateContentModels = data.models?.filter((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent')
    ) || [];

    return NextResponse.json({
      success: true,
      apiKeyPrefix: GEMINI_API_KEY.substring(0, 10) + '...',
      totalModels: data.models?.length || 0,
      generateContentModels: generateContentModels.map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
      apiKeyPrefix: GEMINI_API_KEY.substring(0, 10) + '...',
    }, { status: 500 });
  }
}
