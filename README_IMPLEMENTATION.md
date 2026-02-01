# Learnspace Implementation Guide

## Current Status: Phase 1 Complete ✅

### What's Implemented

**Phase 1: IR Extraction Pipeline**
- ✅ Intermediate Representation (IR) schema and types
- ✅ Database tables for IRs, clusters, and learning profiles
- ✅ Gemini AI service for semantic extraction
- ✅ API endpoints for IR extraction and retrieval
- ✅ Test UI at `/test-ir` for manual testing

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Your `.env` file should have:
```
GEMINI_API_KEY=your_gemini_key_here
WONDERCRAFT_API_KEY=your_wondercraft_key_here
```

### 3. Start Development Server
```bash
npm run dev
```
Server runs on: **http://localhost:3000**

### 4. Test IR Extraction
Navigate to: **http://localhost:3000/test-ir**

Try extracting IR for:
- URL: `https://react.dev/learn`
- Title: `React Documentation`
- Bookmark ID: `1`

---

## Project Structure

```
src/
├── lib/
│   ├── types/
│   │   └── ir.ts                 # IR, Concept, Cluster, LearningProfile types
│   ├── services/
│   │   └── gemini.ts             # Gemini AI integration for IR extraction
│   └── db.ts                     # Database layer (SQLite via sql.js)
├── app/
│   ├── api/
│   │   ├── bookmarks/            # Bookmark CRUD (from partner)
│   │   ├── podcast/              # Wondercraft podcast generation (from partner)
│   │   └── ir/
│   │       └── extract/          # IR extraction endpoints
│   │           └── route.ts
│   ├── dashboard/                # Main dashboard (from partner)
│   ├── test-ir/                  # IR extraction test page
│   └── page.tsx                  # Landing page (from partner)
└── chrome-extension/             # Chrome extension (from partner)
```

---

## Architecture Overview

### Data Flow (Current)
```
Bookmark → Gemini AI → IR (immutable) → Database
                ↓
         Semantic Structure:
         - Summary
         - Key Topics
         - Concepts (with relationships)
         - Difficulty, Content Type, etc.
```

### Data Flow (Full Design)
```
1. Bookmark saved (Chrome extension or dashboard)
2. IR extracted (Gemini) → stored immutably
3. Clustering (semantic similarity) → groups bookmarks
4. Cluster IR (aggregated from member IRs)
5. Audio generation (Wondercraft) → uses cluster IR + learning profile
```

---

## Implementation Phases

### ✅ Phase 1: IR Extraction (COMPLETE)
- Gemini-powered semantic extraction
- Immutable, versioned IR storage
- Test UI and API endpoints

### 🔄 Phase 2: Clustering (NEXT)
- Semantic similarity algorithm
- Auto-cluster bookmarks by topic overlap
- Cluster-level IR aggregation
- Dashboard: view bookmarks by cluster

### 📋 Phase 3: Learning Profiles
- User survey for learning style
- Store preferences (modality, pace, depth)
- Use in audio generation

### 📋 Phase 4: Personalized Audio
- Generate audio scripts from cluster IR + profile
- Wondercraft integration (already exists for basic podcasts)
- Tailor content to learning style

### 📋 Phase 5: Job System (Optional)
- Background processing for IR extraction
- Async clustering
- Scheduled audio generation

---

## API Reference

### Bookmarks (from partner)
- `GET /api/bookmarks` - List all bookmarks
- `POST /api/bookmarks` - Add bookmark
- `DELETE /api/bookmarks` - Remove bookmark

### IR Extraction (Phase 1)
- `POST /api/ir/extract` - Extract IR for a bookmark
  ```json
  {
    "bookmarkId": 1,
    "url": "https://example.com",
    "title": "Example Page"
  }
  ```
- `GET /api/ir/extract?bookmarkId=1` - Get existing IR

### Podcast (from partner)
- `GET /api/podcast/generate` - Generate podcast from bookmarks (SSE stream)

---

## Database Schema

### LEARNSPACE_BOOKMARKS (from partner)
```sql
ID INTEGER PRIMARY KEY
URL VARCHAR(2048)
TITLE VARCHAR(1024)
DATE_ADDED TEXT
_LOAD_TIME TEXT
```

### INTERMEDIATE_REPRESENTATIONS (Phase 1)
```sql
ID TEXT PRIMARY KEY              -- UUID
VERSION INTEGER                  -- Schema version
BOOKMARK_ID INTEGER              -- FK to LEARNSPACE_BOOKMARKS
SOURCE_URL TEXT
SOURCE_TITLE TEXT
CREATED_AT TEXT
SUMMARY TEXT                     -- 2-3 sentence summary
KEY_TOPICS TEXT                  -- JSON array
CONCEPTS TEXT                    -- JSON array of Concept objects
DIFFICULTY TEXT                  -- beginner/intermediate/advanced
CONTENT_TYPE TEXT                -- article/video/tutorial/etc
ESTIMATED_READ_TIME INTEGER      -- minutes
RAW_TEXT TEXT                    -- Optional raw content
```

### CLUSTERS (Phase 2 - ready, not used yet)
```sql
ID TEXT PRIMARY KEY
NAME TEXT                        -- Auto-generated cluster name
CREATED_AT TEXT
UPDATED_AT TEXT
BOOKMARK_IDS TEXT                -- JSON array
IR_IDS TEXT                      -- JSON array
CLUSTER_IR TEXT                  -- Aggregated IR (JSON)
```

### LEARNING_PROFILES (Phase 3 - ready, not used yet)
```sql
ID TEXT PRIMARY KEY
USER_ID TEXT
CREATED_AT TEXT
PREFERRED_MODALITY TEXT          -- visual/auditory/reading/kinesthetic
PACE TEXT                        -- slow/moderate/fast
DEPTH TEXT                       -- overview/detailed/comprehensive
PREFERRED_FORMATS TEXT           -- JSON array
TOPICS_OF_INTEREST TEXT          -- JSON array
```

---

## Testing

### Manual Testing
1. Go to http://localhost:3000/test-ir
2. Enter bookmark details
3. Click "Extract IR"
4. View extracted semantic structure

### API Testing
```bash
# Extract IR
curl -X POST http://localhost:3000/api/ir/extract \
  -H "Content-Type: application/json" \
  -d '{"bookmarkId": 1, "url": "https://react.dev", "title": "React"}'

# Get IR
curl http://localhost:3000/api/ir/extract?bookmarkId=1
```

### Chrome Extension Testing
1. Load unpacked extension from `chrome-extension/`
2. Add bookmarks to "learnspace" folder
3. Check dashboard for synced bookmarks

---

## Next Steps

### To implement Phase 2 (Clustering):
1. Create clustering algorithm in `src/lib/services/clustering.ts`
2. Add API endpoint `POST /api/clusters/generate`
3. Update dashboard to show clusters
4. Test with multiple bookmarks on related topics

### To migrate to Snowflake:
1. Replace `src/lib/db.ts` with Snowflake client
2. Use same table schemas
3. Update connection string in `.env`
4. No changes needed to API or UI layers

---

## Troubleshooting

**Port 3000 in use**
```bash
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**Gemini API errors**
- Check API key in `.env`
- Restart dev server after changing `.env`
- Verify quota/billing on Google Cloud Console

**Database locked**
- Only one Next.js instance can run at a time
- Check for zombie processes

**Chrome extension not syncing**
- Verify extension uses port 3000 (check `background.js`)
- Check browser console for CORS errors
- Reload extension after code changes

---

## Documentation

- `docs/PHASE_1_IR_EXTRACTION.md` - Phase 1 implementation details
- `docs/PARTNER_CODE_VERIFICATION.md` - Partner's code summary (if exists)

---

## Team Notes

- **Database:** SQLite (sql.js) for MVP, migrate to Snowflake later
- **AI:** Gemini for IR extraction, Wondercraft for audio
- **Extension:** Syncs bookmarks from Chrome to webapp
- **Design:** IR-first architecture - immutable semantic representations
