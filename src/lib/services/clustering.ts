/**
 * Clustering service - groups IRs by semantic similarity using Gemini
 */

import { v4 as uuidv4 } from 'uuid';
import { IRRecord } from '../db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'] as const;

export interface ClusterResult {
  id: string;
  name: string;
  description: string;
  irIds: string[];
  aggregatedTopics: string[];
  memberCount: number;
  avgDifficulty: string;
}

/** Existing cluster summary for incremental assignment */
export interface ExistingClusterSummary {
  id: string;
  name: string;
  description: string;
  irIds: string[];
}

/** Result of assigning unassigned IRs: which cluster(s) each IR joins, and any new clusters */
export interface IncrementalClusterResult {
  assignments: { irId: string; addToClusterIds: string[] }[];
  newClusters: ClusterResult[];
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
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };

  let text: string | null = null;
  let lastError = '';

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      if (text) break;
    } else {
      lastError = await response.text();
      if (response.status === 429 || lastError.includes('quota') || lastError.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = lastError.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 25000;
        console.warn(`[Clustering] Quota exceeded for ${model}, retrying in ${Math.min(waitMs, 30000) / 1000}s...`);
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 30000)));
        continue;
      }
      console.error('Gemini clustering error:', lastError);
      throw new Error(`Gemini API error: ${response.status} ${lastError}`);
    }
  }

  if (!text) {
    throw new Error(lastError || 'All Gemini models exhausted (quota). Try again in a few minutes.');
  }

  console.log('🧩 [Clustering] Received response from Gemini, parsing...');
  
  const clusters = parseGeminiClusterResponse(text, irs);
  
  console.log(`🧩 [Clustering] Generated ${clusters.length} clusters`);
  
  return clusters;
}

/**
 * Incremental clustering: assign unassigned IRs to existing clusters and/or create new clusters.
 * Never deletes or removes IRs from existing clusters; only adds.
 */
export async function assignUnassignedIRsToClusters(
  existingClusters: ExistingClusterSummary[],
  unassignedIRs: IRRecord[]
): Promise<IncrementalClusterResult> {
  if (unassignedIRs.length === 0) {
    return { assignments: [], newClusters: [] };
  }

  console.log(`🧩 [Clustering] Assigning ${unassignedIRs.length} unassigned IRs to ${existingClusters.length} existing clusters (incremental)`);

  const prompt = buildIncrementalClusteringPrompt(existingClusters, unassignedIRs);
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };

  let text: string | null = null;
  let lastError = '';

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      if (text) break;
    } else {
      lastError = await response.text();
      if (response.status === 429 || lastError.includes('quota') || lastError.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = lastError.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) : 25000;
        console.warn(`[Clustering] Quota exceeded for ${model}, retrying in ${Math.min(waitMs, 30000) / 1000}s...`);
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 30000)));
        continue;
      }
      console.error('Gemini clustering error:', lastError);
      throw new Error(`Gemini API error: ${response.status} ${lastError}`);
    }
  }

  if (!text) {
    throw new Error(lastError || 'All Gemini models exhausted (quota). Try again in a few minutes.');
  }

  console.log('🧩 [Clustering] Parsing incremental assignment response...');
  return parseIncrementalClusterResponse(text, unassignedIRs);
}

/**
 * Build prompt for incremental assignment: existing clusters + unassigned IRs
 */
function buildIncrementalClusteringPrompt(
  existingClusters: ExistingClusterSummary[],
  unassignedIRs: IRRecord[]
): string {
  const existingBlock = existingClusters.map((c) => {
    return `Cluster ID: ${c.id}\nName: ${c.name}\nDescription: ${c.description}\nCurrent IRs: ${c.irIds.join(', ')} (${c.irIds.length} members)`;
  }).join('\n\n');

  const unassignedBlock = unassignedIRs.map((ir, idx) => {
    const topics = parseJsonField(ir.KEY_TOPICS);
    const concepts = parseJsonField(ir.CONCEPTS);
    const conceptNames = concepts.map((c: any) => c.name).join(', ');
    return `
Unassigned IR ${idx + 1}:
- ID: ${ir.ID}
- Title: ${ir.SOURCE_TITLE || 'Untitled'}
- Summary: ${ir.SUMMARY}
- Topics: ${topics.join(', ')}
- Key Concepts: ${conceptNames}
- Difficulty: ${ir.DIFFICULTY}
- Type: ${ir.CONTENT_TYPE}
`.trim();
  }).join('\n\n');

  return `You are a learning content clustering expert. We have EXISTING clusters and NEW content (unassigned IRs) that must be assigned.

EXISTING CLUSTERS (do not remove any IRs from these; we only ADD):
${existingBlock}

UNASSIGNED IRs (new content to assign):
${unassignedBlock}

Your task:
1. For each unassigned IR, assign it to one or more EXISTING clusters whose theme it meaningfully fits (use the cluster ID). An IR can be in multiple clusters (e.g. up to 5) if it touches multiple themes.
2. If an unassigned IR does not fit any existing cluster thematically, create a NEW cluster for it (and optionally group with other unassigned IRs that share the same theme).
3. Never suggest removing an IR from an existing cluster. Only add.

Return your response as a JSON object with this exact structure:
\`\`\`json
{
  "assignments": [
    { "irId": "<ir-id>", "addToClusterIds": ["<existing-cluster-id>", "<existing-cluster-id>"] }
  ],
  "newClusters": [
    {
      "name": "New cluster name",
      "description": "Brief description",
      "irIds": ["<ir-id>", "<ir-id>"],
      "aggregatedTopics": ["topic1", "topic2"],
      "avgDifficulty": "beginner|intermediate|advanced"
    }
  ]
}
\`\`\`

Rules:
- Every unassigned IR must appear in either assignments (addToClusterIds non-empty) or in exactly one newClusters entry (or both: can be added to existing AND appear in a new cluster - but typically either/or).
- addToClusterIds must only contain IDs from the EXISTING CLUSTERS list above.
- newClusters can only reference unassigned IR IDs.
- An unassigned IR may be assigned to 0 existing clusters and only appear in a new cluster if it does not fit existing themes.
- Cluster size will be updated automatically; we only send additions.

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse incremental clustering response from Gemini
 */
function parseIncrementalClusterResponse(
  text: string,
  unassignedIRs: IRRecord[]
): IncrementalClusterResult {
  try {
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    }
    const startIdx = jsonText.indexOf('{');
    const endIdx = jsonText.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) jsonText = jsonText.slice(startIdx, endIdx + 1);

    const parsed = JSON.parse(jsonText) as { assignments?: any[]; newClusters?: any[] };
    const assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
    const rawNewClusters = Array.isArray(parsed.newClusters) ? parsed.newClusters : [];

    const newClusters: ClusterResult[] = rawNewClusters.map((c: any) => ({
      id: uuidv4(),
      name: c.name || 'New Cluster',
      description: c.description || '',
      irIds: Array.isArray(c.irIds) ? c.irIds : [],
      aggregatedTopics: Array.isArray(c.aggregatedTopics) ? c.aggregatedTopics : [],
      memberCount: Array.isArray(c.irIds) ? c.irIds.length : 0,
      avgDifficulty: c.avgDifficulty || 'intermediate',
    }));

    return { assignments, newClusters };
  } catch (error) {
    console.error('Failed to parse incremental cluster response:', error);
    console.error('Raw response:', text);
    throw new Error(`Failed to parse incremental clustering response: ${(error as Error).message}`);
  }
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
