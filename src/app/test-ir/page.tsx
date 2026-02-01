'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestIRPage() {
  const [bookmarkId, setBookmarkId] = useState('1');
  const [url, setUrl] = useState('https://react.dev/learn');
  const [title, setTitle] = useState('React Documentation');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/ir/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarkId: Number(bookmarkId),
          url,
          title,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to extract IR');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#29b5e8]">
            ❄️ IR Extraction Test
          </h1>
          <Link
            href="/dashboard"
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#16162a] rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">
            Extract Intermediate Representation
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Bookmark ID
              </label>
              <input
                type="number"
                value={bookmarkId}
                onChange={(e) => setBookmarkId(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <button
              onClick={handleExtract}
              disabled={loading}
              className="w-full bg-[#29b5e8] hover:bg-[#1e9fd4] disabled:opacity-50 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? 'Extracting IR...' : 'Extract IR'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-[#16162a] rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-green-400">
              ✓ {result.message}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-2">
                  Summary
                </h3>
                <p className="text-white/90">{result.ir.summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-2">
                  Key Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.ir.keyTopics.map((topic: string, i: number) => (
                    <span
                      key={i}
                      className="bg-[#29b5e8]/20 text-[#29b5e8] px-3 py-1 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-2">
                  Concepts
                </h3>
                <div className="space-y-2">
                  {result.ir.concepts.map((concept: any, i: number) => (
                    <div
                      key={i}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{concept.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            concept.importance === 'high'
                              ? 'bg-red-500/20 text-red-400'
                              : concept.importance === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {concept.importance}
                        </span>
                      </div>
                      <p className="text-sm text-white/70">
                        {concept.description}
                      </p>
                      {concept.relatedConcepts?.length > 0 && (
                        <div className="mt-2 text-xs text-white/50">
                          Related: {concept.relatedConcepts.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-1">
                    Difficulty
                  </h3>
                  <p className="text-white/90 capitalize">
                    {result.ir.difficulty}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-1">
                    Content Type
                  </h3>
                  <p className="text-white/90 capitalize">
                    {result.ir.contentType}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-1">
                    Read Time
                  </h3>
                  <p className="text-white/90">
                    {result.ir.estimatedReadTime
                      ? `${result.ir.estimatedReadTime} min`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <details className="text-sm">
                  <summary className="cursor-pointer text-white/70 hover:text-white">
                    View Raw JSON
                  </summary>
                  <pre className="mt-2 bg-black/30 p-4 rounded overflow-x-auto text-xs">
                    {JSON.stringify(result.ir, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
