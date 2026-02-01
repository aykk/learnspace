# Phase 1: IR Extraction - Implementation Complete ✅

## What We Built

**Intermediate Representation (IR) extraction pipeline** - the foundation of Learnspace's semantic understanding.

### Components

1. **IR Schema** (`src/lib/types/ir.ts`)
   - `IntermediateRepresentation` - Immutable, versioned semantic structure
   - `Concept` - Structured concept with relationships and importance
   - `LearningProfile` - User learning style preferences (for future phases)
   - `Cluster` - Bookmark grouping by semantic similarity (for future phases)

2. **Database Tables** (added to `src/lib/db.ts`)
   - `INTERMEDIATE_REPRESENTATIONS` - Stores extracted IRs
   - `CLUSTERS` - For Phase 2 (clustering)
   - `LEARNING_PROFILES` - For Phase 3 (personalization)

3. **Gemini Service** (`src/lib/services/gemini.ts`)
   - `extractIRFromUrl()` - Calls Gemini API to extract semantic IR from URL
   - `testGeminiConnection()` - Verify API connectivity
   - Structured prompt engineering for consistent extraction

4. **API Endpoints** (`src/app/api/ir/extract/route.ts`)
   - `POST /api/ir/extract` - Extract and store IR for a bookmark
   - `GET /api/ir/extract?bookmarkId=X` - Retrieve existing IR

5. **Test UI** (`src/app/test-ir/page.tsx`)
   - Interactive page to test IR extraction
   - Visual display of extracted concepts, topics, metadata

---

## How to Test

### 1. Install dependencies
```bash
npm install
```

### 2. Ensure `.env` has your Gemini API key
```bash
GEMINI_API_KEY=your_gemini_key_here
WONDERCRAFT_API_KEY=your_wondercraft_key_here
```

### 3. Start the dev server
```bash
npm run dev
```

### 4. Open the test page
Navigate to: **http://localhost:3000/test-ir**

### 5. Test IR extraction
- Enter a bookmark ID (e.g., `1`)
- Enter a URL (e.g., `https://react.dev/learn`)
- Enter a title (e.g., `React Documentation`)
- Click "Extract IR"
- Wait ~5-10 seconds for Gemini to process
- View the extracted:
  - Summary
  - Key topics
  - Concepts (with importance and relationships)
  - Difficulty, content type, read time

### 6. Test via API (optional)
```bash
# Extract IR for a bookmark
curl -X POST http://localhost:3000/api/ir/extract \
  -H "Content-Type: application/json" \
  -d '{
    "bookmarkId": 1,
    "url": "https://react.dev/learn",
    "title": "React Documentation"
  }'

# Get existing IR
curl http://localhost:3000/api/ir/extract?bookmarkId=1
```

---

## What's Next: Phase 2 - Clustering

Once IR extraction is working, we'll implement:

1. **Semantic Clustering Algorithm**
   - Compare IRs using topic/concept overlap
   - Group related bookmarks into clusters
   - Auto-generate cluster names

2. **Cluster IR Aggregation**
   - Combine member IRs into a cluster-level IR
   - Identify common themes across bookmarks

3. **API Endpoints**
   - `POST /api/clusters/generate` - Auto-cluster all bookmarks
   - `GET /api/clusters` - List all clusters
   - `GET /api/clusters/[id]` - Get cluster details + aggregated IR

4. **Dashboard Integration**
   - View bookmarks organized by cluster
   - See cluster-level summaries

---

## Architecture Notes

### Why IR is Immutable
- IRs are versioned and never modified
- If content changes, create a new IR with incremented version
- Allows audit trail and rollback

### Why Gemini for IR?
- Semantic understanding beyond keyword extraction
- Structured output (concepts, relationships, importance)
- Handles various content types (articles, videos, docs)

### Storage Strategy
- SQLite for MVP (fast, local, no setup)
- When migrating to Snowflake:
  - Same schema works (just change db client)
  - IR table becomes source of truth in Snowflake
  - Job system can orchestrate IR extraction at scale

---

## Troubleshooting

**"GEMINI_API_KEY not set"**
- Check `.env` file exists in project root
- Restart dev server after adding `.env`

**"Failed to parse IR from Gemini"**
- Gemini sometimes returns markdown-wrapped JSON
- Parser handles ````json` blocks
- Check console for raw response

**"IR already exists for this bookmark"**
- Each bookmark can have one IR (for now)
- To re-extract, delete from DB or use a different bookmark ID

**Database locked error**
- Only one process can write to SQLite at a time
- Make sure no other dev servers are running
