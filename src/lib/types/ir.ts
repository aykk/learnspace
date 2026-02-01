/**
 * Intermediate Representation (IR) - Immutable, versioned semantic structure
 * The canonical representation of content meaning in Learnspace.
 */

export interface IntermediateRepresentation {
  id: string; // UUID
  version: number; // IR schema version (for future evolution)
  sourceUrl: string;
  sourceTitle: string | null;
  createdAt: string; // ISO timestamp
  
  // Core semantic content
  summary: string; // High-level summary (2-3 sentences)
  keyTopics: string[]; // Main topics/themes
  concepts: Concept[]; // Structured concepts with relationships
  
  // Metadata for clustering and personalization
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contentType: 'article' | 'video' | 'tutorial' | 'reference' | 'discussion' | 'other';
  estimatedReadTime?: number; // minutes
  
  // Raw extracted data (for debugging/audit)
  rawText?: string; // First N chars of extracted text
}

export interface Concept {
  name: string;
  description: string;
  importance: 'high' | 'medium' | 'low'; // For prioritization
  relatedConcepts?: string[]; // Names of related concepts
}

/**
 * Learning profile - user's learning style preferences
 */
export interface LearningProfile {
  id: string;
  userId?: string; // For multi-user support later
  createdAt: string;
  
  // Learning style dimensions
  preferredModality: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  pace: 'slow' | 'moderate' | 'fast';
  depth: 'overview' | 'detailed' | 'comprehensive';
  
  // Content preferences
  preferredFormats: string[]; // e.g., ['podcast', 'summary', 'quiz']
  topicsOfInterest?: string[];
}

/**
 * Cluster - groups related bookmarks by semantic similarity
 */
export interface Cluster {
  id: string;
  name: string; // Auto-generated descriptive name
  createdAt: string;
  updatedAt: string;
  
  bookmarkIds: number[]; // References to LEARNSPACE_BOOKMARKS.ID
  irIds: string[]; // References to IR.id
  
  // Aggregated cluster-level IR (computed from member IRs)
  clusterIr?: IntermediateRepresentation;
}
