/**
 * Gemini AI service for IR extraction and semantic reasoning
 */

import { IntermediateRepresentation, Concept } from '../types/ir';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use gemini-2.5-flash - the latest available model
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

/**
 * Extract Intermediate Representation from a URL using Gemini
 */
export async function extractIRFromUrl(url: string, title: string | null): Promise<IntermediateRepresentation> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in environment variables');
  }

  // For MVP: We'll pass the URL and let Gemini "imagine" the content
  // In production, you'd fetch and parse the actual page content first
  const prompt = buildIRExtractionPrompt(url, title);

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3, // Lower for more consistent extraction
        maxOutputTokens: 4096, // Increased for longer responses
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Parse the JSON response from Gemini
  const parsed = parseGeminiIRResponse(text);

  // Build the full IR object
  const ir: IntermediateRepresentation = {
    id: uuidv4(),
    version: 1,
    sourceUrl: url,
    sourceTitle: title,
    createdAt: new Date().toISOString(),
    ...parsed,
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
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
