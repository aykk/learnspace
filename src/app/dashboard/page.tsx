'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      setClusters(data.clusters || []);
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
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#16162a]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#29b5e8]">❄️ Learnspace Dashboard</h1>
          <Link 
            href="/" 
            className="text-white/70 hover:text-white transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Status Card */}
        <div className="bg-[#29b5e8]/10 border-l-4 border-[#29b5e8] rounded-r-lg p-4 mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-[#29b5e8]">Table: LEARNSPACE_BOOKMARKS</p>
            <p className="text-white/60 text-sm mt-1">
              Database: <code className="bg-white/10 px-2 py-0.5 rounded">learnspace.db</code> — 
              Add bookmarks below or use the Chrome extension.
            </p>
          </div>
          <button
            onClick={() => fetchBookmarks()}
            disabled={loading}
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Add Bookmark Form */}
        <div className="bg-[#16162a] rounded-xl p-6 mb-8 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Add Bookmark</h2>
          <form onSubmit={handleAddBookmark} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              placeholder="URL (required)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8]"
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8]"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          {addError && (
            <p className="mt-2 text-sm text-red-400">{addError}</p>
          )}
        </div>

        {/* Bookmarks Table */}
        <div className="bg-[#16162a] rounded-xl border border-white/10 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              SELECT * FROM LEARNSPACE_BOOKMARKS ({bookmarks.length} rows)
            </h2>
            <button
              onClick={handleClearAll}
              disabled={clearing || bookmarks.length === 0}
              className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing…' : 'Clear all bookmarks'}
            </button>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-white/50">Loading...</div>
          ) : bookmarks.length === 0 ? (
            <div className="p-8 text-center text-white/50 italic">
              No rows yet. Add a bookmark above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-white/70">
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">URL</th>
                    <th className="px-4 py-3 text-left font-semibold">TITLE</th>
                    <th className="px-4 py-3 text-left font-semibold">IR Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookmarks.map((bookmark) => (
                    <tr key={bookmark.ID} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white/60">{bookmark.ID}</td>
                      <td className="px-4 py-3">
                        <a 
                          href={bookmark.URL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#29b5e8] hover:underline truncate max-w-xs block"
                        >
                          {bookmark.URL}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-white/80 truncate max-w-xs">
                        {bookmark.TITLE || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {irs[bookmark.ID] ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 text-xs">✓ Extracted</span>
                            <button
                              onClick={() => {
                                const ir = irs[bookmark.ID];
                                alert(`IR Summary:\n\n${ir.summary}\n\nTopics: ${ir.keyTopics.join(', ')}\n\nDifficulty: ${ir.difficulty}\nType: ${ir.contentType}`);
                              }}
                              className="text-[#29b5e8] hover:underline text-xs"
                            >
                              View
                            </button>
                          </div>
                        ) : extractingIR[bookmark.ID] ? (
                          <span className="text-yellow-400 text-xs animate-pulse">Extracting...</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400/70 text-xs animate-pulse">⏳ Processing...</span>
                            <button
                              onClick={() => handleExtractIR(bookmark)}
                              className="text-white/40 hover:text-[#29b5e8] text-xs"
                              title="Force re-extract"
                            >
                              ↻
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => handleDeleteBookmark(bookmark.URL)}
                          className="text-red-400 hover:text-red-300 text-xs"
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

        {/* User Content Preferences */}
        <div className="bg-[#16162a] rounded-xl p-6 border border-white/10 mb-8">
          <button
            onClick={() => setPreferencesOpen(!preferencesOpen)}
            className="flex items-center gap-2 text-lg font-semibold text-[#29b5e8] hover:text-[#1e9fd4] w-full text-left"
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
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {SURVEY_CONFIG.survey.learningStyle.question}
                </label>
                <div className="space-y-2">
                  {SURVEY_CONFIG.survey.learningStyle.options.map(opt => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        preferences.learningStyle === opt.id
                          ? 'border-[#29b5e8] bg-[#29b5e8]/10'
                          : 'border-white/20 bg-white/5 hover:border-white/30'
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
                        <span className="text-white font-medium">{opt.label}</span>
                        <p className="text-white/60 text-xs mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Verbal options */}
              {preferences.learningStyle === 'verbal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      {SURVEY_CONFIG.survey.verbal.textFormat.question}
                    </label>
                    <select
                      value={preferences.textFormat || 'bullet'}
                      onChange={e => setPreferences(p => ({ ...p, textFormat: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#29b5e8]"
                    >
                      {SURVEY_CONFIG.survey.verbal.textFormat.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      {SURVEY_CONFIG.survey.verbal.jargonLevel.question}
                    </label>
                    <select
                      value={preferences.jargonLevel || 'some'}
                      onChange={e => setPreferences(p => ({ ...p, jargonLevel: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#29b5e8]"
                    >
                      {SURVEY_CONFIG.survey.verbal.jargonLevel.options.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.label} — {o.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      {SURVEY_CONFIG.survey.verbal.interests.question}
                    </label>
                    {SURVEY_CONFIG.survey.verbal.interests.description && (
                      <p className="text-white/60 text-xs mb-2">{SURVEY_CONFIG.survey.verbal.interests.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {SURVEY_CONFIG.survey.verbal.interests.options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(preferences.interests || []).includes(opt)}
                            onChange={() => toggleInterest(opt)}
                            className="rounded border-white/30 bg-white/5 text-[#29b5e8] focus:ring-[#29b5e8]"
                          />
                          <span className="text-sm text-white/90">{opt}</span>
                        </label>
                      ))}
                    </div>
                    {SURVEY_CONFIG.survey.verbal.interests.allowCustom && (
                      <input
                        type="text"
                        value={preferences.customInterests || ''}
                        onChange={e => setPreferences(p => ({ ...p, customInterests: e.target.value }))}
                        placeholder="Custom (e.g. Valorant, Cooking)"
                        className="mt-2 w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8] text-sm"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Audio options */}
              {preferences.learningStyle === 'audio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      {SURVEY_CONFIG.survey.audio.podcastLength.question}
                    </label>
                    <select
                      value={preferences.podcastLength || 'medium'}
                      onChange={e => setPreferences(p => ({ ...p, podcastLength: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#29b5e8]"
                    >
                      {SURVEY_CONFIG.survey.audio.podcastLength.options.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      {SURVEY_CONFIG.survey.audio.podcastStyle.question}
                    </label>
                    <select
                      value={preferences.podcastStyle || 'educational'}
                      onChange={e => setPreferences(p => ({ ...p, podcastStyle: e.target.value }))}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#29b5e8]"
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
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {SURVEY_CONFIG.survey.background.question}
                </label>
                {SURVEY_CONFIG.survey.background.description && (
                  <p className="text-white/60 text-xs mb-2">{SURVEY_CONFIG.survey.background.description}</p>
                )}
                <select
                  value={preferences.background}
                  onChange={e => setPreferences(p => ({ ...p, background: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#29b5e8]"
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
                    className="mt-2 w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8] resize-y"
                  />
                )}
              </div>

              {/* Extra notes */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {SURVEY_CONFIG.survey.extraNotes.question}
                  {SURVEY_CONFIG.survey.extraNotes.optional && (
                    <span className="text-white/50 font-normal ml-1">(optional)</span>
                  )}
                </label>
                {SURVEY_CONFIG.survey.extraNotes.description && (
                  <p className="text-white/60 text-xs mb-2">{SURVEY_CONFIG.survey.extraNotes.description}</p>
                )}
                <textarea
                  value={preferences.extraNotes || ''}
                  onChange={e => setPreferences(p => ({ ...p, extraNotes: e.target.value }))}
                  placeholder={SURVEY_CONFIG.survey.extraNotes.placeholder}
                  rows={2}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8] resize-y"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={contentLoading}
                className="bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {contentLoading ? 'Generating...' : 'Generate content'}
              </button>

              {contentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                  {contentError}
                </div>
              )}

              {generatedContent && (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <h3 className="text-sm font-medium text-[#29b5e8] mb-2">Generated content</h3>
                  <div className="text-white/90 text-sm whitespace-pre-wrap font-sans max-h-96 overflow-y-auto">
                    {generatedContent}
                  </div>
                </div>
              )}

              {generatedPodcastUrl && preferences.learningStyle === 'audio' && (
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <h3 className="text-sm font-medium text-[#29b5e8] mb-2">Generated podcast</h3>
                  <audio src={generatedPodcastUrl} controls className="w-full max-w-md" />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Learning Clusters */}
        <div className="bg-[#16162a] rounded-xl p-6 border border-white/10 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#29b5e8] mb-1">🧩 Learning Clusters</h2>
              <p className="text-white/60 text-sm">
                AI-generated groups of related content based on semantic similarity
              </p>
            </div>
            <button
              onClick={handleGenerateClusters}
              disabled={generatingClusters || Object.keys(irs).length < 1}
              className="bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
              title={Object.keys(irs).length < 1 ? 'Add at least one bookmark and extract its IR first' : ''}
            >
              {generatingClusters ? 'Generating...' : clusters.length > 0 ? 'Regenerate Clusters' : 'Generate Clusters'}
            </button>
          </div>

          {clusterError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {clusterError}
            </div>
          )}

          {clusters.length === 0 ? (
            <div className="text-center py-8 text-white/50 italic">
              No clusters yet. Generate clusters from your IRs to see related content grouped together.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{cluster.name}</h3>
                    <span className="text-xs bg-[#29b5e8]/20 text-[#29b5e8] px-2 py-1 rounded">
                      {cluster.memberCount} {cluster.memberCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm mb-3">{cluster.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {cluster.aggregatedTopics.slice(0, 5).map((topic, idx) => (
                      <span key={idx} className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-white/50">
                    Difficulty: <span className="text-white/70">{cluster.avgDifficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Generation (per cluster) */}
        <div className="bg-[#16162a] rounded-xl p-6 border border-white/10 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#29b5e8] mb-1">✨ Content Generation</h2>
            <p className="text-white/60 text-sm">
              Generate personalized study content for each learning cluster. Uses your content preferences and references articles meaningfully.
            </p>
          </div>

          {clusters.length === 0 ? (
            <div className="text-center py-8 text-white/50 italic">
              Generate clusters first to create content for each group.
            </div>
          ) : (
            <div className="space-y-6">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-white/5 rounded-lg p-5 border border-white/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{cluster.name}</h3>
                      <p className="text-white/60 text-sm mt-0.5">{cluster.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateClusterContent(cluster.id)}
                      disabled={clusterContentLoading[cluster.id]}
                      className="shrink-0 bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {clusterContentLoading[cluster.id] ? 'Generating…' : clusterContents[cluster.id] ? 'Regenerate' : 'Generate content'}
                    </button>
                  </div>

                  {clusterContentStatus[cluster.id] && !clusterContentError[cluster.id] && (
                    <div className="mb-3 p-3 bg-[#29b5e8]/10 border border-[#29b5e8]/20 rounded text-[#29b5e8] text-sm">
                      {clusterContentStatus[cluster.id]}
                    </div>
                  )}

                  {clusterContentError[cluster.id] && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                      {clusterContentError[cluster.id]}
                    </div>
                  )}

                  {clusterContents[cluster.id] && (
                    <div className="mt-4 space-y-3">
                      {clusterContents[cluster.id].podcastUrl ? (
                        <div>
                          <h4 className="text-xs font-medium text-[#29b5e8] uppercase tracking-wider mb-2">Podcast</h4>
                          <audio
                            src={clusterContents[cluster.id].podcastUrl}
                            controls
                            className="w-full max-w-md"
                          />
                        </div>
                      ) : clusterContents[cluster.id].content ? (
                        <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                          <div className="text-white/90 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {clusterContents[cluster.id].content}
                          </div>
                        </div>
                      ) : null}
                      {clusterContents[cluster.id].sources.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-[#29b5e8] uppercase tracking-wider mb-2">References</h4>
                          <ul className="space-y-1.5">
                            {clusterContents[cluster.id].sources.map((src, idx) => (
                              <li key={idx} className="text-sm">
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#29b5e8] hover:text-[#5dc9f0] hover:underline break-all"
                                >
                                  {src.title || src.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-3 border-t border-white/10 mt-3">
                        <button
                          type="button"
                          onClick={() => handleGenerateClusterFlashcards(cluster.id)}
                          disabled={clusterFlashcardLoading[cluster.id]}
                          className="text-sm bg-white/10 hover:bg-white/20 text-white/90 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {clusterFlashcardLoading[cluster.id] ? 'Generating…' : clusterFlashcards[cluster.id] ? 'Regenerate flashcards' : 'Generate flashcards'}
                        </button>
                        {clusterFlashcardError[cluster.id] && (
                          <p className="text-red-400 text-xs mt-2">{clusterFlashcardError[cluster.id]}</p>
                        )}
                        {clusterFlashcards[cluster.id]?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {clusterFlashcards[cluster.id].map((fc, idx) => (
                              <details key={idx} className="bg-black/20 rounded-lg border border-white/5">
                                <summary className="px-3 py-2 cursor-pointer text-sm text-white/90 hover:bg-white/5 rounded-lg">
                                  Q: {fc.question}
                                </summary>
                                <div className="px-3 py-2 text-sm text-white/70 border-t border-white/5">
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
        <div className="bg-[#16162a] rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-[#29b5e8] mb-2">🎙️ Generate Podcast</h2>
          <p className="text-white/60 text-sm mb-4">
            Turn your Learnspace bookmarks into a short podcast with Wondercraft AI (two hosts, Convo Mode).
          </p>
          
          <button
            onClick={generatePodcast}
            disabled={generating || bookmarks.length === 0}
            className="bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {generating ? 'Generating…' : 'Generate Podcast'}
          </button>

          {podcastStatus && (
            <p className={`mt-3 text-sm ${podcastError ? 'text-red-400' : 'text-white/70'}`}>
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
        <div className="bg-[#16162a] rounded-xl p-6 border border-white/10">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 text-lg font-semibold text-[#29b5e8] hover:text-[#1e9fd4]"
          >
            {chatOpen ? '▼' : '▶'} Gemini Chat (test API key)
          </button>
          {chatOpen && (
            <div className="mt-4">
              <div className="h-48 overflow-y-auto rounded-lg bg-black/20 p-3 text-sm mb-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="text-white/50">Say hello to test your Gemini API key.</p>
                ) : (
                  chatMessages.map((m, i) => (
                    <div
                      key={i}
                      className={m.role === 'user' ? 'text-right' : 'text-left'}
                    >
                      <span className={m.role === 'user' ? 'text-[#29b5e8]' : 'text-white/90'}>
                        {m.role === 'user' ? 'You: ' : 'Gemini: '}
                      </span>
                      <span className="text-white/80 whitespace-pre-wrap">{m.text}</span>
                    </div>
                  ))
                )}
                {chatLoading && <p className="text-white/50">Thinking…</p>}
              </div>
              {chatError && <p className="text-red-400 text-sm mb-2">{chatError}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                  placeholder="Type a message..."
                  disabled={chatLoading}
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#29b5e8] disabled:opacity-50"
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 text-white px-4 py-2 rounded-lg"
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
