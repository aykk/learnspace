"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

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
}

// Initial cluster data with relationships
const initialClusters: Cluster[] = [
  {
    id: "1",
    name: "Machine Learning Fundamentals",
    color: "#e07850",
    size: 5,
    position: { x: 45, y: 35 },
    isRead: false,
    isHidden: false,
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
    position: { x: 60, y: 55 },
    isRead: true,
    isHidden: false,
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
    position: { x: 35, y: 60 },
    isRead: false,
    isHidden: false,
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
    position: { x: 55, y: 25 },
    isRead: false,
    isHidden: false,
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
    position: { x: 25, y: 40 },
    isRead: false,
    isHidden: false,
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
    position: { x: 50, y: 70 },
    isRead: false,
    isHidden: false,
    links: [
      { id: "6a", title: "How Memory Works", url: "https://example.com/memory", source: "Scientific American" },
      { id: "6b", title: "Spaced Repetition Systems", url: "https://example.com/srs", source: "Gwern" },
    ],
    summary: "Fascinating insights into how human memory and learning work, with practical applications like spaced repetition for better retention.",
    concepts: ["Memory", "Spaced Repetition", "Learning", "Cognitive Load"],
  },
];

export default function Dashboard() {
  const [clusters, setClusters] = useState<Cluster[]>(initialClusters);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCluster, setDraggedCluster] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);
  const dragStartPosRef = useRef<{x: number; y: number} | null>(null);

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
  }, [selectedCluster]);

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
    const baseSize = 80;
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
          <button className="w-full px-4 py-2 text-sm text-white font-[family-name:var(--font-body)] transition-colors duration-200 flex items-center justify-center gap-2 rounded-sm hover:brightness-110" style={{ backgroundColor: "#e07850" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
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

        {/* Cluster Visualization Area */}
        <div 
          ref={containerRef}
          className="absolute inset-0 overflow-visible"
          style={{ 
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            transform: `scale(${zoom})`, 
            transformOrigin: 'top left',
          }}
          onClick={(e) => {
            // Close sidebar when clicking on empty space (not on clusters)
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-cluster]') === null) {
              setSelectedCluster(null);
            }
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
