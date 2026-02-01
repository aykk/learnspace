'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SURVEY_CONFIG } from '@/lib/survey-config';

interface Bookmark {
  ID: number;
  URL: string;
  TITLE: string | null;
  DATE_ADDED: string | null;
  _LOAD_TIME?: string;
  LOAD_TIME?: string;
}

interface IR {
  id: string;
  bookmarkId: number;
  summary: string;
  keyTopics: string[];
  concepts: Array<{
    name: string;
    description: string;
    importance: string;
  }>;
  difficulty: string;
  contentType: string;
  estimatedReadTime?: number;
}

interface Cluster {
  id: string;
  name: string;
  description: string;
  irIds: string[];
  aggregatedTopics: string[];
  memberCount: number;
  avgDifficulty: string;
  createdAt: string;
}

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

export default function Dashboard() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [irs, setIrs] = useState<Record<number, IR>>({});
  const [loading, setLoading] = useState(true);
  const [podcastStatus, setPodcastStatus] = useState('');
  const [podcastError, setPodcastError] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form state for adding bookmarks
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  
  // IR extraction state
  const [extractingIR, setExtractingIR] = useState<Record<number, boolean>>({});
  
  // Clustering state
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [generatingClusters, setGeneratingClusters] = useState(false);
  const [clusterError, setClusterError] = useState('');

  // User content preferences and generated content
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedPodcastUrl, setGeneratedPodcastUrl] = useState('');

  // Content generation per cluster
  const [clusterContents, setClusterContents] = useState<Record<string, { content?: string; podcastUrl?: string; sources: { title: string; url: string }[] }>>({});
  const [clusterContentLoading, setClusterContentLoading] = useState<Record<string, boolean>>({});
  const [clusterContentStatus, setClusterContentStatus] = useState<Record<string, string>>({});
  const [clusterContentError, setClusterContentError] = useState<Record<string, string>>({});

  // Per-cluster flashcards
  const [clusterFlashcards, setClusterFlashcards] = useState<Record<string, { question: string; answer: string }[]>>({});
  const [clusterFlashcardLoading, setClusterFlashcardLoading] = useState<Record<string, boolean>>({});
  const [clusterFlashcardError, setClusterFlashcardError] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState<UserContentPreferences>({
    learningStyle: 'verbal',
    textFormat: 'bullet',
    jargonLevel: 'some',
    interests: [],
    customInterests: '',
    podcastLength: 'medium',
    podcastStyle: 'educational',
    background: 'student',
    backgroundDetails: '',
    extraNotes: '',
  });

  const toggleInterest = (interest: string) => {
    setPreferences(prev => {
      const current = prev.interests || [];
      return {
        ...prev,
        interests: current.includes(interest)
          ? current.filter(i => i !== interest)
          : [...current, interest],
      };
    });
  };

  const handleGenerateContent = () => {
    setContentLoading(true);
    setContentError('');

    if (preferences.learningStyle === 'audio') {
      setGeneratedContent('');
      setGeneratedPodcastUrl('');
      const params = new URLSearchParams({
        preferences: encodeURIComponent(JSON.stringify(preferences)),
      });
      const es = new EventSource(`/api/podcast/generate?${params}`);
      es.addEventListener('status', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setContentError('');
      });
      es.addEventListener('done', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        es.close();
        if (data.url) {
          setGeneratedPodcastUrl(data.url);
          setPodcastUrl(data.url);
          setPodcastStatus('Done! Playing…');
          setPodcastError(false);
        } else {
          setContentError('No audio URL returned.');
        }
        setContentLoading(false);
      });
      es.addEventListener('error', (e: Event) => {
        es.close();
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setContentError(data.error || 'Unknown error');
        } catch {
          setContentError('Connection lost or server error.');
        }
        setContentLoading(false);
      });
      es.onerror = () => {
        es.close();
        setContentError('Connection lost.');
        setContentLoading(false);
      };
    } else {
      setGeneratedContent('');
      setGeneratedPodcastUrl('');
      fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, source: 'bookmarks' }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setGeneratedContent(data.content || '');
        })
        .catch(err => setContentError((err as Error).message))
        .finally(() => setContentLoading(false));
    }
  };

  const handleGenerateClusterContent = (clusterId: string) => {
    setClusterContentLoading(prev => ({ ...prev, [clusterId]: true }));
    setClusterContentError(prev => ({ ...prev, [clusterId]: '' }));
    setClusterContentStatus(prev => ({ ...prev, [clusterId]: 'Starting…' }));

    if (preferences.learningStyle === 'audio') {
      const params = new URLSearchParams({
        clusterId,
        preferences: encodeURIComponent(JSON.stringify(preferences)),
      });
      const es = new EventSource(`/api/podcast/generate?${params}`);

      es.addEventListener('status', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setClusterContentStatus(prev => ({ ...prev, [clusterId]: data.msg }));
        setClusterContentError(prev => ({ ...prev, [clusterId]: '' }));
      });

      es.addEventListener('done', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        es.close();
        if (data.url) {
          setClusterContents(prev => ({
            ...prev,
            [clusterId]: { podcastUrl: data.url, sources: data.sources || [] },
          }));
          setClusterContentStatus(prev => ({ ...prev, [clusterId]: '' }));
        } else {
          setClusterContentError(prev => ({ ...prev, [clusterId]: 'No audio URL returned.' }));
        }
        setClusterContentLoading(prev => ({ ...prev, [clusterId]: false }));
      });

      es.addEventListener('error', (e: Event) => {
        es.close();
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setClusterContentError(prev => ({ ...prev, [clusterId]: data.error || 'Unknown error' }));
        } catch {
          setClusterContentError(prev => ({ ...prev, [clusterId]: 'Connection lost or server error.' }));
        }
        setClusterContentStatus(prev => ({ ...prev, [clusterId]: '' }));
        setClusterContentLoading(prev => ({ ...prev, [clusterId]: false }));
      });

      es.onerror = () => {
        es.close();
        setClusterContentError(prev => ({ ...prev, [clusterId]: prev[clusterId] || 'Connection lost.' }));
        setClusterContentStatus(prev => ({ ...prev, [clusterId]: '' }));
        setClusterContentLoading(prev => ({ ...prev, [clusterId]: false }));
      };
    } else {
      setClusterContentStatus(prev => ({ ...prev, [clusterId]: 'Generating text…' }));
      fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, source: { clusterId } }),
      })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setClusterContents(prev => ({
              ...prev,
              [clusterId]: { content: data.content || '', sources: data.sources || [] },
            }));
          } else {
            setClusterContentError(prev => ({ ...prev, [clusterId]: data.error }));
          }
        })
        .catch(err => setClusterContentError(prev => ({ ...prev, [clusterId]: (err as Error).message })))
        .finally(() => {
          setClusterContentLoading(prev => ({ ...prev, [clusterId]: false }));
          setClusterContentStatus(prev => ({ ...prev, [clusterId]: '' }));
        });
    }
  };

  const handleGenerateClusterFlashcards = async (clusterId: string) => {
    setClusterFlashcardLoading(prev => ({ ...prev, [clusterId]: true }));
    setClusterFlashcardError(prev => ({ ...prev, [clusterId]: '' }));
    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');
      setClusterFlashcards(prev => ({ ...prev, [clusterId]: data.flashcards || [] }));
    } catch (err) {
      setClusterFlashcardError(prev => ({ ...prev, [clusterId]: (err as Error).message }));
    } finally {
      setClusterFlashcardLoading(prev => ({ ...prev, [clusterId]: false }));
    }
  };

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookmarks');
      const data = await res.json();
      const bookmarkList = Array.isArray(data) ? data : [];
      setBookmarks(bookmarkList);
      
      // Fetch IRs for each bookmark
      const irMap: Record<number, IR> = {};
      for (const bookmark of bookmarkList) {
        try {
          const irRes = await fetch(`/api/ir/extract?bookmarkId=${bookmark.ID}`);
          if (irRes.ok) {
            const irData = await irRes.json();
            irMap[bookmark.ID] = irData.ir;
          }
        } catch (err) {
          // IR doesn't exist yet, that's ok
        }
      }
      setIrs(irMap);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClusters = async () => {
    try {
      const res = await fetch('/api/clusters');
      const data = await res.json();
      const list = data.clusters || [];
      // Only keep clusters with at least one member (API also filters; this handles stale state)
      setClusters(list.filter((c: Cluster) => (c.memberCount ?? 0) > 0 && (c.irIds?.length ?? 0) > 0));
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      setClusters([]);
    }
  };

  useEffect(() => {
    fetchBookmarks();
    fetchClusters();
  }, []);

  // Auto-poll for IRs when there are bookmarks without extracted IRs
  useEffect(() => {
    // Check if any bookmarks are missing IRs
    const pendingBookmarks = bookmarks.filter(b => !irs[b.ID] && !extractingIR[b.ID]);
    
    if (pendingBookmarks.length > 0 && !loading) {
      // Poll every 3 seconds to check for completed IR extractions
      const pollInterval = setInterval(async () => {
        let hasNewIR = false;
        const newIrs = { ...irs };
        
        for (const bookmark of pendingBookmarks) {
          try {
            const irRes = await fetch(`/api/ir/extract?bookmarkId=${bookmark.ID}`);
            if (irRes.ok) {
              const irData = await irRes.json();
              newIrs[bookmark.ID] = irData.ir;
              hasNewIR = true;
            }
          } catch {
            // IR doesn't exist yet
          }
        }
        
        if (hasNewIR) {
          setIrs(newIrs);
        }
      }, 3000);
      
      return () => clearInterval(pollInterval);
    }
  }, [bookmarks, irs, extractingIR, loading]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: newUrl.trim(), 
          title: newTitle.trim() || newUrl.trim(),
          dateAdded: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewUrl('');
        setNewTitle('');
        fetchBookmarks();
      } else {
        setAddError(data.error || 'Failed to add bookmark');
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      setAddError('Network error. Is the dev server running?');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteBookmark = async (url: string) => {
    try {
      await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      fetchBookmarks();
      fetchClusters(); // Clusters are updated when bookmark/IR is removed
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const handleExtractIR = async (bookmark: Bookmark) => {
    setExtractingIR(prev => ({ ...prev, [bookmark.ID]: true }));
    try {
      const res = await fetch('/api/ir/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarkId: bookmark.ID,
          url: bookmark.URL,
          title: bookmark.TITLE,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setIrs(prev => ({ ...prev, [bookmark.ID]: data.ir }));
      } else {
        const err = await res.json();
        alert(`Failed to extract IR: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to extract IR:', error);
      alert('Network error extracting IR');
    } finally {
      setExtractingIR(prev => ({ ...prev, [bookmark.ID]: false }));
    }
  };

  const [clearing, setClearing] = useState(false);

  // Chat state for Gemini
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  // Flashcard state
  const [flashcards, setFlashcards] = useState<{ question: string; answer?: string; source?: string }[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardError, setFlashcardError] = useState('');

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    setChatError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setChatError(data.error || 'Failed to get response');
        setChatMessages(prev => prev.slice(0, -1));
        return;
      }

      setChatMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err) {
      setChatError((err as Error).message || 'Request failed');
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const generateFlashcards = async () => {
    setFlashcardLoading(true);
    setFlashcardError('');
    setFlashcards([]);
    try {
      const res = await fetch('/api/flashcards/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setFlashcards(data.flashcards || []);
      setFlashcardIndex(0);
      setFlashcardFlipped(false);
    } catch (err) {
      setFlashcardError((err as Error).message);
    } finally {
      setFlashcardLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all bookmarks? This cannot be undone.')) return;
    setClearing(true);
    try {
      await fetch('/api/bookmarks/clear', { method: 'DELETE' });
      fetchBookmarks();
    } catch (error) {
      console.error('Failed to clear bookmarks:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleGenerateClusters = async () => {
    setGeneratingClusters(true);
    setClusterError('');
    try {
      const res = await fetch('/api/clusters/generate', {
        method: 'POST',
      });
      
      if (res.ok) {
        const data = await res.json();
        await fetchClusters(); // Refresh clusters
        alert(`✅ Generated ${data.clustersGenerated} clusters!`);
      } else {
        const err = await res.json();
        setClusterError(err.error || 'Failed to generate clusters');
      }
    } catch (error) {
      console.error('Failed to generate clusters:', error);
      setClusterError('Network error generating clusters');
    } finally {
      setGeneratingClusters(false);
    }
  };

  const generatePodcast = () => {
    setGenerating(true);
    setPodcastStatus('Starting…');
    setPodcastError(false);
    setPodcastUrl('');

    const es = new EventSource('/api/podcast/generate');

    es.addEventListener('status', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setPodcastStatus(data.msg);
      setPodcastError(false);
    });

    es.addEventListener('done', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      es.close();
      if (data.url) {
        setPodcastStatus('Done! Playing…');
        setPodcastUrl(data.url);
      } else {
        setPodcastStatus('No audio URL returned.');
      }
      setGenerating(false);
    });

    es.addEventListener('error', (e: Event) => {
      es.close();
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setPodcastStatus(data.error || 'Unknown error');
      } catch {
        setPodcastStatus('Connection lost or server error.');
      }
      setPodcastError(true);
      setGenerating(false);
    });

    es.onerror = () => {
      es.close();
      setPodcastStatus('Connection lost.');
      setPodcastError(true);
      setGenerating(false);
    };
  };

  return (
    <div className="min-h-screen bg-[#d0d0d0] text-neutral-900">
      {/* Terminal-style header */}
      <header className="border-b border-neutral-800 bg-[#1a1a1a] font-mono">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Learnspace home">
            <Image
              src="/learnspacelogo.svg"
              alt=""
              width={28}
              height={28}
              className="opacity-95"
              style={{ filter: 'invert(0.55) sepia(1) saturate(4) hue-rotate(350deg) brightness(1.05)' }}
            />
          </Link>
          <span className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#e07850]" aria-hidden />
            <span className="w-3 h-3 rounded-full bg-neutral-600" aria-hidden />
            <span className="w-3 h-3 rounded-full bg-neutral-600" aria-hidden />
          </span>
          <span className="text-neutral-500 text-sm select-none">user@learnspace:~$</span>
          <span className="text-neutral-300 text-sm">./dashboard</span>
          <span className="flex-1" />
          <Link
            href="/"
            className="text-neutral-500 hover:text-[#e07850] transition-colors text-sm tracking-wide"
          >
            ← home
          </Link>
        </div>
      </header>

      <main
          className="max-w-5xl mx-auto px-6 py-8 relative min-h-[50vh]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
        {/* Status Card - dev panel */}
        <div className="bg-white/60 border-l-4 border-[#e07850] rounded-r-lg p-4 mb-8 flex items-center justify-between flex-wrap gap-2 shadow-sm">
          <div>
            <p className="font-mono font-semibold text-neutral-900 text-sm tracking-tight">
              Table: <span className="text-[#e07850]">LEARNSPACE_BOOKMARKS</span>
            </p>
            <p className="text-neutral-600 text-sm mt-1">
              Database: <code className="font-mono bg-neutral-200/80 text-neutral-800 px-2 py-0.5 rounded text-xs">learnspace.db</code>
              {' — '}
              Add bookmarks below or use the Chrome extension.
            </p>
          </div>
          <button
            onClick={() => fetchBookmarks()}
            disabled={loading}
            className="font-mono text-sm bg-neutral-200 hover:bg-neutral-300 text-neutral-800 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Add Bookmark Form - dev panel */}
        <div className="bg-white/50 rounded-lg p-6 mb-8 border border-neutral-300/80 shadow-sm">
          <h2 className="font-mono text-sm font-semibold text-neutral-800 uppercase tracking-wider mb-4">Add Bookmark</h2>
          <form onSubmit={handleAddBookmark} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              placeholder="URL (required)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
              className="flex-1 font-mono text-sm bg-white border border-neutral-300 rounded px-4 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 font-mono text-sm bg-white border border-neutral-300 rounded px-4 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-[#e07850] hover:brightness-110 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-none uppercase tracking-widest text-sm transition-all"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          {addError && (
            <p className="mt-2 text-sm text-red-600 font-mono">{addError}</p>
          )}
        </div>

        {/* Bookmarks Table - query result style */}
        <div className="bg-white/50 rounded-lg border border-neutral-300/80 overflow-hidden mb-8 shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-2 bg-neutral-100/80">
            <h2 className="font-mono text-sm font-semibold text-neutral-800">
              <span className="text-[#e07850]">SELECT</span> * <span className="text-[#e07850]">FROM</span> LEARNSPACE_BOOKMARKS
              <span className="text-neutral-500 font-normal"> ({bookmarks.length} rows)</span>
            </h2>
            <button
              onClick={handleClearAll}
              disabled={clearing || bookmarks.length === 0}
              className="font-mono text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing…' : 'Clear all'}
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-sm">Loading...</div>
          ) : bookmarks.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-mono text-sm italic">
              No rows yet. Add a bookmark above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-600 border-b border-neutral-200">
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">URL</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">TITLE</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">IR</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookmarks.map((bookmark) => (
                    <tr key={bookmark.ID} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">{bookmark.ID}</td>
                      <td className="px-4 py-3">
                        <a
                          href={bookmark.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#e07850] hover:underline truncate max-w-xs block text-xs"
                        >
                          {bookmark.URL}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-neutral-800 truncate max-w-xs text-xs">
                        {bookmark.TITLE || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {irs[bookmark.ID] ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-xs">✓</span>
                            <button
                              onClick={() => {
                                const ir = irs[bookmark.ID];
                                alert(`IR Summary:\n\n${ir.summary}\n\nTopics: ${ir.keyTopics.join(', ')}\n\nDifficulty: ${ir.difficulty}\nType: ${ir.contentType}`);
                              }}
                              className="text-[#e07850] hover:underline text-xs"
                            >
                              View
                            </button>
                          </div>
                        ) : extractingIR[bookmark.ID] ? (
                          <span className="text-amber-600 text-xs animate-pulse">Extracting...</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400 text-xs animate-pulse">⏳</span>
                            <button
                              onClick={() => handleExtractIR(bookmark)}
                              className="text-neutral-400 hover:text-[#e07850] text-xs"
                              title="Force re-extract"
                            >
                              ↻
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteBookmark(bookmark.URL)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Content Preferences - dev panel */}
        <div className="bg-white/50 rounded-lg p-6 border border-neutral-300/80 mb-8 shadow-sm">
          <button
            onClick={() => setPreferencesOpen(!preferencesOpen)}
            className="flex items-center gap-2 font-mono text-sm font-semibold text-[#e07850] hover:brightness-110 w-full text-left uppercase tracking-wider"
          >
            {preferencesOpen ? '▼' : '▶'} Content preferences
          </button>
          {preferencesOpen && (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Learning style */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {SURVEY_CONFIG.survey.learningStyle.question}
                </label>
                <div className="space-y-2">
                  {SURVEY_CONFIG.survey.learningStyle.options.map(opt => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        preferences.learningStyle === opt.id
                          ? 'border-[#e07850] bg-[#e07850]/10'
                          : 'border-neutral-300 bg-white/60 hover:border-neutral-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="learningStyle"
                        value={opt.id}
                        checked={preferences.learningStyle === opt.id}
                        onChange={() => setPreferences(p => ({ ...p, learningStyle: opt.id as 'verbal' | 'audio' }))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-neutral-900 font-medium">{opt.label}</span>
                        <p className="text-neutral-600 text-xs mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Verbal options */}
              {preferences.learningStyle === 'verbal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      {SURVEY_CONFIG.survey.verbal.textFormat.question}
                    </label>
                    <select
                      value={preferences.textFormat || 'bullet'}
                      onChange={e => setPreferences(p => ({ ...p, textFormat: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
                    >
                      {SURVEY_CONFIG.survey.verbal.textFormat.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      {SURVEY_CONFIG.survey.verbal.jargonLevel.question}
                    </label>
                    <select
                      value={preferences.jargonLevel || 'some'}
                      onChange={e => setPreferences(p => ({ ...p, jargonLevel: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
                    >
                      {SURVEY_CONFIG.survey.verbal.jargonLevel.options.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.label} — {o.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      {SURVEY_CONFIG.survey.verbal.interests.question}
                    </label>
                    {SURVEY_CONFIG.survey.verbal.interests.description && (
                      <p className="text-neutral-600 text-xs mb-2">{SURVEY_CONFIG.survey.verbal.interests.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {SURVEY_CONFIG.survey.verbal.interests.options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(preferences.interests || []).includes(opt)}
                            onChange={() => toggleInterest(opt)}
                            className="rounded border-neutral-300 bg-neutral-100 text-[#e07850] focus:ring-[#e07850]"
                          />
                          <span className="text-sm text-neutral-900">{opt}</span>
                        </label>
                      ))}
                    </div>
                    {SURVEY_CONFIG.survey.verbal.interests.allowCustom && (
                      <input
                        type="text"
                        value={preferences.customInterests || ''}
                        onChange={e => setPreferences(p => ({ ...p, customInterests: e.target.value }))}
                        placeholder="Custom (e.g. Valorant, Cooking)"
                        className="mt-2 w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850] text-sm"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Audio options */}
              {preferences.learningStyle === 'audio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      {SURVEY_CONFIG.survey.audio.podcastLength.question}
                    </label>
                    <select
                      value={preferences.podcastLength || 'medium'}
                      onChange={e => setPreferences(p => ({ ...p, podcastLength: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
                    >
                      {SURVEY_CONFIG.survey.audio.podcastLength.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      {SURVEY_CONFIG.survey.audio.podcastStyle.question}
                    </label>
                    <select
                      value={preferences.podcastStyle || 'educational'}
                      onChange={e => setPreferences(p => ({ ...p, podcastStyle: e.target.value }))}
                      className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
                    >
                      {SURVEY_CONFIG.survey.audio.podcastStyle.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Background */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {SURVEY_CONFIG.survey.background.question}
                </label>
                {SURVEY_CONFIG.survey.background.description && (
                  <p className="text-neutral-600 text-xs mb-2">{SURVEY_CONFIG.survey.background.description}</p>
                )}
                <select
                  value={preferences.background}
                  onChange={e => setPreferences(p => ({ ...p, background: e.target.value }))}
                  className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850]"
                >
                  {SURVEY_CONFIG.survey.background.options.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                {SURVEY_CONFIG.survey.background.allowDetails && (
                  <textarea
                    value={preferences.backgroundDetails || ''}
                    onChange={e => setPreferences(p => ({ ...p, backgroundDetails: e.target.value }))}
                    placeholder={SURVEY_CONFIG.survey.background.detailsPlaceholder}
                    rows={2}
                    className="mt-2 w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850] resize-y"
                  />
                )}
              </div>

              {/* Extra notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {SURVEY_CONFIG.survey.extraNotes.question}
                  {SURVEY_CONFIG.survey.extraNotes.optional && (
                    <span className="text-neutral-500 font-normal ml-1">(optional)</span>
                  )}
                </label>
                {SURVEY_CONFIG.survey.extraNotes.description && (
                  <p className="text-neutral-600 text-xs mb-2">{SURVEY_CONFIG.survey.extraNotes.description}</p>
                )}
                <textarea
                  value={preferences.extraNotes || ''}
                  onChange={e => setPreferences(p => ({ ...p, extraNotes: e.target.value }))}
                  placeholder={SURVEY_CONFIG.survey.extraNotes.placeholder}
                  rows={2}
                  className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850] resize-y"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={contentLoading}
                className="bg-[#e07850] hover:bg-[#c96a40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-none uppercase tracking-wider text-sm transition-all"
              >
                {contentLoading ? 'Generating...' : 'Generate content'}
              </button>

              {contentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
                  {contentError}
                </div>
              )}

              {generatedContent && (
                <div className="mt-4 p-4 bg-neutral-100 border border-neutral-200 rounded-lg">
                  <h3 className="text-sm font-medium text-[#e07850] mb-2">Generated content</h3>
                  <div className="text-neutral-900 text-sm whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                    {generatedContent}
                  </div>
                </div>
              )}

              {generatedPodcastUrl && preferences.learningStyle === 'audio' && (
                <div className="mt-4 p-4 bg-neutral-100 border border-neutral-200 rounded-lg">
                  <h3 className="text-sm font-medium text-[#e07850] mb-2">Generated podcast</h3>
                  <audio src={generatedPodcastUrl} controls className="w-full max-w-md" />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Learning Clusters */}
        <div className="bg-white/50 rounded-lg border border-neutral-300/80 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-mono text-sm font-semibold text-[#e07850] uppercase tracking-wider mb-1">Learning Clusters</h2>
              <p className="text-neutral-600 text-sm">
                AI-generated groups of related content based on semantic similarity
              </p>
            </div>
            <button
              onClick={handleGenerateClusters}
              disabled={generatingClusters || Object.keys(irs).length < 1}
              className="bg-[#e07850] hover:bg-[#c96a40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              title={Object.keys(irs).length < 1 ? 'Add at least one bookmark and extract its IR first' : ''}
            >
              {generatingClusters ? 'Generating...' : clusters.length > 0 ? 'Regenerate Clusters' : 'Generate Clusters'}
            </button>
          </div>

          {clusterError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
              {clusterError}
            </div>
          )}

          {clusters.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 italic">
              No clusters yet. Generate clusters from your IRs to see related content grouped together.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-neutral-100 rounded-lg p-4 border border-neutral-300/80">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-neutral-800">{cluster.name}</h3>
                    <span className="text-xs bg-[#e07850]/20 text-[#e07850] px-2 py-1 rounded">
                      {cluster.memberCount} {cluster.memberCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-sm mb-3">{cluster.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {cluster.aggregatedTopics.slice(0, 5).map((topic, idx) => (
                      <span key={idx} className="text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Difficulty: <span className="text-neutral-600">{cluster.avgDifficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Generation (per cluster) */}
        <div className="bg-white/50 rounded-lg border border-neutral-300/80 shadow-sm p-6 mb-8">
          <div className="mb-4">
            <h2 className="font-mono text-sm font-semibold text-[#e07850] uppercase tracking-wider mb-1">Content Generation</h2>
            <p className="text-neutral-600 text-sm">
              Generate personalized study content for each learning cluster. Uses your content preferences and references articles meaningfully.
            </p>
          </div>

          {clusters.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 italic">
              Generate clusters first to create content for each group.
            </div>
          ) : (
            <div className="space-y-6">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-neutral-100 rounded-lg p-5 border border-neutral-300/80">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold text-neutral-800">{cluster.name}</h3>
                      <p className="text-neutral-600 text-sm mt-0.5">{cluster.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateClusterContent(cluster.id)}
                      disabled={clusterContentLoading[cluster.id]}
                      className="shrink-0 bg-[#e07850] hover:bg-[#c96a40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-none uppercase tracking-wider text-sm transition-all"
                    >
                      {clusterContentLoading[cluster.id] ? 'Generating…' : clusterContents[cluster.id] ? 'Regenerate' : 'Generate content'}
                    </button>
                  </div>

                  {clusterContentStatus[cluster.id] && !clusterContentError[cluster.id] && (
                    <div className="mb-3 p-3 bg-[#e07850]/10 border border-[#e07850]/20 rounded text-[#e07850] text-sm">
                      {clusterContentStatus[cluster.id]}
                    </div>
                  )}

                  {clusterContentError[cluster.id] && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-600 text-sm">
                      {clusterContentError[cluster.id]}
                    </div>
                  )}

                  {clusterContents[cluster.id] && (
                    <div className="mt-4 space-y-3">
                      {clusterContents[cluster.id].podcastUrl ? (
                        <div>
                          <h4 className="text-xs font-medium text-[#e07850] uppercase tracking-wider mb-2">Podcast</h4>
                          <audio
                            src={clusterContents[cluster.id].podcastUrl}
                            controls
                            className="w-full max-w-md"
                          />
                        </div>
                      ) : clusterContents[cluster.id].content ? (
                        <div className="p-4 bg-neutral-100 rounded-lg border border-neutral-200">
                          <div className="text-neutral-900 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {clusterContents[cluster.id].content}
                          </div>
                        </div>
                      ) : null}
                      {clusterContents[cluster.id].sources.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[#e07850] uppercase tracking-wider mb-2">References</h4>
                          <ul className="space-y-1.5">
                            {clusterContents[cluster.id].sources.map((src, idx) => (
                              <li key={idx} className="text-sm">
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#e07850] hover:text-[#e89070] hover:underline break-all"
                                >
                                  {src.title || src.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-3 border-t border-neutral-200 mt-3">
                        <button
                          type="button"
                          onClick={() => handleGenerateClusterFlashcards(cluster.id)}
                          disabled={clusterFlashcardLoading[cluster.id]}
                          className="text-sm bg-neutral-200 hover:bg-neutral-300 text-neutral-900 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {clusterFlashcardLoading[cluster.id] ? 'Generating…' : clusterFlashcards[cluster.id] ? 'Regenerate flashcards' : 'Generate flashcards'}
                        </button>
                        {clusterFlashcardError[cluster.id] && (
                          <p className="text-red-600 text-xs mt-2">{clusterFlashcardError[cluster.id]}</p>
                        )}
                        {clusterFlashcards[cluster.id]?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {clusterFlashcards[cluster.id].map((fc, idx) => (
                              <details key={idx} className="bg-neutral-100 rounded-lg border border-neutral-200">
                                <summary className="px-3 py-2 cursor-pointer text-sm text-neutral-900 hover:bg-neutral-100 rounded-lg">
                                  Q: {fc.question}
                                </summary>
                                <div className="px-3 py-2 text-sm text-neutral-600 border-t border-neutral-200">
                                  A: {fc.answer}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Podcast Generator */}
        <div className="bg-white/50 rounded-lg border border-neutral-300/80 shadow-sm p-6 mb-8">
          <h2 className="font-mono text-sm font-semibold text-[#e07850] uppercase tracking-wider mb-2">Generate Podcast</h2>
          <p className="text-neutral-600 text-sm mb-4">
            Turn your Learnspace bookmarks into a short podcast with Wondercraft AI (two hosts, Convo Mode).
          </p>
          
          <button
            onClick={generatePodcast}
            disabled={generating || bookmarks.length === 0}
            className="bg-[#e07850] hover:bg-[#c96a40] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {generating ? 'Generating…' : 'Generate Podcast'}
          </button>

          {podcastStatus && (
            <p className={`mt-3 text-sm ${podcastError ? 'text-red-600' : 'text-neutral-600'}`}>
              {podcastStatus}
            </p>
          )}

          {podcastUrl && (
            <audio 
              src={podcastUrl} 
              controls 
              autoPlay
              className="mt-4 w-full max-w-md"
              onEnded={() => setPodcastStatus('Podcast finished.')}
            />
          )}
        </div>

        {/* Gemini Chat */}
        <div className="bg-white/50 rounded-lg border border-neutral-300/80 shadow-sm p-6">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 font-mono text-sm font-semibold text-[#e07850] uppercase tracking-wider hover:brightness-110"
          >
            {chatOpen ? '▼' : '▶'} Gemini Chat (test API key)
          </button>
          {chatOpen && (
            <div className="mt-4">
              <div className="h-48 overflow-y-auto rounded-lg bg-neutral-200 p-3 font-mono text-sm mb-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-neutral-500">Say hello to test your Gemini API key.</p>
                ) : (
                  chatMessages.map((m, i) => (
                    <div
                      key={i}
                      className={m.role === 'user' ? 'text-right' : 'text-left'}
                    >
                      <span className={m.role === 'user' ? 'text-[#e07850]' : 'text-neutral-900'}>
                        {m.role === 'user' ? 'You: ' : 'Gemini: '}
                      </span>
                      <span className="text-neutral-700 whitespace-pre-wrap">{m.text}</span>
                    </div>
                  ))
                )}
                {chatLoading && <p className="text-neutral-500">Thinking…</p>}
              </div>
              {chatError && <p className="text-red-600 text-sm mb-2">{chatError}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                  placeholder="Type a message..."
                  disabled={chatLoading}
                  className="flex-1 bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#e07850] focus:ring-1 focus:ring-[#e07850] disabled:opacity-50"
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-[#e07850] hover:bg-[#c96a40] disabled:opacity-50 text-white px-4 py-2 rounded-none uppercase tracking-wider font-mono text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
