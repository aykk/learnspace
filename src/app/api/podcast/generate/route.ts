import { getBookmarksForPodcast } from '@/lib/db';

const WONDERCRAFT_API_KEY = process.env.WONDERCRAFT_API_KEY;
const WONDERCRAFT_BASE = 'https://api.wondercraft.ai/v1';

export async function GET() {
  const encoder = new TextEncoder();
  
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

      const rows = await getBookmarksForPodcast();
      if (rows.length === 0) {
        send('error', { error: 'No bookmarks in Learnspace. Add some links first.' });
        return finish();
      }

      send('status', { msg: `Found ${rows.length} bookmark(s). Submitting to Wondercraft…` });

      const context = rows.map(r => `- ${r.TITLE || r.URL}: ${r.URL}`).join('\n');
      const prompt = `Create a 3–5 minute conversational podcast with two hosts discussing these saved links from Learnspace. Be educational and engaging. Summarize and discuss the main ideas.\n\nSaved links:\n${context}`;

      try {
        const createRes = await fetch(`${WONDERCRAFT_BASE}/podcast/convo-mode/ai-scripted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': WONDERCRAFT_API_KEY
          },
          body: JSON.stringify({
            prompt,
            delivery_instructions: 'Friendly, clear, and conversational. Two hosts taking turns.'
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
          url
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
