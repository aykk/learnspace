import { NextRequest, NextResponse } from 'next/server';
import { getAllBookmarks } from '@/lib/db';
import { getAllIRs, getClusterById } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;

export interface UserContentPreferences {
  learningStyle: 'verbal' | 'audio';
  textFormat?: string;
  jargonLevel?: string;
  interests?: string[];
  customInterests?: string;
  podcastLength?: string;
  podcastStyle?: string;
  background: string;
  backgroundDetails?: string;
  extraNotes?: string;
}

async function callGemini(model: string, key: string, body: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function buildSystemPrompt(prefs: UserContentPreferences): string {
  const interestsList = [
    ...(prefs.interests || []),
    ...(prefs.customInterests?.trim() ? prefs.customInterests.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []),
  ];

  const lines: string[] = [
    'You are a personalized learning content generator. Generate study guides or learning content that strictly follows these user preferences:',
    '',
    `- **Background**: ${prefs.background}.${prefs.backgroundDetails ? ` Additional context: ${prefs.backgroundDetails}` : ''}`,
    prefs.extraNotes ? `- **Special instructions**: ${prefs.extraNotes}` : '',
  ];

  if (prefs.learningStyle === 'verbal') {
    lines.push(
      '',
      'STRICT FORMAT RULES (verbal/text output):',
      '- **Output format**: You MUST output content in Markdown format with proper structure:',
      '  * Use # for main title, ## for major sections, ### for subsections',
      '  * Use bullet points (- or *) for lists when appropriate',
      '  * Use **bold** for emphasis on important concepts',
      '  * Use *italic* for subtle emphasis',
      '  * Organize content with clear headers and logical flow',
      '  * Use code blocks (```) for technical terms or code examples when relevant',
      `- **Text format**: Use ${prefs.textFormat || 'bullet'} format (bullet = bullet points, paragraph = continuous paragraphs, mixed = mix both) within the markdown structure.`,
      `- **Technical jargon**: ${prefs.jargonLevel || 'some'} — none = plain language only, some = light terminology, technical = full specialized terms. Stay within this level.`,
      '- **Key terms**: Identify 5-10 key technical terms or jargon words that are central to understanding the content. Wrap these terms with double underscores (__term__) so they can be underlined and made clickable for definitions. Only mark truly important terms that need explanation.',
      interestsList.length
        ? `- **Analogies**: Incorporate the user's interests (${interestsList.join(', ')}) when drawing analogies or examples. Use these topics to explain complex ideas when applicable.`
        : ''
    );
  } else {
    lines.push(
      `- **Preferred podcast length**: ${prefs.podcastLength || 'medium'} (short = 5-10 min, medium = 15-25 min, long = 30-45 min).`,
      `- **Podcast style**: ${prefs.podcastStyle || 'educational'} (conversational / educational / storytelling).`
    );
    const interestsList = [
      ...(prefs.interests || []),
      ...(prefs.customInterests?.trim() ? prefs.customInterests.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []),
    ];
    if (interestsList.length) {
      lines.push(`- **Interests for analogies**: ${interestsList.join(', ')}.`);
    }
  }

  lines.push('', 'Follow all preferences in tone, structure, vocabulary, and depth. Output only the generated content, no meta-commentary.');
  return lines.filter(Boolean).join('\n');
}

function buildContextFromIRs(irs: Awaited<ReturnType<typeof getAllIRs>>): string {
  if (!irs.length) return '';
  const parts = irs.slice(0, 10).map(ir => {
    const topics = Array.isArray(ir.KEY_TOPICS) ? ir.KEY_TOPICS : (typeof ir.KEY_TOPICS === 'string' ? [ir.KEY_TOPICS] : []);
    return `- "${ir.SOURCE_TITLE || ir.SOURCE_URL}": ${ir.SUMMARY} Topics: ${topics.join(', ')}`;
  });
  return `User's saved content (summaries and topics):\n${parts.join('\n')}`;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Set GEMINI_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const preferences = body.preferences as UserContentPreferences | undefined;
    const source = body.source as 'bookmarks' | { clusterId: string } | undefined;

    if (!preferences) {
      return NextResponse.json(
        { error: 'preferences object required' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(preferences);

    let contextBlock = '';
    if (source === 'bookmarks' || !source) {
      const irs = await getAllIRs();
      const bookmarks = await getAllBookmarks();
      if (irs.length > 0) {
        contextBlock = buildContextFromIRs(irs);
      } else if (bookmarks.length > 0) {
        contextBlock = `User's saved links (no summaries extracted yet):\n${bookmarks.slice(0, 10).map(b => `- ${b.TITLE || b.URL}`).join('\n')}\nGenerate a short, personalized study tip or learning guide based on these topics and the user's preferences.`;
      } else {
        contextBlock = 'No saved content yet. Generate a short, personalized "how to learn" guide that matches the user preferences (format, jargon, style).';
      }
    } else if (typeof source === 'object' && source?.clusterId) {
      const cluster = await getClusterById(source.clusterId);
      if (!cluster) {
        return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      }
      const irs = await getAllIRs();
      let irIds: string[] = [];
      try {
        irIds = Array.isArray(cluster.IR_IDS) ? cluster.IR_IDS : (typeof cluster.IR_IDS === 'string' ? JSON.parse(cluster.IR_IDS || '[]') : []);
      } catch {
        irIds = [];
      }
      const clusterIRs = irs.filter(ir => irIds.includes(ir.ID));
      // Deduplicate sources by URL
      const seenSourceUrls = new Set<string>();
      const sources = clusterIRs
        .map(ir => ({ title: ir.SOURCE_TITLE || ir.SOURCE_URL, url: ir.SOURCE_URL }))
        .filter(source => {
          if (!source.url || seenSourceUrls.has(source.url)) return false;
          seenSourceUrls.add(source.url);
          return true;
        });
      const articlesBlock = clusterIRs.map((ir, i) => {
        const topics = Array.isArray(ir.KEY_TOPICS) ? ir.KEY_TOPICS : (typeof ir.KEY_TOPICS === 'string' ? [ir.KEY_TOPICS] : []);
        return `[${i + 1}] "${ir.SOURCE_TITLE || ir.SOURCE_URL}" (${ir.SOURCE_URL})\n   Summary: ${ir.SUMMARY}\n   Topics: ${topics.join(', ')}`;
      }).join('\n\n');
      contextBlock = `CLUSTER: ${cluster.NAME}\n${cluster.DESCRIPTION || ''}\n\nARTICLES IN THIS CLUSTER (reference each by name or number when you cite ideas):\n\n${articlesBlock}`;

      const userPrompt = `Using the user preferences you were given, generate a cohesive study guide or learning content that:
1. Synthesizes the ideas from ALL the articles above into one unified block of content
2. References each article meaningfully by name (e.g., "As [Article Title] explains...") when you use ideas from it
3. Ties the articles together - show how they connect, compare viewpoints, or build on each other
4. Follows the user's preferred format, jargon level, and style

Context:\n\n${contextBlock}`;

      const apiBody = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: userPrompt }] },
        ],
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      };

      let lastError = '';
      for (const model of MODELS) {
        const res = await callGemini(model, GEMINI_API_KEY, apiBody);
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return NextResponse.json({ content: text, sources });
          } else {
            // No text returned - try next model
            lastError = 'No content generated from model';
            continue;
          }
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = err?.error?.message || `Gemini API: ${res.status}`;
          if (lastError.includes('quota') || lastError.includes('Quota') || res.status === 429) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          return NextResponse.json({ error: lastError }, { status: res.status });
        }
      }
      return NextResponse.json({ error: lastError || 'Gemini quota exceeded. Try again later.' }, { status: 429 });
    }

    const userPrompt = contextBlock
      ? `Using the user preferences you were given, generate personalized learning content based on this context:\n\n${contextBlock}`
      : `Using the user preferences you were given, generate a short personalized learning tip or study guide.`;

    const apiBody = {
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
    };

    let lastError = '';
    for (const model of MODELS) {
      const res = await callGemini(model, GEMINI_API_KEY, apiBody);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return NextResponse.json({ content: text });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = err?.error?.message || `Gemini API: ${res.status}`;
        if (lastError.includes('quota') || lastError.includes('Quota') || res.status === 429) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return NextResponse.json({ error: lastError }, { status: res.status });
      }
    }

    return NextResponse.json(
      { error: lastError || 'Gemini quota exceeded. Try again later.' },
      { status: 429 }
    );
  } catch (err) {
    console.error('Content generate error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Content generation failed' },
      { status: 500 }
    );
  }
}
