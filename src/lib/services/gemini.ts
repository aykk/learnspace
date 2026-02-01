/**
 * Gemini AI service for IR extraction and semantic reasoning
 */

import { IntermediateRepresentation, Concept } from '../types/ir';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'] as const;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function callGeminiWithFallback(
  prompt: string,
  options: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  };

  let lastError = '';
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data: GeminiResponse = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } else {
      const errText = await response.text();
      lastError = errText;
      if (response.status === 429 || errText.includes('quota') || errText.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = errText.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 25000;
        console.warn(`[IR] Quota exceeded for ${model}, retrying in ${waitMs / 1000}s with next model...`);
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 30000)));
        continue;
      }
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }
  }
  throw new Error(lastError || 'All Gemini models exhausted (quota). Try again in a few minutes.');
}

/**
 * Extract Intermediate Representation from a URL using Gemini
 */
export async function extractIRFromUrl(url: string, title: string | null): Promise<IntermediateRepresentation> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in environment variables');
  }

  const prompt = buildIRExtractionPrompt(url, title);
  const text = await callGeminiWithFallback(prompt, { temperature: 0.3, maxOutputTokens: 4096 });

  const parsed = parseGeminiIRResponse(text);

  const ir: IntermediateRepresentation = {
    id: uuidv4(),
    version: 1,
    sourceUrl: url,
    sourceTitle: title,
    createdAt: new Date().toISOString(),
    summary: parsed.summary || 'No summary available',
    keyTopics: parsed.keyTopics || [],
    concepts: parsed.concepts || [],
    difficulty: parsed.difficulty || 'intermediate',
    contentType: parsed.contentType || 'other',
    estimatedReadTime: parsed.estimatedReadTime,
    rawText: parsed.rawText,
  };

  return ir;
}

function buildIRExtractionPrompt(url: string, title: string | null): string {
  return `You are an expert content analyzer. Extract a structured Intermediate Representation (IR) from the following URL.

URL: ${url}
Title: ${title || 'Unknown'}

Based on the URL and title (and your knowledge of common content at such URLs), generate a JSON object with:

{
  "summary": "2-3 sentence high-level summary of the content",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "concepts": [
    {
      "name": "Concept Name",
      "description": "Brief description",
      "importance": "high" | "medium" | "low",
      "relatedConcepts": ["related1", "related2"]
    }
  ],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "contentType": "article" | "video" | "tutorial" | "reference" | "discussion" | "other",
  "estimatedReadTime": <number in minutes>
}

Return ONLY the JSON object, no additional text.`;
}

function parseGeminiIRResponse(text: string): Partial<IntermediateRepresentation> {
  try {
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    
    // Remove ```json and ``` markers
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // Find the JSON object boundaries
    const startIdx = jsonText.indexOf('{');
    const endIdx = jsonText.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('No JSON object found in response');
    }
    
    jsonText = jsonText.substring(startIdx, endIdx + 1);

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || 'No summary available',
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts.map((c: any) => ({
        name: c.name || 'Unknown',
        description: c.description || '',
        importance: c.importance || 'medium',
        relatedConcepts: Array.isArray(c.relatedConcepts) ? c.relatedConcepts : [],
      })) : [],
      difficulty: parsed.difficulty || 'intermediate',
      contentType: parsed.contentType || 'other',
      estimatedReadTime: parsed.estimatedReadTime || null,
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error(`Failed to parse IR from Gemini: ${(error as Error).message}`);
  }
}

/**
 * Test function to verify Gemini connectivity
 */
export async function testGeminiConnection(): Promise<boolean> {
  if (!GEMINI_API_KEY) {
    return false;
  }
  try {
    await callGeminiWithFallback('Hello', { maxOutputTokens: 10 });
    return true;
  } catch {
    return false;
  }
}
