"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

// User preferences from onboarding
interface UserContentPreferences {
  learningStyle: 'verbal' | 'audio';
  textFormat?: 'bullet' | 'paragraph' | 'mixed';
  jargonLevel?: 'none' | 'some' | 'technical';
  interests?: string[];
  customInterests?: string;
  podcastLength?: 'short' | 'medium' | 'long';
  podcastStyle?: 'conversational' | 'educational' | 'storytelling';
  background?: 'student' | 'professional' | 'hobbyist' | 'researcher' | 'other';
  backgroundDetails?: string;
  extraNotes?: string;
}

// Backend cluster structure
interface BackendCluster {
  ID: number;
  NAME: string;
  DESCRIPTION: string;
  IR_IDS: string; // JSON array
  CREATED_AT: string;
}

interface GeneratedContent {
  content?: string;
  podcastUrl?: string;
  sources?: Array<{ title: string; url: string }>;
}

interface Flashcard {
  front: string;
  back: string;
  source: string;
}

// Simplified floating animation - uses CSS transform for GPU acceleration
const floatKeyframes = `
  @keyframes cluster-float {
    0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
    25% { transform: translate(-50%, -50%) translate(2px, -2px); }
    50% { transform: translate(-50%, -50%) translate(-2px, 2px); }
    75% { transform: translate(-50%, -50%) translate(-2px, -2px); }
  }
`;

const getFloatAnimation = (index: number) => {
  // Vary duration based on index for natural feel
  const duration = 8 + (index % 4);
  return `cluster-float ${duration}s ease-in-out infinite`;
};

const CLUSTER_POSITIONS_KEY = 'learnspace_cluster_positions';
const CLUSTER_CONTENT_KEY = 'learnspace_cluster_content';
const CLUSTER_FLASHCARDS_KEY = 'learnspace_cluster_flashcards';

const MIN_DIST_PCT = 16; // min % distance between cluster centers so they don't overlap
const CENTER_SPREAD = 10; // max % from center (50) — clusters spawn in center of grid

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Spawn in center of grid with small random offset; avoid overlapping existing positions */
function getCenterBiasedNonOverlapping(usedPositions: { x: number; y: number }[]): { x: number; y: number } {
  const maxTries = 50;
  for (let t = 0; t < maxTries; t++) {
    // Spawn near center: small radius + random angle
    const r = CENTER_SPREAD * Math.sqrt(Math.random());
    const angle = Math.random() * 2 * Math.PI;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    const pos = { x, y };
    const tooClose = usedPositions.some((p) => dist(pos, p) < MIN_DIST_PCT);
    if (!tooClose) return pos;
  }
  // Fallback: ring around center
  const n = usedPositions.length;
  const fallbackR = MIN_DIST_PCT + (n % 3) * 10;
  const fallbackA = (n * 1.2) % (2 * Math.PI);
  return {
    x: 50 + fallbackR * Math.cos(fallbackA),
    y: 50 + fallbackR * Math.sin(fallbackA),
  };
}

// User preferences from onboarding
interface UserContentPreferences {
  learningStyle: 'verbal' | 'audio';
  textFormat?: 'bullet' | 'paragraph' | 'mixed';
  jargonLevel?: 'none' | 'some' | 'technical';
  interests?: string[];
  customInterests?: string;
  podcastLength?: 'short' | 'medium' | 'long';
  podcastStyle?: 'conversational' | 'educational' | 'storytelling';
  background?: 'student' | 'professional' | 'hobbyist' | 'researcher' | 'other';
  backgroundDetails?: string;
  extraNotes?: string;
}

// Backend cluster structure
interface BackendCluster {
  ID: number;
  NAME: string;
  DESCRIPTION: string;
  IR_IDS: string; // JSON array
  CREATED_AT: string;
}

interface GeneratedContent {
  content?: string;
  podcastUrl?: string;
  sources?: Array<{ title: string; url: string }>;
}

interface Flashcard {
  front: string;
  back: string;
  source: string;
}

interface ClusterLink {
  id: string;
  title: string;
  url: string;
  source: string;
}

interface Cluster {
  id: string;
  name: string;
  color: string;
  links: ClusterLink[];
  summary: string;
  concepts: string[];
  size: number;
  position: { x: number; y: number };
  isRead: boolean;
  isHidden: boolean;
  generatedContent?: GeneratedContent;
  flashcards?: Flashcard[];
}

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCluster, setDraggedCluster] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<UserContentPreferences | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentStatus, setContentStatus] = useState<string>('');
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [contentWindowOpen, setContentWindowOpen] = useState(false);
  const [contentWindowCluster, setContentWindowCluster] = useState<Cluster | null>(null);
  const [flashcardWindowOpen, setFlashcardWindowOpen] = useState(false);
  const [flashcardWindowCluster, setFlashcardWindowCluster] = useState<Cluster | null>(null);
  const [flippedFlashcardIndices, setFlippedFlashcardIndices] = useState<Set<number>>(new Set());
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardSlideDirection, setFlashcardSlideDirection] = useState<'left' | 'right' | null>(null);
  const [selectedJargon, setSelectedJargon] = useState<string | null>(null);
  const [jargonDefinition, setJargonDefinition] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Render markdown and handle jargon terms
  const renderMarkdownWithJargon = useCallback((content: string) => {
    // First, extract jargon terms before processing markdown
    const jargonTerms: string[] = [];
    const jargonPattern = /__([^_]+)__/g;
    let match;
    while ((match = jargonPattern.exec(content)) !== null) {
      jargonTerms.push(match[1]);
    }

    // Simple markdown to HTML conversion
    let html = content
      // Code blocks first (to avoid processing markdown inside them)
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-neutral-100 p-4 rounded-sm overflow-x-auto my-4 font-mono text-sm break-words whitespace-pre-wrap" style="word-break: break-word; overflow-wrap: anywhere;"><code class="break-words">$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm font-mono break-words" style="word-break: break-word;">$1</code>')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-neutral-900 mt-6 mb-3 font-[family-name:var(--font-display)]">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-neutral-900 mt-8 mb-4 font-[family-name:var(--font-display)]">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-semibold text-neutral-900 mt-10 mb-5 font-[family-name:var(--font-display)]">$1</h1>')
      // Bold (but not inside code)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-neutral-900">$1</strong>')
      // Italic (but not inside code)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
      // Bullet points
      .replace(/^- (.*$)/gim, '<li class="ml-6 mb-2 list-disc">$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2 list-decimal">$1</li>');

    // Split by double newlines for paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      // Wrap in paragraph if it's not already a header, list, or code block
      if (!p.match(/^<(h[1-6]|ul|ol|pre|li)/)) {
        return `<p class="mb-4 leading-relaxed text-neutral-700">${p}</p>`;
      }
      // Wrap list items in ul/ol
      if (p.includes('<li')) {
        const isNumbered = p.includes('list-decimal');
        return `<${isNumbered ? 'ol' : 'ul'} class="mb-4 space-y-1">${p}</${isNumbered ? 'ol' : 'ul'}>`;
      }
      return p;
    }).join('');

    // Handle jargon terms (__term__) - make them clickable and underlined
    html = html.replace(/__([^_]+)__/g, (match, term) => {
      const escapedTerm = term.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
      return `<span 
        class="underline cursor-pointer text-[#e07850] hover:text-[#c86540] transition-colors font-medium"
        onClick="window.handleJargonClick && window.handleJargonClick('${escapedTerm}')"
      >${term}</span>`;
    });

    return html;
  }, []);

  // Handle jargon click - fetch definition from Gemini
  const handleJargonClick = useCallback(async (term: string) => {
    setSelectedJargon(term);
    setJargonDefinition(null); // Clear previous definition
    
    try {
      // Get context from the current cluster's content if available
      const context = contentWindowCluster?.generatedContent?.content 
        ? contentWindowCluster.generatedContent.content.substring(0, 500) // First 500 chars for context
        : undefined;

      const response = await fetch('/api/jargon/define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, context }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }

      const data = await response.json();
      setJargonDefinition(data.definition || `No definition found for "${term}".`);
    } catch (error) {
      console.error('Jargon definition error:', error);
      setJargonDefinition(`Unable to load definition for "${term}". Please try again.`);
    }
  }, [contentWindowCluster]);

  // Make handleJargonClick available globally for onClick handlers
  useEffect(() => {
    (window as any).handleJargonClick = handleJargonClick;
    return () => {
      delete (window as any).handleJargonClick;
    };
  }, [handleJargonClick]);
  const zoomContentRef = useRef<HTMLDivElement>(null); // inner scaled world for drag coords
  const hasDraggedRef = useRef(false);
  const dragStartPosRef = useRef<{x: number; y: number} | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('learnspace_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
  }, []);

  // Load clusters from backend
  const loadClusters = useCallback(async () => {
    try {
      // Fetch clusters and all IRs in parallel
      const [clustersResponse, irsResponse] = await Promise.all([
        fetch('/api/clusters'),
        fetch('/api/ir/extract?all=true'),
      ]);
      
      if (!clustersResponse.ok) throw new Error('Failed to fetch clusters');
      const clustersData = await clustersResponse.json();
      
      // API returns { clusters: [...] }
      const backendClusters = clustersData.clusters || [];
      
      if (!Array.isArray(backendClusters) || backendClusters.length === 0) {
        setClusters([]);
        return;
      }
      
      // Get all IRs for link resolution
      let allIRs: any[] = [];
      if (irsResponse.ok) {
        const irsData = await irsResponse.json();
        allIRs = irsData.irs || [];
      }
      
      // Load saved positions (refresh does not reset positions; only add/remove clusters)
      let savedPositions: Record<string, { x: number; y: number }> = {};
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(CLUSTER_POSITIONS_KEY) : null;
        if (raw) savedPositions = JSON.parse(raw);
      } catch { /* ignore */ }

      // Transform backend clusters to frontend format
      const transformedClusters: Cluster[] = backendClusters.map((bc: any, index: number) => {
        // Parse IR IDs - handle both string and array formats
        const irIds = Array.isArray(bc.irIds) ? bc.irIds : 
                      (typeof bc.irIds === 'string' ? JSON.parse(bc.irIds || '[]') :
                      (bc.IR_IDS ? JSON.parse(bc.IR_IDS || '[]') : []));
        
        // Build links from IRs that belong to this cluster
        const links: ClusterLink[] = [];
        const seenUrls = new Set<string>(); // Track URLs to prevent duplicates
        irIds.forEach((irId: number | string) => {
          const ir = allIRs.find((i: any) => 
            i.id === irId || i.ID === irId || i.id === String(irId) || i.ID === String(irId)
          );
          if (ir) {
            const url = ir.sourceUrl || ir.SOURCE_URL || ir.url || '';
            // Skip if URL is empty or already seen
            if (!url || seenUrls.has(url)) return;
            seenUrls.add(url);
            
            let hostname = 'Unknown';
            try {
              if (url) hostname = new URL(url).hostname;
            } catch { /* ignore invalid URLs */ }
            
            links.push({
              id: `ir-${ir.id || ir.ID}`,
              title: ir.summary || ir.SUMMARY || ir.sourceTitle || ir.SOURCE_TITLE || url || 'Untitled',
              url,
              source: hostname,
            });
          }
        });

        const clusterId = (bc.id || bc.ID || index).toString();
        // Saved position used as-is; others get a placeholder and are assigned later (center-biased, non-overlapping)
        const position = savedPositions[clusterId] ?? { x: 50, y: 50 };

        // Generate a color based on index
        const colors = ['#e07850', '#6b8e7d', '#7d6b8e', '#5a7d9a', '#9a7d5a', '#8e6b7d'];
        
        // Parse description for summary and concepts (API returns lowercase props)
        const description = bc.description || bc.DESCRIPTION || '';
        const summaryMatch = description.match(/Summary: (.+?)(?:\n|$)/);
        const conceptsMatch = description.match(/Key Topics: (.+?)(?:\n|$)/);
        
        // Get aggregated topics if available
        const aggregatedTopics = Array.isArray(bc.aggregatedTopics) ? bc.aggregatedTopics : [];
        
        return {
          id: clusterId,
          name: bc.name || bc.NAME || 'Untitled Cluster',
          color: colors[index % colors.length],
          links,
          summary: summaryMatch ? summaryMatch[1] : description.split('\n')[0] || 'No description available',
          concepts: aggregatedTopics.length > 0 ? aggregatedTopics.slice(0, 5) : 
                    (conceptsMatch ? conceptsMatch[1].split(', ').slice(0, 5) : []),
          size: links.length,
          position,
          isRead: false,
          isHidden: false,
        };
      });

      // Do not show clusters with 0 links (empty clusters)
      const filtered = transformedClusters.filter((c) => c.links.length > 0);

      // Assign center-biased, non-overlapping positions for clusters without saved position
      const usedPositions: { x: number; y: number }[] = filtered
        .filter((c) => savedPositions[c.id])
        .map((c) => c.position);
      const clustersToShow = filtered.map((c) => {
        if (savedPositions[c.id]) return c;
        const pos = getCenterBiasedNonOverlapping(usedPositions);
        usedPositions.push(pos);
        return { ...c, position: pos };
      });

      // Prune saved positions to only existing cluster ids (remove deleted clusters)
      const pruned: Record<string, { x: number; y: number }> = {};
      clustersToShow.forEach((c) => {
        if (savedPositions[c.id]) pruned[c.id] = savedPositions[c.id];
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CLUSTER_POSITIONS_KEY, JSON.stringify(pruned));
        } catch { /* ignore */ }
      }

      // Restore persisted generated content (text or podcast) so we don't call the API again
      let withPersistedContent = clustersToShow;
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(CLUSTER_CONTENT_KEY);
          const parsed: Record<string, { content?: string; podcastUrl?: string; sources?: { title: string; url: string }[] }> = saved ? JSON.parse(saved) : {};
          withPersistedContent = clustersToShow.map((c) => {
            const content = parsed[c.id];
            if (content && (content.content || content.podcastUrl)) return { ...c, generatedContent: content };
            return c;
          });
        } catch { /* ignore */ }
      }
      
      setClusters(withPersistedContent);
    } catch (error) {
      console.error('Error loading clusters:', error);
    }
  }, []);

  // Load clusters on mount
  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  // Clear flashcard slide direction after animation so it doesn't re-run on re-render
  useEffect(() => {
    if (flashcardSlideDirection) {
      const t = setTimeout(() => setFlashcardSlideDirection(null), 400);
      return () => clearTimeout(t);
    }
  }, [flashcardSlideDirection, currentFlashcardIndex]);

  // Refresh: re-cluster based on all existing IRs (IRs are extracted when bookmarks are added)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing clusters...');
      
      // Generate/update clusters (incremental: adds new IRs to existing clusters or creates new ones)
      const clustersRes = await fetch('/api/clusters/generate', {
        method: 'POST',
      });
      
      if (!clustersRes.ok) {
        const errorData = await clustersRes.json();
        throw new Error(errorData.error || 'Failed to generate clusters');
      }

      const result = await clustersRes.json();
      console.log('Cluster generation result:', result);

      // Reload clusters to show updates
      await loadClusters();
      
      if (result.mode === 'initial') {
        alert(`Refresh complete! Created ${result.clustersGenerated} initial clusters.`);
      } else if (result.mode === 'incremental') {
        if (result.assignmentsApplied === 0 && result.newClustersCreated === 0) {
          alert('All links already organized in clusters. Add new bookmarks to see updates!');
        } else {
          alert(`Refresh complete! Added ${result.assignmentsApplied} links to existing clusters and created ${result.newClustersCreated} new clusters.`);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert(`Refresh failed: ${(error as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate content for a cluster based on user preferences
  const handleGenerateContent = async (clusterId: string) => {
    if (!preferences) {
      alert('Please complete the onboarding survey first!');
      return;
    }

    // Don't call the API again if we already have generated content (text or podcast)
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster?.generatedContent?.content || cluster?.generatedContent?.podcastUrl) {
      setContentLoading(false);
      return;
    }

    setContentLoading(true);
    setContentStatus('');

    try {
      if (preferences.learningStyle === 'audio') {
        // Generate podcast — API sends named SSE events: status, done, error
        const params = new URLSearchParams({
          clusterId,
          preferences: JSON.stringify(preferences),
        });
        
        const eventSource = new EventSource(`/api/podcast/generate?${params}`);
        
        eventSource.addEventListener('status', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.msg) setContentStatus(data.msg);
          } catch { /* ignore */ }
        });
        
        eventSource.addEventListener('done', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            updateCluster(clusterId, {
              generatedContent: {
                podcastUrl: data.url,
                sources: data.sources || [],
              },
            });
            setContentStatus('Podcast ready!');
            eventSource.close();
            setContentLoading(false);
          } catch (e) {
            console.error('Podcast done parse error', e);
            eventSource.close();
            setContentLoading(false);
          }
        });
        
        eventSource.addEventListener('error', (event: MessageEvent) => {
          try {
            const data = (event as MessageEvent).data != null ? JSON.parse((event as MessageEvent).data) : {};
            setContentStatus(data.error ? `Error: ${data.error}` : 'Connection error');
          } catch {
            setContentStatus('Connection error');
          }
          eventSource.close();
          setContentLoading(false);
        });
        
        eventSource.onerror = () => {
          eventSource.close();
          setContentStatus('Connection error');
          setContentLoading(false);
        };
      } else {
        // Generate text content
        const response = await fetch('/api/content/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences,
            source: { clusterId },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Failed to generate content (${response.status})`);
        }
        
        const data = await response.json();
        
        // Update cluster with generated content
        const updatedCluster = { ...clusters.find(c => c.id === clusterId)! };
        updateCluster(clusterId, {
          generatedContent: {
            content: data.content,
            sources: data.sources || [],
          },
        });
        
        setContentLoading(false);
      }
    } catch (error) {
      console.error('Content generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      alert(`Failed to generate content: ${errorMessage}`);
      setContentLoading(false);
    }
  };

  // Generate flashcards for a cluster
  const handleGenerateFlashcards = async (clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId);
    // Don't call the API again if we already have flashcards (from state or persisted)
    if (cluster?.flashcards && cluster.flashcards.length > 0) {
      setFlippedFlashcardIndices(new Set());
      setFlashcardWindowCluster(cluster);
      setFlashcardWindowOpen(true);
      return;
    }

    setFlashcardLoading(true);
    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');
      
      const data = await response.json();
      const raw = data.flashcards || [];
      // API returns { question, answer, source }; normalize to { front, back, source }
      const flashcards: Flashcard[] = raw.map((fc: { question?: string; answer?: string; source?: string }) => ({
        front: fc.question ?? fc.front ?? '',
        back: fc.answer ?? fc.back ?? '',
        source: fc.source,
      })).filter((fc: Flashcard) => fc.front && fc.back);

      const cluster = clusters.find(c => c.id === clusterId);
      const clusterWithFlashcards = cluster ? { ...cluster, flashcards } : null;

      updateCluster(clusterId, { flashcards });

      // Open flashcard window with the new data (same behavior as View Content)
      if (clusterWithFlashcards && flashcards.length > 0) {
        setFlippedFlashcardIndices(new Set());
        setCurrentFlashcardIndex(0);
        setFlashcardSlideDirection(null);
        setFlashcardWindowCluster(clusterWithFlashcards);
        setFlashcardWindowOpen(true);
      }

      setFlashcardLoading(false);
    } catch (error) {
      console.error('Flashcard generation error:', error);
      alert('Failed to generate flashcards. See console for details.');
      setFlashcardLoading(false);
    }
  };

  const handleClusterClick = (cluster: Cluster) => {
    // Only open sidebar if we didn't drag
    if (!hasDraggedRef.current) {
      const currentCluster = clusters.find(c => c.id === cluster.id);
      setSelectedCluster(selectedCluster?.id === cluster.id ? null : currentCluster || null);
    }
  };

  // Update cluster in state
  const updateCluster = useCallback((clusterId: string, updates: Partial<Cluster>) => {
    setClusters(prev => prev.map(c => 
      c.id === clusterId ? { ...c, ...updates } : c
    ));
    // Also update selectedCluster if it's the one being updated
    if (selectedCluster?.id === clusterId) {
      setSelectedCluster(prev => prev ? { ...prev, ...updates } : null);
    }
    // Keep content window in sync so podcast/text shows immediately if that cluster is open
    if (contentWindowCluster?.id === clusterId) {
      setContentWindowCluster(prev => prev ? { ...prev, ...updates } : null);
    }
    // Persist generated content so we don't call the API again after refresh
    if (updates.generatedContent && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CLUSTER_CONTENT_KEY);
        const all: Record<string, { content?: string; podcastUrl?: string; sources?: { title: string; url: string }[] }> = raw ? JSON.parse(raw) : {};
        all[clusterId] = updates.generatedContent;
        localStorage.setItem(CLUSTER_CONTENT_KEY, JSON.stringify(all));
      } catch { /* ignore */ }
    }
    // Persist flashcards so we don't call the API again after refresh
    if (updates.flashcards && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CLUSTER_FLASHCARDS_KEY);
        const all: Record<string, { front: string; back: string; source?: string }[]> = raw ? JSON.parse(raw) : {};
        all[clusterId] = updates.flashcards;
        localStorage.setItem(CLUSTER_FLASHCARDS_KEY, JSON.stringify(all));
      } catch { /* ignore */ }
    }
  }, [selectedCluster, contentWindowCluster]);

  // Toggle read status
  const toggleRead = (clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      updateCluster(clusterId, { isRead: !cluster.isRead });
    }
  };

  // Toggle hidden status
  const toggleHidden = (clusterId: string) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (cluster) {
      updateCluster(clusterId, { isHidden: !cluster.isHidden });
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, clusterId: string) => {
    e.preventDefault();
    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setDraggedCluster(clusterId);
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedCluster || !containerRef.current) return;
    
    // Check if we've moved enough to count as a drag (5px threshold)
    if (dragStartPosRef.current) {
      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      if (dx > 5 || dy > 5) {
        hasDraggedRef.current = true;
      }
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    // Calculate position as percentage of container (accounting for zoom in container size)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Allow clusters anywhere in the container
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    updateCluster(draggedCluster, { position: { x: clampedX, y: clampedY } });

    // Persist position so refresh does not reset it
    try {
      const raw = localStorage.getItem(CLUSTER_POSITIONS_KEY);
      const saved: Record<string, { x: number; y: number }> = raw ? JSON.parse(raw) : {};
      saved[draggedCluster] = { x: clampedX, y: clampedY };
      localStorage.setItem(CLUSTER_POSITIONS_KEY, JSON.stringify(saved));
    } catch { /* ignore */ }
  }, [isDragging, draggedCluster, updateCluster]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedCluster(null);
    dragStartPosRef.current = null;
    // Reset hasDragged after a short delay to allow click handler to check it
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 10);
  }, []);

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const getClusterSize = (size: number) => {
    const baseSize = 120; // Increased from 80
    return baseSize + (size * 30);
  };

  // Filter clusters based on hidden status
  const visibleClusters = showHidden ? clusters : clusters.filter(c => !c.isHidden);
  const totalLinks = clusters.reduce((acc, c) => acc + c.links.length, 0);

  return (
    <div className="relative min-h-screen w-full bg-[#d0d0d0] flex">
      {/* Inject floating animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
      
      {/* NOISE TEXTURE OVERLAY - Optimized single layer */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.4] mix-blend-overlay">
        <svg className="h-full w-full">
          <filter id="noiseFilterDash">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.2"
              numOctaves="3"
              seed="10"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterDash)" />
        </svg>
      </div>

      {/* LEFT SIDEBAR - Cluster List */}
      <aside className="relative z-30 w-72 min-h-screen bg-white/20 backdrop-blur-sm border-r border-neutral-300/50 flex flex-col">
        {/* Header with title and stats */}
        <div className="p-6 border-b border-neutral-300/50">
          <h1 className="text-2xl font-semibold text-neutral-900/85 font-[family-name:var(--font-display)]">
            My Learnspace<span style={{ color: "#e07850" }}>.</span>
          </h1>
          <p className="text-neutral-500 text-sm font-[family-name:var(--font-body)] mt-1">
            {clusters.length} clusters • {totalLinks} total links
          </p>
        </div>

        {/* Clusters List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 font-[family-name:var(--font-body)]">
            Clusters
          </h3>
          <div className="space-y-2">
            {clusters.map((cluster) => {
              const isSelectedCluster = selectedCluster?.id === cluster.id;
              return (
              <button
                key={cluster.id}
                onClick={() => handleClusterClick(cluster)}
                className={`w-full text-left px-3 py-3 rounded-sm transition-all duration-300 group ${
                  isSelectedCluster
                    ? ""
                    : "hover:bg-white/40"
                }`}
                style={{
                  background: isSelectedCluster 
                    ? "linear-gradient(135deg, rgba(224,120,80,0.3) 0%, rgba(224,120,80,0.15) 100%)"
                    : undefined,
                  boxShadow: isSelectedCluster
                    ? `0 0 0 2px #e07850, 0 0 20px #e0785030`
                    : "none"
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Read indicator */}
                  {cluster.isRead && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e07850" strokeWidth="3" className="flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <div 
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${cluster.isHidden ? 'opacity-40' : ''}`}
                    style={{ 
                      backgroundColor: isSelectedCluster ? "#e07850" : cluster.color,
                      boxShadow: isSelectedCluster ? "0 0 8px #e07850" : "none"
                    }}
                  />
                  <span className={`text-sm font-[family-name:var(--font-body)] truncate ${isSelectedCluster ? "text-neutral-900 font-medium" : "text-neutral-800"} ${cluster.isHidden ? 'opacity-40 line-through' : ''}`}>
                    {cluster.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-neutral-500 font-[family-name:var(--font-body)]">
                    {cluster.links.length} links
                    {cluster.isHidden && <span className="ml-1 text-neutral-400">(hidden)</span>}
                  </span>
                </div>
              </button>
            );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-neutral-300/50 space-y-2">
          {/* Refresh Button - Orange */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full px-4 py-2 text-sm text-white font-[family-name:var(--font-body)] transition-colors duration-200 flex items-center justify-center gap-2 rounded-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed" 
            style={{ backgroundColor: "#e07850" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {/* Add Link Button */}
          <button className="w-full px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-[family-name:var(--font-body)] transition-colors duration-200 flex items-center justify-center gap-2 bg-white/30 hover:bg-white/50 rounded-sm">
            <span className="text-lg">+</span> Add Link
          </button>
          
          {/* Back Home Button - Gray with white text */}
          <Link 
            href="/"
            className="w-full px-4 py-2 text-sm text-white font-[family-name:var(--font-body)] transition-colors duration-200 flex items-center justify-center gap-2 rounded-sm hover:brightness-110"
            style={{ backgroundColor: "#4a4a4a" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Back Home
          </Link>
        </div>

        {/* Show Hidden Toggle */}
        <div className="p-4 border-t border-neutral-300/50">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-600 font-[family-name:var(--font-body)]">
            <input 
              type="checkbox" 
              checked={showHidden} 
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 accent-[#e07850]"
            />
            Show hidden clusters
          </label>
        </div>
      </aside>

      {/* MAIN CONTENT - Cluster Visualization */}
      <main className={`relative z-30 flex-1 min-h-screen overflow-hidden transition-all duration-500 ${selectedCluster ? 'mr-80' : ''}`}>
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 bg-white/40 backdrop-blur-sm rounded-sm p-2">
          <button 
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 bg-white/50 hover:bg-white/80 rounded-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-xs text-center text-neutral-600 font-[family-name:var(--font-body)]">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 bg-white/50 hover:bg-white/80 rounded-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button 
            onClick={() => setZoom(1)}
            className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 text-xs font-[family-name:var(--font-body)] bg-white/50 hover:bg-white/80 rounded-sm transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Help Button - Bottom Left next to sidebar */}
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="absolute bottom-6 left-4 z-40 w-12 h-12 flex items-center justify-center border-2 border-[#e07850] hover:bg-[#e07850]/10 text-[#e07850] rounded-full transition-colors"
          title="Help"
        >
          <span className="text-xl font-bold font-serif">i</span>
        </button>

        {/* Help Tooltip */}
        {showHelp && (
          <div className="absolute bottom-20 left-4 z-50 w-72 bg-white/95 backdrop-blur-md rounded-sm shadow-lg border border-neutral-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 font-[family-name:var(--font-display)]">How to use Learnspace</h3>
              <button onClick={() => setShowHelp(false)} className="text-neutral-500 hover:text-neutral-900">✕</button>
            </div>
            <div className="space-y-3 text-xs text-neutral-700 font-[family-name:var(--font-body)]">
              <p><strong className="text-neutral-900">Clusters</strong> are groups of related links that Learnspace automatically organizes for you.</p>
              <div className="space-y-2">
                <p><span className="inline-block w-3 h-3 rounded-full mr-2" style={{backgroundColor: "#e07850"}}></span><strong>Drag</strong> clusters to rearrange your space</p>
                <p><span className="text-[#e07850] mr-2">●</span><strong>Change color</strong> — Click the color circle in the sidebar</p>
                <p><span className="text-[#e07850] mr-2">✓</span><strong>Mark as Read</strong> — Track what you&apos;ve reviewed</p>
                <p><span className="text-neutral-500 mr-2">◐</span><strong>Hide</strong> — Toggle visibility of clusters</p>
              </div>
              <div className="pt-2 border-t border-neutral-200">
                <p><strong className="text-neutral-900">Refresh</strong> — Syncs new bookmarks from your &quot;Learnspace&quot; Chrome bookmark folder and creates new clusters.</p>
                <p className="mt-2"><strong className="text-neutral-900">Add Link</strong> — Manually add any URL to your Learnspace.</p>
              </div>
            </div>
          </div>
        )}

        {/* Grid Background (Graph Paper) - Outside zoom container so it always fills screen */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(120,120,120,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(120,120,120,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Cluster Visualization Area — camera-style zoom from center */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-visible flex items-center justify-center"
          onClick={(e) => {
            // Close sidebar when clicking on empty space (not on clusters)
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-cluster]') === null) {
              setSelectedCluster(null);
            }
          }}
        >
          <div
            ref={zoomContentRef}
            className="relative"
            style={{
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out',
            }}
          >
          {/* Background gradient */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />


          {/* Clusters */}
          {visibleClusters.map((cluster, index) => {
            const size = getClusterSize(cluster.size);
            const isSelected = selectedCluster?.id === cluster.id;
            const isHovered = hoveredCluster === cluster.id;
            const isBeingDragged = draggedCluster === cluster.id;

            return (
              <div
                key={cluster.id}
                ref={(el) => {
                  if (el) clusterRefs.current.set(cluster.id, el);
                  else clusterRefs.current.delete(cluster.id);
                }}
                data-cluster={cluster.id}
                onMouseUp={() => handleClusterClick(cluster)}
                onMouseDown={(e) => handleDragStart(e, cluster.id)}
                onMouseEnter={() => setHoveredCluster(cluster.id)}
                onMouseLeave={() => setHoveredCluster(null)}
                className={`absolute cursor-grab group ${isBeingDragged ? 'cursor-grabbing' : ''} ${cluster.isHidden ? 'opacity-40' : ''}`}
                style={{
                  left: isSelected ? '50%' : `${cluster.position.x}%`,
                  top: isSelected ? '50%' : `${cluster.position.y}%`,
                  transform: `translate(-50%, -50%) scale(${isBeingDragged ? 1.15 : isSelected ? 1.2 : isHovered ? 1.1 : 1})`,
                  zIndex: isBeingDragged ? 100 : isSelected ? 20 : isHovered ? 15 : 10,
                  animation: isSelected || isHovered || isBeingDragged ? 'none' : getFloatAnimation(index),
                  transition: isBeingDragged ? 'none' : 'left 0.4s ease-out, top 0.4s ease-out, transform 0.2s ease-out',
                  willChange: isBeingDragged ? 'left, top, transform' : 'auto',
                }}
              >
                {/* Read indicator */}
                {cluster.isRead && (
                  <div 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center z-20"
                    style={{ backgroundColor: "#e07850" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* Outer glow */}
                <div
                  className="absolute inset-0 rounded-full transition-all duration-300"
                  style={{
                    width: size + 40,
                    height: size + 40,
                    left: -20,
                    top: -20,
                    background: `radial-gradient(circle, ${cluster.color}30 0%, ${cluster.color}10 50%, transparent 70%)`,
                    opacity: isSelected || isHovered || isBeingDragged ? 1 : 0.5,
                    filter: "blur(20px)",
                  }}
                />

                {/* Main circle */}
                <div
                  className="relative rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    width: size,
                    height: size,
                    background: `radial-gradient(circle at 30% 30%, ${cluster.color}90 0%, ${cluster.color} 50%, ${cluster.color}dd 100%)`,
                    boxShadow: isBeingDragged
                      ? `0 0 0 3px #e07850, 0 0 60px ${cluster.color}80, 0 30px 80px ${cluster.color}60`
                      : isSelected 
                      ? `0 0 0 3px white, 0 0 40px ${cluster.color}60, 0 20px 60px ${cluster.color}40`
                      : `0 10px 40px ${cluster.color}30`,
                  }}
                >
                  {/* Cluster name */}
                  <span 
                    className="text-white font-[family-name:var(--font-display)] text-center px-4 leading-tight select-none"
                    style={{
                      fontSize: size > 150 ? '14px' : '12px',
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  >
                    {cluster.name}
                  </span>
                </div>

                {/* Link count badge */}
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-white/90 rounded-full text-xs font-[family-name:var(--font-body)] text-neutral-700 shadow-sm"
                >
                  {cluster.links.length}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR - Cluster Details */}
      <aside 
        className={`fixed right-0 top-0 z-30 w-80 h-screen bg-white/40 backdrop-blur-md border-l border-neutral-300/50 transition-transform duration-500 ease-out ${
          selectedCluster ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedCluster && (
          <div className="h-full flex flex-col">
            {/* Header with read indicator */}
            <div className="p-6 border-b border-neutral-300/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Read indicator */}
                  {selectedCluster.isRead && (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#e07850" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {/* Color picker */}
                  <input 
                    type="color"
                    value={selectedCluster.color}
                    onChange={(e) => updateCluster(selectedCluster.id, { color: e.target.value })}
                    className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-sm"
                    style={{ backgroundColor: selectedCluster.color }}
                  />
                  <h2 className="text-lg font-semibold text-neutral-900/85 font-[family-name:var(--font-display)]">
                    {selectedCluster.name}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedCluster(null)}
                  className="text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-neutral-500 font-[family-name:var(--font-body)] mt-2">
                {selectedCluster.links.length} links collected
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => toggleRead(selectedCluster.id)}
                  className={`flex-1 px-3 py-2 text-xs rounded-sm transition-colors flex items-center justify-center gap-2 ${
                    selectedCluster.isRead 
                      ? 'bg-[#e07850] text-white' 
                      : 'bg-white/50 text-neutral-600 hover:bg-white/70'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {selectedCluster.isRead ? 'Read' : 'Mark as Read'}
                </button>
                <button 
                  onClick={() => toggleHidden(selectedCluster.id)}
                  className={`flex-1 px-3 py-2 text-xs rounded-sm transition-colors flex items-center justify-center gap-2 ${
                    selectedCluster.isHidden 
                      ? 'bg-neutral-600 text-white' 
                      : 'bg-white/50 text-neutral-600 hover:bg-white/70'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {selectedCluster.isHidden ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                  {selectedCluster.isHidden ? 'Hidden' : 'Hide'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-body)]">
                  Summary
                </h3>
                <p className="text-sm text-neutral-700 font-[family-name:var(--font-body)] leading-relaxed">
                  {selectedCluster.summary}
                </p>
              </div>

              {/* Key Concepts */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-body)]">
                  Key Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCluster.concepts.map((concept, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 text-xs rounded-sm font-[family-name:var(--font-body)]"
                      style={{ 
                        backgroundColor: `${selectedCluster.color}20`,
                        color: selectedCluster.color,
                      }}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-body)]">
                  Saved Links
                </h3>
                <div className="space-y-2">
                  {selectedCluster.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white/50 hover:bg-white/80 rounded-sm transition-colors duration-200 group"
                    >
                      <p className="text-sm font-semibold text-neutral-900 font-[family-name:var(--font-body)] group-hover:text-neutral-900 mb-1">
                        {link.title}
                      </p>
                      <p className="text-xs text-neutral-500 font-[family-name:var(--font-body)]">
                        {link.source}
                      </p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Flashcards */}
              {selectedCluster.flashcards && selectedCluster.flashcards.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 font-[family-name:var(--font-body)]">
                    Flashcards ({selectedCluster.flashcards.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedCluster.flashcards.map((card, idx) => (
                      <div key={idx} className="p-3 bg-white/50 rounded-sm">
                        <p className="text-sm font-semibold text-neutral-800 font-[family-name:var(--font-body)] mb-1">
                          Q: {card.front}
                        </p>
                        <p className="text-sm text-neutral-600 font-[family-name:var(--font-body)]">
                          A: {card.back}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* View Content Button */}
            <div className="p-6 border-t border-neutral-300/50 space-y-2">
              {!selectedCluster.generatedContent ? (
                <>
                  <button 
                    onClick={() => handleGenerateContent(selectedCluster.id)}
                    disabled={contentLoading || !preferences}
                    className="w-full px-6 py-3 text-white text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: selectedCluster.color }}
                  >
                    {contentLoading ? contentStatus || 'Generating...' : 'Generate Content'}
                  </button>
                  {!preferences && (
                    <p className="text-xs text-neutral-500 text-center font-[family-name:var(--font-body)]">
                      Complete <Link href="/onboarding" className="text-[#e07850] hover:underline">onboarding</Link> to generate content
                    </p>
                  )}
                </>
              ) : (
                <button 
                  onClick={() => {
                    setContentWindowCluster(selectedCluster);
                    setContentWindowOpen(true);
                  }}
                  className="w-full px-6 py-3 text-white text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110"
                  style={{ backgroundColor: selectedCluster.color }}
                >
                  View Content
                </button>
              )}
              
              {!selectedCluster.flashcards ? (
                <button 
                  onClick={() => handleGenerateFlashcards(selectedCluster.id)}
                  disabled={flashcardLoading || !selectedCluster.generatedContent}
                  className="w-full px-6 py-3 text-white text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: selectedCluster.color }}
                >
                  {flashcardLoading ? 'Generating Flashcards...' : 'Generate Flashcards'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setFlippedFlashcardIndices(new Set());
                    setCurrentFlashcardIndex(0);
                    setFlashcardSlideDirection(null);
                    setFlashcardWindowCluster(selectedCluster);
                    setFlashcardWindowOpen(true);
                  }}
                  className="w-full px-6 py-3 text-white text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110"
                  style={{ backgroundColor: selectedCluster.color }}
                >
                  View Flashcards
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Content Window */}
      {contentWindowOpen && contentWindowCluster && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setContentWindowOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Content Window */}
          <div 
            className="relative w-[90vw] max-w-4xl h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-neutral-900 font-[family-name:var(--font-display)] truncate pr-4">
                {contentWindowCluster.name}
              </h2>
              <button 
                onClick={() => setContentWindowOpen(false)}
                className="text-neutral-500 hover:text-neutral-900 text-2xl flex-shrink-0"
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 h-[calc(85vh-80px)] overflow-y-auto overflow-x-hidden">
              {contentWindowCluster.generatedContent?.content && (
                <div 
                  className="prose max-w-none font-[family-name:var(--font-body)] break-words overflow-wrap-anywhere"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithJargon(contentWindowCluster.generatedContent.content) }} 
                />
              )}
              
              {contentWindowCluster.generatedContent?.podcastUrl && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-neutral-900 font-[family-name:var(--font-display)]">Podcast</h3>
                  <audio controls className="w-full">
                    <source src={contentWindowCluster.generatedContent.podcastUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              
              {contentWindowCluster.generatedContent?.sources && contentWindowCluster.generatedContent.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-200">
                  <h3 className="text-lg font-semibold text-neutral-900 font-[family-name:var(--font-display)] mb-4">Sources</h3>
                  <div className="space-y-2">
                    {contentWindowCluster.generatedContent.sources.map((source, idx) => (
                      <a 
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-[#e07850] hover:underline font-[family-name:var(--font-body)] break-words overflow-wrap-anywhere"
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {source.title || source.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Window */}
      {flashcardWindowOpen && flashcardWindowCluster && Array.isArray(flashcardWindowCluster.flashcards) && flashcardWindowCluster.flashcards.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setFlashcardWindowOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Flashcard Window */}
          <div 
            className="relative flex flex-col w-[90vw] max-w-4xl h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-2xl font-semibold text-neutral-900 font-[family-name:var(--font-display)]">
                {flashcardWindowCluster.name} - Flashcards
              </h2>
              <button 
                onClick={() => setFlashcardWindowOpen(false)}
                className="text-neutral-500 hover:text-neutral-900 text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Flashcards - one at a time with left/right arrows like Quizlet */}
            <div className="flex flex-1 flex-col h-[calc(85vh-80px)] min-h-0">
              <div className="flex flex-1 items-center justify-center gap-4 px-4 py-6">
                {/* Left arrow - greyed out on first card */}
                <button
                  type="button"
                  onClick={() => {
                    setFlashcardSlideDirection('left');
                    setCurrentFlashcardIndex(i => Math.max(0, i - 1));
                  }}
                  disabled={currentFlashcardIndex === 0}
                  className="shrink-0 p-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent hover:bg-neutral-100 text-neutral-700 disabled:text-neutral-400"
                  aria-label="Previous card"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Single card - click to flip; slides in from left/right when changing */}
                <div className="flex-1 max-w-2xl w-full min-h-[240px] overflow-hidden flex items-center justify-center">
                {(() => {
                  const cards = flashcardWindowCluster.flashcards ?? [];
                  const idx = Math.min(currentFlashcardIndex, cards.length - 1);
                  const card = cards[idx];
                  if (!card) return null;
                  const isFlipped = flippedFlashcardIndices.has(idx);
                  const toggleFlip = () => {
                    setFlippedFlashcardIndices(prev => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    });
                  };
                  const slideClass = flashcardSlideDirection === 'right' ? 'flashcard-enter-right' : flashcardSlideDirection === 'left' ? 'flashcard-enter-left' : '';
                  return (
                    <div
                      key={currentFlashcardIndex}
                      className={`w-full cursor-pointer select-none min-h-[240px] ${slideClass}`}
                      style={{ perspective: '1000px' }}
                      onClick={toggleFlip}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFlip(); } }}
                      aria-label={isFlipped ? 'Show question' : 'Show answer'}
                    >
                      <div
                        className="relative w-full h-full min-h-[240px] max-h-[50vh] transition-transform duration-500 ease-in-out"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* Front - Question */}
                        <div
                          className="absolute inset-0 rounded-xl border border-neutral-200 bg-white shadow-lg flex flex-col p-6 overflow-hidden"
                          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        >
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider font-[family-name:var(--font-body)] mb-2 shrink-0">
                            Question {idx + 1}
                            {card.source && <span className="text-neutral-400 ml-1">• {card.source}</span>}
                          </span>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            <p className="text-base font-semibold text-neutral-900 font-[family-name:var(--font-display)] break-words">
                              {card.front}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-400 mt-2 shrink-0 font-[family-name:var(--font-body)]">Click to flip</p>
                        </div>
                        {/* Back - Answer */}
                        <div
                          className="absolute inset-0 rounded-xl border border-[#e07850]/30 bg-[#fef8f6] shadow-lg flex flex-col p-6 overflow-hidden"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <span className="text-xs font-semibold text-[#e07850] uppercase tracking-wider mb-2 shrink-0 font-[family-name:var(--font-body)]">
                            Answer
                          </span>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            <p className="text-base text-neutral-800 leading-relaxed font-[family-name:var(--font-body)] break-words">
                              {card.back}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-400 mt-2 shrink-0 font-[family-name:var(--font-body)]">Click to flip back</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>

                {/* Right arrow - greyed out on last card */}
                <button
                  type="button"
                  onClick={() => {
                    setFlashcardSlideDirection('right');
                    setCurrentFlashcardIndex(i => Math.min((flashcardWindowCluster.flashcards?.length ?? 1) - 1, i + 1));
                  }}
                  disabled={currentFlashcardIndex >= (flashcardWindowCluster.flashcards?.length ?? 1) - 1}
                  className="shrink-0 p-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent hover:bg-neutral-100 text-neutral-700 disabled:text-neutral-400"
                  aria-label="Next card"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="text-center pb-4 text-sm text-neutral-500 font-[family-name:var(--font-body)]">
                Card {currentFlashcardIndex + 1} of {flashcardWindowCluster.flashcards?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jargon Definition Modal */}
      {selectedJargon && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center"
          onClick={() => {
            setSelectedJargon(null);
            setJargonDefinition(null);
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div 
            className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900 font-[family-name:var(--font-display)]">
                {selectedJargon}
              </h3>
              <button 
                onClick={() => {
                  setSelectedJargon(null);
                  setJargonDefinition(null);
                }}
                className="text-neutral-500 hover:text-neutral-900 text-2xl"
              >
                ×
              </button>
            </div>
            {jargonDefinition ? (
              <p className="text-neutral-700 font-[family-name:var(--font-body)] leading-relaxed">
                {jargonDefinition}
              </p>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e07850]"></div>
                <span className="ml-3 text-neutral-500 font-[family-name:var(--font-body)]">Loading definition...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
