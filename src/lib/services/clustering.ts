/**
 * Clustering service - groups IRs by semantic similarity using Gemini
 */

import { v4 as uuidv4 } from 'uuid';
import { IRRecord } from '../db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface ClusterResult {
  id: string;
  name: string;
  description: string;
  irIds: string[];
  aggregatedTopics: string[];
  memberCount: number;
  avgDifficulty: string;
}

/**
 * Generate clusters from a list of IRs using Gemini
 */
export async function generateClusters(irs: IRRecord[]): Promise<ClusterResult[]> {
  if (irs.length === 0) {
    throw new Error('No IRs provided for clustering');
  }

  if (irs.length < 2) {
    // Single IR - create a single cluster
    const ir = irs[0];
    return [{
      id: uuidv4(),
      name: `Learning: ${parseJsonField(ir.KEY_TOPICS)[0] || 'General'}`,
      description: ir.SUMMARY,
      irIds: [ir.ID],
      aggregatedTopics: parseJsonField(ir.KEY_TOPICS),
      memberCount: 1,
      avgDifficulty: ir.DIFFICULTY,
    }];
  }

  console.log(`🧩 [Clustering] Generating clusters for ${irs.length} IRs using Gemini`);

  const prompt = buildClusteringPrompt(irs);
  
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent grouping
        maxOutputTokens: 8192, // Enough for many clusters without truncation
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini clustering error:', error);
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  console.log('🧩 [Clustering] Received response from Gemini, parsing...');
  
  const clusters = parseGeminiClusterResponse(text, irs);
  
  console.log(`🧩 [Clustering] Generated ${clusters.length} clusters`);
  
  return clusters;
}

/**
 * Build the clustering prompt for Gemini
 */
function buildClusteringPrompt(irs: IRRecord[]): string {
  const irSummaries = irs.map((ir, idx) => {
    const topics = parseJsonField(ir.KEY_TOPICS);
    const concepts = parseJsonField(ir.CONCEPTS);
    const conceptNames = concepts.map((c: any) => c.name).join(', ');
    
    return `
IR ${idx + 1}:
- ID: ${ir.ID}
- Title: ${ir.SOURCE_TITLE || 'Untitled'}
- Summary: ${ir.SUMMARY}
- Topics: ${topics.join(', ')}
- Key Concepts: ${conceptNames}
- Difficulty: ${ir.DIFFICULTY}
- Type: ${ir.CONTENT_TYPE}
`.trim();
  }).join('\n\n');

  return `You are a learning content clustering expert. Your goal is to create clusters that represent the most key or important elements/themes across the content. An IR (article) can belong to multiple clusters when it meaningfully touches multiple important themes.

${irSummaries}

Your task:
1. Identify the most key or important elements, themes, or learning topics across these IRs
2. Create clusters around those key elements (each cluster = one important theme/element)
3. Assign each IR to every cluster whose theme it meaningfully contributes to
4. An important, multi-topic article can appear in several clusters (e.g. up to 5); a narrow article might be in just 1

Return your response as a JSON array of clusters with this exact structure:
\`\`\`json
[
  {
    "name": "Cluster name (concise, descriptive of the key element/theme)",
    "description": "Brief description of what this cluster covers",
    "irIds": ["ir-id-1", "ir-id-2"],
    "aggregatedTopics": ["topic1", "topic2", "topic3"],
    "avgDifficulty": "beginner|intermediate|advanced"
  }
]
\`\`\`

Rules:
- Every IR must appear in at least one cluster (no orphan IRs)
- An IR may appear in multiple clusters when it touches multiple key themes (appropriate for multi-topic or important content)
- Hard limit: no IR may appear in more than 10 clusters
- Clusters are built from key/important elements—assign IRs to every cluster whose theme they meaningfully touch
- Cluster names should be clear and actionable (e.g., "React Fundamentals", "Python Data Science")
- aggregatedTopics should be the union of key topics from member IRs in that cluster
- avgDifficulty should be the most common difficulty level among members
- Create as many clusters as needed to cover key elements (no artificial cap on total number of clusters)

Return ONLY the JSON array, no additional text.`;
}

/**
 * Strip markdown code fences from Gemini response (handles truncated output)
 */
function stripJsonCodeFences(text: string): string {
  let out = text.trim();
  // Remove leading ```json or ```
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:json)?\s*\n?/i, '');
  }
  // Remove trailing ``` if present
  const trailingFence = out.lastIndexOf('```');
  if (trailingFence !== -1) {
    out = out.slice(0, trailingFence).trim();
  }
  return out;
}

/**
 * Try to salvage truncated JSON array by closing incomplete structures
 */
function trySalvageTruncatedArray(jsonText: string): string {
  let s = jsonText.trim();
  if (!s.startsWith('[')) return s;
  // Prefer: last complete object "},\s*" then add "]"
  const lastCompleteComma = s.lastIndexOf('},');
  if (lastCompleteComma !== -1) {
    return s.slice(0, lastCompleteComma + 1) + ']';
  }
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace !== -1) {
    return s.slice(0, lastBrace + 1) + ']';
  }
  // Truncated inside first object (e.g. mid-string in aggregatedTopics): close after last complete topic
  const lastTopicComma = s.lastIndexOf('",');
  if (lastTopicComma !== -1 && s.includes('aggregatedTopics')) {
    return s.slice(0, lastTopicComma) + '" ], "avgDifficulty": "intermediate" }]';
  }
  return s;
}

/**
 * Parse Gemini's cluster response
 */
function parseGeminiClusterResponse(text: string, irs: IRRecord[]): ClusterResult[] {
  try {
    let jsonText = stripJsonCodeFences(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      jsonText = trySalvageTruncatedArray(jsonText);
      parsed = JSON.parse(jsonText);
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    const MAX_CLUSTERS_PER_IR = 10;

    // Validate and enrich clusters
    let clusters: ClusterResult[] = parsed.map((cluster: any) => {
      if (!cluster.name || !Array.isArray(cluster.irIds)) {
        throw new Error('Invalid cluster structure');
      }

      return {
        id: uuidv4(),
        name: cluster.name,
        description: cluster.description || '',
        irIds: cluster.irIds as string[],
        aggregatedTopics: cluster.aggregatedTopics || [],
        memberCount: cluster.irIds.length,
        avgDifficulty: cluster.avgDifficulty || 'intermediate',
      };
    });

    // Enforce: every IR in at least one cluster
    const assignedIrIds = new Set(clusters.flatMap(c => c.irIds));
    const allIrIds = new Set(irs.map(ir => ir.ID));
    const missing = [...allIrIds].filter(id => !assignedIrIds.has(id));
    if (missing.length > 0) {
      console.warn('⚠️  [Clustering] IRs not in any cluster:', missing.join(', '));
    }

    // Enforce hard limit: no IR in more than MAX_CLUSTERS_PER_IR clusters
    const irToClusterIndices = new Map<string, number[]>();
    clusters.forEach((c, idx) => {
      c.irIds.forEach(irId => {
        if (!irToClusterIndices.has(irId)) irToClusterIndices.set(irId, []);
        irToClusterIndices.get(irId)!.push(idx);
      });
    });
    for (const [irId, clusterIndices] of irToClusterIndices) {
      if (clusterIndices.length > MAX_CLUSTERS_PER_IR) {
        console.warn(`⚠️  [Clustering] IR ${irId} in ${clusterIndices.length} clusters; trimming to ${MAX_CLUSTERS_PER_IR}`);
        const keepFirst = new Set(clusterIndices.slice(0, MAX_CLUSTERS_PER_IR));
        clusterIndices.forEach((clusterIdx) => {
          if (!keepFirst.has(clusterIdx)) {
            clusters[clusterIdx].irIds = clusters[clusterIdx].irIds.filter(id => id !== irId);
            clusters[clusterIdx].memberCount = clusters[clusterIdx].irIds.length;
          }
        });
      }
    }

    return clusters;
  } catch (error) {
    console.error('Failed to parse Gemini cluster response:', error);
    console.error('Raw response:', text);
    throw new Error(`Failed to parse clustering response: ${(error as Error).message}`);
  }
}

/**
 * Helper to parse JSON fields that might be strings or already parsed
 */
function parseJsonField(field: any): any[] {
  if (Array.isArray(field)) {
    return field;
  }
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return [];
}
