'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Bookmark {
  ID: number;
  URL: string;
  TITLE: string | null;
  DATE_ADDED: string | null;
  _LOAD_TIME: string;
}

export default function Dashboard() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [podcastStatus, setPodcastStatus] = useState('');
  const [podcastError, setPodcastError] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  // Form state for adding bookmarks
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchBookmarks = async () => {
    try {
      const res = await fetch('/api/bookmarks');
      const data = await res.json();
      // Ensure we always set an array, even if API returns an error object
      setBookmarks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setAdding(true);
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

      if (res.ok) {
        setNewUrl('');
        setNewTitle('');
        fetchBookmarks();
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error);
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
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const generatePodcast = () => {
    setGenerating(true);
    setPodcastStatus('Starting…');
    setPodcastError(false);
    setPodcastUrl('');

    const es = new EventSource('/api/podcast/generate');

    es.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setPodcastStatus(data.msg);
      setPodcastError(false);
    });

    es.addEventListener('done', (e) => {
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

    es.addEventListener('error', (e) => {
      es.close();
      try {
        const data = JSON.parse(e.data);
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
        <div className="bg-[#29b5e8]/10 border-l-4 border-[#29b5e8] rounded-r-lg p-4 mb-8">
          <p className="font-semibold text-[#29b5e8]">Table: LEARNSPACE_BOOKMARKS</p>
          <p className="text-white/60 text-sm mt-1">
            Database: <code className="bg-white/10 px-2 py-0.5 rounded">learnspace.db</code> — 
            Add bookmarks below or use the Chrome extension.
          </p>
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
        </div>

        {/* Bookmarks Table */}
        <div className="bg-[#16162a] rounded-xl border border-white/10 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">
              SELECT * FROM LEARNSPACE_BOOKMARKS ({bookmarks.length} rows)
            </h2>
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
                    <th className="px-4 py-3 text-left font-semibold">DATE_ADDED</th>
                    <th className="px-4 py-3 text-left font-semibold">_LOAD_TIME</th>
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
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {bookmark.DATE_ADDED || '—'}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {bookmark._LOAD_TIME}
                      </td>
                      <td className="px-4 py-3">
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
      </main>
    </div>
  );
}
