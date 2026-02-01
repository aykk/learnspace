import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Models that support v1beta generateContent (gemini-pro deprecated)
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-001'] as const;

async function callGemini(model: string, key: string, body: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { res, model };
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Set GEMINI_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  try {
    const { message, history = [] } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Build contents array from history + new message
    const contents: { role: string; parts: { text: string }[] }[] = [
      ...history.map((h: { role: string; text: string }) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message.trim() }] }
    ];

    const body = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    };

    let lastError = '';
    for (const model of MODELS) {
      const { res } = await callGemini(model, GEMINI_API_KEY, body);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) continue;
        return NextResponse.json({ text });
      }

      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || err?.error || `Gemini API: ${res.status}`;
      lastError = msg;

      // If quota exceeded, try next model
      if (msg.includes('quota') || msg.includes('Quota') || res.status === 429) continue;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json(
      { error: lastError || 'All models exhausted. Quota exceeded — try again later or check https://ai.google.dev/gemini-api/docs/rate-limits' },
      { status: 429 }
    );
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Chat failed' },
      { status: 500 }
    );
  }
}
