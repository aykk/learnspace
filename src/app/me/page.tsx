"use client";

import { useState } from "react";
import Link from "next/link";

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
  size: number; // 1-5 scale based on content amount
}

// Mock cluster data
const mockClusters: Cluster[] = [
  {
    id: "1",
    name: "Machine Learning Fundamentals",
    color: "#e07850",
    size: 5,
    links: [
      { id: "1a", title: "Introduction to Neural Networks", url: "https://example.com/nn-intro", source: "Medium" },
      { id: "1b", title: "Understanding Gradient Descent", url: "https://example.com/gradient", source: "Towards Data Science" },
      { id: "1c", title: "A Beginner's Guide to TensorFlow", url: "https://example.com/tf-guide", source: "TensorFlow Blog" },
      { id: "1d", title: "Deep Learning vs Machine Learning", url: "https://example.com/dl-vs-ml", source: "Analytics Vidhya" },
      { id: "1e", title: "Practical ML with Python", url: "https://example.com/ml-python", source: "Real Python" },
    ],
    summary: "A comprehensive collection exploring the foundations of machine learning, from basic neural network architectures to practical implementation with Python frameworks. Covers gradient descent optimization, the distinction between deep learning and traditional ML approaches.",
    concepts: ["Neural Networks", "Gradient Descent", "TensorFlow", "Deep Learning", "Supervised Learning"],
  },
  {
    id: "2",
    name: "Web Performance",
    color: "#6b8e7d",
    size: 3,
    links: [
      { id: "2a", title: "Core Web Vitals Explained", url: "https://example.com/cwv", source: "web.dev" },
      { id: "2b", title: "Lazy Loading Images", url: "https://example.com/lazy-load", source: "CSS-Tricks" },
      { id: "2c", title: "Optimizing JavaScript Bundles", url: "https://example.com/js-bundles", source: "Smashing Magazine" },
    ],
    summary: "Resources focused on improving web application performance, including Google's Core Web Vitals metrics, image optimization strategies, and JavaScript bundle size reduction techniques.",
    concepts: ["Core Web Vitals", "Lazy Loading", "Bundle Optimization", "LCP", "FID"],
  },
  {
    id: "3",
    name: "Design Systems",
    color: "#7d6b8e",
    size: 4,
    links: [
      { id: "3a", title: "Building a Design System from Scratch", url: "https://example.com/design-system", source: "Figma Blog" },
      { id: "3b", title: "Component Library Best Practices", url: "https://example.com/component-lib", source: "Storybook" },
      { id: "3c", title: "Design Tokens Explained", url: "https://example.com/tokens", source: "Adobe Spectrum" },
      { id: "3d", title: "Accessibility in Design Systems", url: "https://example.com/a11y-design", source: "Inclusive Components" },
    ],
    summary: "A deep dive into creating and maintaining design systems, covering component architecture, design tokens for consistent theming, and ensuring accessibility throughout the system.",
    concepts: ["Component Architecture", "Design Tokens", "Accessibility", "Documentation", "Figma"],
  },
  {
    id: "4",
    name: "TypeScript Patterns",
    color: "#5a7d9a",
    size: 2,
    links: [
      { id: "4a", title: "Advanced TypeScript Types", url: "https://example.com/ts-types", source: "TypeScript Handbook" },
      { id: "4b", title: "Utility Types Deep Dive", url: "https://example.com/utility-types", source: "Matt Pocock" },
    ],
    summary: "Exploration of advanced TypeScript patterns and utility types for building type-safe applications with better developer experience.",
    concepts: ["Generics", "Utility Types", "Type Guards", "Conditional Types"],
  },
  {
    id: "5",
    name: "Startup Strategy",
    color: "#9a7d5a",
    size: 3,
    links: [
      { id: "5a", title: "Product-Market Fit Guide", url: "https://example.com/pmf", source: "Y Combinator" },
      { id: "5b", title: "Lean Startup Methodology", url: "https://example.com/lean", source: "Eric Ries" },
      { id: "5c", title: "Building MVPs That Matter", url: "https://example.com/mvp", source: "First Round Review" },
    ],
    summary: "Essential readings on startup strategy, focusing on achieving product-market fit, lean development practices, and building meaningful minimum viable products.",
    concepts: ["Product-Market Fit", "MVP", "Lean Startup", "Customer Development"],
  },
  {
    id: "6",
    name: "Cognitive Science",
    color: "#8e6b7d",
    size: 2,
    links: [
      { id: "6a", title: "How Memory Works", url: "https://example.com/memory", source: "Scientific American" },
      { id: "6b", title: "Spaced Repetition Systems", url: "https://example.com/srs", source: "Gwern" },
    ],
    summary: "Fascinating insights into how human memory and learning work, with practical applications like spaced repetition for better retention.",
    concepts: ["Memory", "Spaced Repetition", "Learning", "Cognitive Load"],
  },
];

export default function Dashboard() {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  const handleClusterClick = (cluster: Cluster) => {
    setSelectedCluster(selectedCluster?.id === cluster.id ? null : cluster);
  };

  // Calculate cluster positions in a natural-looking arrangement
  const getClusterPosition = (index: number, total: number) => {
    const positions = [
      { x: 45, y: 35 },
      { x: 60, y: 55 },
      { x: 35, y: 60 },
      { x: 55, y: 25 },
      { x: 25, y: 40 },
      { x: 50, y: 70 },
    ];
    return positions[index % positions.length];
  };

  const getClusterSize = (size: number) => {
    const baseSize = 80;
    return baseSize + (size * 30);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#d0d0d0] flex">
      {/* NOISE TEXTURE OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.5] mix-blend-overlay">
        <svg className="h-full w-full">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.5"
              numOctaves="5"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* SECONDARY GRAIN LAYER */}
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.25] mix-blend-multiply">
        <svg className="h-full w-full">
          <filter id="noiseFilter2">
            <feTurbulence
              type="turbulence"
              baseFrequency="2.5"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter2)" />
        </svg>
      </div>

      {/* LEFT SIDEBAR - Cluster List */}
      <aside className="relative z-30 w-64 min-h-screen bg-white/20 backdrop-blur-sm border-r border-neutral-300/50 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-neutral-300/50">
          <Link 
            href="/"
            className="text-neutral-900/80 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight"
          >
            Learnspace<span style={{ color: "#e07850" }}>.</span>
          </Link>
          <p className="text-neutral-600 text-xs font-[family-name:var(--font-body)] mt-1">
            Your learning dashboard
          </p>
        </div>

        {/* Clusters List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 font-[family-name:var(--font-body)]">
            My Clusters
          </h3>
          <div className="space-y-2">
            {mockClusters.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => handleClusterClick(cluster)}
                className={`w-full text-left px-3 py-3 rounded-sm transition-all duration-300 group ${
                  selectedCluster?.id === cluster.id
                    ? "bg-white/60"
                    : "hover:bg-white/40"
                }`}
                style={{
                  boxShadow: selectedCluster?.id === cluster.id
                    ? `0 0 0 1px ${cluster.color}40, 0 0 15px ${cluster.color}20`
                    : "none"
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="text-sm text-neutral-800 font-[family-name:var(--font-body)] truncate">
                    {cluster.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <span className="text-xs text-neutral-500 font-[family-name:var(--font-body)]">
                    {cluster.links.length} links
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Add New */}
        <div className="p-4 border-t border-neutral-300/50">
          <button className="w-full px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 font-[family-name:var(--font-body)] transition-colors duration-200 flex items-center justify-center gap-2">
            <span className="text-lg">+</span> Add Link
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT - Cluster Visualization */}
      <main className={`relative z-30 flex-1 min-h-screen transition-all duration-500 ${selectedCluster ? 'mr-80' : ''}`}>
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900/80 font-[family-name:var(--font-display)]">
              My Learnspace
            </h1>
            <p className="text-sm text-neutral-600 font-[family-name:var(--font-body)]">
              {mockClusters.length} clusters • {mockClusters.reduce((acc, c) => acc + c.links.length, 0)} total links
            </p>
          </div>
        </header>

        {/* Cluster Visualization Area */}
        <div className="relative w-full h-screen overflow-hidden">
          {/* Background gradient */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* Clusters */}
          {mockClusters.map((cluster, index) => {
            const pos = getClusterPosition(index, mockClusters.length);
            const size = getClusterSize(cluster.size);
            const isSelected = selectedCluster?.id === cluster.id;
            const isHovered = hoveredCluster === cluster.id;

            return (
              <button
                key={cluster.id}
                onClick={() => handleClusterClick(cluster)}
                onMouseEnter={() => setHoveredCluster(cluster.id)}
                onMouseLeave={() => setHoveredCluster(null)}
                className="absolute transition-all duration-500 ease-out cursor-pointer group"
                style={{
                  left: isSelected ? '50%' : `${pos.x}%`,
                  top: isSelected ? '50%' : `${pos.y}%`,
                  transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : isHovered ? 1.1 : 1})`,
                  zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                }}
              >
                {/* Outer glow */}
                <div
                  className="absolute inset-0 rounded-full transition-opacity duration-300"
                  style={{
                    width: size + 40,
                    height: size + 40,
                    left: -20,
                    top: -20,
                    background: `radial-gradient(circle, ${cluster.color}30 0%, ${cluster.color}10 50%, transparent 70%)`,
                    opacity: isSelected || isHovered ? 1 : 0.5,
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
                    boxShadow: isSelected 
                      ? `0 0 0 3px white, 0 0 40px ${cluster.color}60, 0 20px 60px ${cluster.color}40`
                      : `0 10px 40px ${cluster.color}30`,
                  }}
                >
                  {/* Inner highlight */}
                  <div 
                    className="absolute top-[15%] left-[20%] w-[30%] h-[20%] rounded-full"
                    style={{
                      background: "radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%)",
                    }}
                  />
                  
                  {/* Cluster name */}
                  <span 
                    className="text-white font-[family-name:var(--font-display)] text-center px-4 leading-tight"
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
              </button>
            );
          })}
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
            {/* Header */}
            <div className="p-6 border-b border-neutral-300/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
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
                      <p className="text-sm text-neutral-800 font-[family-name:var(--font-body)] group-hover:text-neutral-900">
                        {link.title}
                      </p>
                      <p className="text-xs text-neutral-500 font-[family-name:var(--font-body)] mt-1">
                        {link.source}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* View Content Button */}
            <div className="p-6 border-t border-neutral-300/50">
              <button 
                className="w-full px-6 py-3 text-white text-sm tracking-[0.1em] uppercase font-[family-name:var(--font-body)] transition-all duration-300 hover:brightness-110"
                style={{ backgroundColor: selectedCluster.color }}
              >
                View Digest
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
