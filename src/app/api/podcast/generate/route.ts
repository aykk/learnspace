import { NextRequest } from 'next/server';
import { getBookmarksForPodcast } from '@/lib/db';
import { getAllIRs, getClusterById } from '@/lib/db';

const WONDERCRAFT_API_KEY = process.env.WONDERCRAFT_API_KEY;
const WONDERCRAFT_BASE = 'https://api.wondercraft.ai/v1';

interface UserContentPreferences {
  learningStyle?: string;
  jargonLevel?: string;
  interests?: string[];
  customInterests?: string;
  podcastLength?: string;
  podcastStyle?: string;
  background?: string;
  backgroundDetails?: string;
  extraNotes?: string;
}

function buildDeliveryInstructions(prefs: UserContentPreferences | null): string {
  const parts = ['Friendly, clear, and conversational. Two hosts taking turns.'];
  if (!prefs) return parts[0];

  if (prefs.jargonLevel === 'none') parts.push('Use simple, plain language—no specialized jargon.');
  else if (prefs.jargonLevel === 'technical') parts.push('Use full technical terminology where appropriate.');
  else parts.push('Use moderate terminology—some jargon when needed.');

  const interests = [
    ...(prefs.interests || []),
    ...(prefs.customInterests?.trim() ? prefs.customInterests.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []),
  ];
  if (interests.length) parts.push(`Draw analogies from these topics when helpful: ${interests.join(', ')}.`);

  if (prefs.background || prefs.backgroundDetails) {
    const bg = [prefs.background, prefs.backgroundDetails].filter(Boolean).join('. ');
    parts.push(`Tailor to audience: ${bg}`);
  }
  if (prefs.extraNotes) parts.push(`Special instructions: ${prefs.extraNotes}.`);

  return parts.join(' ');
}

function getTargetMinutes(prefs: UserContentPreferences | null): string {
  switch (prefs?.podcastLength) {
    case 'short': return '1';
    case 'long': return '5';
    default: return '3';
  }
}

function getStyleGuidance(prefs: UserContentPreferences | null): string {
  switch (prefs?.podcastStyle) {
    case 'conversational': return 'Casual, conversational tone with natural back-and-forth.';
    case 'storytelling': return 'Engaging, narrative-driven storytelling style.';
    default: return 'Direct, educational, and informative.';
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const clusterId = searchParams.get('clusterId');
  let preferences: UserContentPreferences | null = null;
  try {
    const prefsStr = searchParams.get('preferences');
    if (prefsStr) preferences = JSON.parse(decodeURIComponent(prefsStr)) as UserContentPreferences;
  } catch {
    /* ignore */
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function finish() {
        controller.close();
      }

      if (!WONDERCRAFT_API_KEY) {
        send('error', { error: 'Set WONDERCRAFT_API_KEY in environment variables to generate podcasts' });
        return finish();
      }

      let context = '';
      let sources: { title: string; url: string }[] = [];

      if (clusterId) {
        const cluster = await getClusterById(clusterId);
        if (!cluster) {
          send('error', { error: 'Cluster not found.' });
          return finish();
        }
        const irs = await getAllIRs();
        let irIds: string[] = [];
        try {
          irIds = Array.isArray(cluster.IR_IDS) ? cluster.IR_IDS : (typeof cluster.IR_IDS === 'string' ? JSON.parse(cluster.IR_IDS || '[]') : []);
        } catch {
          irIds = [];
        }
        const clusterIRs = irs.filter(ir => irIds.includes(ir.ID));
        if (clusterIRs.length === 0) {
          send('error', { error: 'Cluster has no articles with extracted content.' });
          return finish();
        }
        sources = clusterIRs.map(ir => ({ title: ir.SOURCE_TITLE || ir.SOURCE_URL, url: ir.SOURCE_URL }));
        const articlesBlock = clusterIRs.map(ir => {
          const topics = Array.isArray(ir.KEY_TOPICS) ? ir.KEY_TOPICS : (typeof ir.KEY_TOPICS === 'string' ? [ir.KEY_TOPICS] : []);
          return `- ${ir.SOURCE_TITLE || ir.SOURCE_URL} (${ir.SOURCE_URL}): ${ir.SUMMARY} Topics: ${topics.join(', ')}`;
        }).join('\n');
        context = `CLUSTER: ${cluster.NAME}\n${cluster.DESCRIPTION || ''}\n\nARTICLES:\n${articlesBlock}`;
      } else {
        const rows = await getBookmarksForPodcast();
        if (rows.length === 0) {
          send('error', { error: 'No bookmarks in Learnspace. Add some links first.' });
          return finish();
        }
        context = rows.map(r => `- ${r.TITLE || r.URL}: ${r.URL}`).join('\n');
      }

      const targetMins = getTargetMinutes(preferences);
      const styleGuidance = getStyleGuidance(preferences);
      const deliveryInstructions = buildDeliveryInstructions(preferences);

      send('status', { msg: clusterId ? `Generating podcast for cluster…` : `Found bookmark(s). Submitting to Wondercraft…` });

      const prompt = `Create a ${targetMins} minute conversational podcast with two hosts discussing these saved links from Learnspace. ${styleGuidance} Be educational and engaging. Synthesize and discuss the main ideas. Reference the articles meaningfully.\n\n${context}`;

      try {
        const createRes = await fetch(`${WONDERCRAFT_BASE}/podcast/convo-mode/ai-scripted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': WONDERCRAFT_API_KEY
          },
          body: JSON.stringify({
            prompt,
            delivery_instructions: deliveryInstructions
          })
        });

        if (!createRes.ok) {
          const errBody = await createRes.text();
          throw new Error(createRes.status === 422 ? errBody : `Wondercraft API: ${createRes.status}`);
        }

        const { job_id } = await createRes.json();
        send('status', { msg: `Job created (${job_id.slice(0, 8)}…). Generating audio…` });

        // Poll with live updates
        const maxWaitMs = 600000; // 10 min
        const intervalMs = 5000;
        const start = Date.now();
        let pollCount = 0;
        let result: { finished?: boolean; error?: boolean; error_details?: string; url?: string; output_url?: string; audio_url?: string; script?: string } | null = null;

        while (Date.now() - start < maxWaitMs) {
          pollCount++;
          const elapsed = Math.round((Date.now() - start) / 1000);
          send('status', { msg: `Waiting for Wondercraft… (${elapsed}s elapsed, poll #${pollCount})` });

          const r = await fetch(`${WONDERCRAFT_BASE}/podcast/${job_id}`, {
            headers: { 'X-API-KEY': WONDERCRAFT_API_KEY }
          });
          if (!r.ok) throw new Error(`Status check failed: ${r.status}`);
          const data = await r.json();

          if (data.finished) {
            result = data;
            break;
          }
          if (data.error && data.error_details) throw new Error(data.error_details);

          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        if (!result) throw new Error('Podcast generation timed out after 10 minutes');

        if (result.error && result.error_details) {
          throw new Error(result.error_details);
        }

        const url = result.url || result.output_url || result.audio_url || null;
        if (!url) {
          console.error('Wondercraft response (no url):', JSON.stringify(result));
          throw new Error('Wondercraft finished but returned no audio URL.');
        }

        send('done', {
          ok: true,
          script: result.script || null,
          url,
          ...(sources.length > 0 && { sources })
        });
      } catch (err) {
        console.error('Podcast generation error:', err);
        send('error', { error: (err as Error).message || 'Podcast generation failed' });
      }

      finish();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
