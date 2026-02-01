import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'] as const;

async function callGemini(model: string, key: string, body: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { term, context } = await request.json();

    if (!term || typeof term !== 'string') {
      return NextResponse.json(
        { error: 'Term is required' },
        { status: 400 }
      );
    }

    // Lightweight prompt - just get a concise definition
    const prompt = context 
      ? `Define the term "${term}" in the context of: ${context}. Provide a concise, clear definition (2-3 sentences maximum).`
      : `Define the term "${term}". Provide a concise, clear definition (2-3 sentences maximum).`;

    const apiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more factual definitions
        maxOutputTokens: 150, // Keep it short
        topP: 0.8,
      },
    };

    // Try models in order of preference (lightweight first)
    let lastError = '';
    for (const model of MODELS) {
      const res = await callGemini(model, GEMINI_API_KEY, apiBody);
      
      if (res.ok) {
        const data = await res.json();
        const definition = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (definition) {
          return NextResponse.json({ definition });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = err?.error?.message || `Gemini API: ${res.status}`;
        
        // If quota exceeded, try next model
        if (lastError.includes('quota') || lastError.includes('Quota') || res.status === 429) {
          continue;
        }
        
        // For other errors, return immediately
        return NextResponse.json({ error: lastError }, { status: res.status });
      }
    }

    return NextResponse.json(
      { error: lastError || 'Failed to generate definition' },
      { status: 429 }
    );
  } catch (err) {
    console.error('Jargon definition error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Definition generation failed' },
      { status: 500 }
    );
  }
}
