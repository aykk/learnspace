import { NextRequest, NextResponse } from 'next/server';
import { getBookmarksForPodcast } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-001'] as const;

async function callGemini(model: string, key: string, body: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Standardized format for flashcard generation - Gemini must follow this exactly
const FLASHCARD_SYSTEM_PROMPT = `You are a flashcard generator. For the given topics, generate 5 educational flashcards total (across all topics).
You MUST use this exact format for every flashcard. Do not deviate:

1. QUESTION: [Your question here]
ANSWER: [Your answer here, 1-2 sentences]

2. QUESTION: [Your question here]
ANSWER: [Your answer here]

Continue with 3, 4, 5. No other text, no headers, no introduction. Start directly with "1. QUESTION:".`;

function parseStandardizedFlashcards(text: string): { question: string; answer: string }[] {
  const cards: { question: string; answer: string }[] = [];
  // Match "N. QUESTION: ... ANSWER: ..." blocks
  const regex = /\d+\.\s*QUESTION:\s*([\s\S]*?)\s*ANSWER:\s*([\s\S]*?)(?=\d+\.\s*QUESTION:|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) {
      cards.push({ question, answer });
    }
  }
  return cards;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Set GEMINI_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  try {
    const bookmarks = await getBookmarksForPodcast();

    if (bookmarks.length === 0) {
      return NextResponse.json(
        { error: 'No bookmarks. Add some links first.' },
        { status: 400 }
      );
    }

    const toProcess = bookmarks.slice(0, 5);
    const topicList = toProcess.map(b => 
      `- ${b.TITLE || (() => { try { return new URL(b.URL).hostname; } catch { return 'Article'; } })()} (${b.URL})`
    ).join('\n');

    const userPrompt = `Generate 5 flashcards about these saved articles/topics:

${topicList}

Create flashcards that test understanding of main concepts, key facts, or ideas. Mix topics if there are multiple.`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: FLASHCARD_SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
    };

    let lastError = '';
    for (const model of MODELS) {
      const res = await callGemini(model, GEMINI_API_KEY, body);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const cards = parseStandardizedFlashcards(text);
          const source = toProcess[0]?.TITLE || toProcess[0]?.URL || '';
          return NextResponse.json({
            flashcards: cards.map(fc => ({ ...fc, source }))
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = err?.error?.message || `Gemini API: ${res.status}`;
        // If quota exceeded, try next model
        if (lastError.includes('quota') || lastError.includes('Quota') || res.status === 429) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }
    }

    throw new Error(lastError || 'Gemini quota exceeded. Try again in a few minutes or check https://ai.google.dev/gemini-api/docs/rate-limits');
  } catch (err) {
    console.error('Flashcard generation error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Flashcard generation failed' },
      { status: 500 }
    );
  }
}
