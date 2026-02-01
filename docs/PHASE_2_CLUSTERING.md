# Phase 2: Semantic Clustering

## Overview

The clustering system groups related Intermediate Representations (IRs) into meaningful learning clusters using Gemini AI's semantic understanding.

## Architecture

### Data Flow
```
IRs (Snowflake) → Gemini API → Cluster Assignments → CLUSTERS table
```

### Components

1. **Clustering Service** (`src/lib/services/clustering.ts`)
   - `generateClusters()`: Main clustering function
   - Uses Gemini 2.5 Flash for semantic analysis
   - Returns cluster assignments with metadata

2. **Database Layer** (`src/lib/db.ts`)
   - `insertCluster()`: Store cluster in Snowflake
   - `getAllClusters()`: Retrieve all clusters
   - `getClusterById()`: Get specific cluster
   - `deleteAllClusters()`: Clear existing clusters

3. **API Endpoints**
   - `POST /api/clusters/generate`: Generate new clusters from all IRs
   - `GET /api/clusters`: List all clusters
   - `GET /api/clusters?id=<id>`: Get specific cluster

4. **UI** (`src/app/dashboard/page.tsx`)
   - "Generate Clusters" button
   - Cluster cards showing name, description, topics, difficulty
   - Member count per cluster

## Snowflake Schema

```sql
CREATE TABLE CLUSTERS (
  ID VARCHAR(36) PRIMARY KEY,
  NAME VARCHAR(255) NOT NULL,
  DESCRIPTION TEXT,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  IR_IDS VARIANT NOT NULL,           -- Array of IR IDs
  AGGREGATED_TOPICS VARIANT,         -- Combined topics
  MEMBER_COUNT INTEGER DEFAULT 0,
  AVG_DIFFICULTY VARCHAR(32)
);
```

## Usage

### 1. Setup Snowflake Table

Run the SQL script:
```bash
snowflake-setup/03_clusters_table.sql
```

### 2. Generate Clusters

**Via Dashboard:**
1. Go to http://localhost:3000/dashboard
2. Ensure you have at least 2 IRs extracted
3. Click "Generate Clusters"
4. Wait ~5-10 seconds for Gemini to analyze and group

**Via API:**
```bash
curl -X POST http://localhost:3000/api/clusters/generate
```

### 3. View Clusters

Clusters appear in the dashboard with:
- **Name**: Auto-generated descriptive title
- **Description**: What the cluster covers
- **Topics**: Aggregated key topics
- **Member Count**: Number of IRs in cluster
- **Difficulty**: Average difficulty level

## Algorithm

### Gemini Prompt Strategy

The clustering prompt:
1. Provides Gemini with all IR summaries, topics, and concepts
2. Asks for semantic grouping (2-5 clusters)
3. Requests JSON output with specific structure
4. Ensures every IR is assigned to exactly one cluster

### Clustering Logic

- **Minimum IRs**: 2 (single IR creates a 1-item cluster)
- **Optimal Range**: 3-10 IRs for best results
- **Max Clusters**: 5 (to avoid over-fragmentation)
- **Temperature**: 0.3 (lower for consistency)

### Edge Cases

- **0 IRs**: Returns error
- **1 IR**: Creates single cluster with that IR
- **Many IRs**: Gemini groups into 2-5 meaningful clusters

## Testing

### Test Flow

1. **Add diverse bookmarks** (different topics)
   - Example: React docs, Python tutorial, Machine Learning article
   
2. **Wait for IR extraction** (auto-extracts in background)

3. **Generate clusters**
   - Should group React/frontend content together
   - Python/ML content in separate cluster(s)

4. **Verify results**
   - Check cluster names are descriptive
   - Verify member counts
   - Confirm topics are aggregated correctly

### Expected Output

For 5 bookmarks about React, Next.js, Python, Django, and Machine Learning:

```
Cluster 1: "React & Next.js Development"
- Members: 2 IRs
- Topics: React, Next.js, Frontend, JavaScript
- Difficulty: intermediate

Cluster 2: "Python Web Development"
- Members: 2 IRs
- Topics: Python, Django, Backend, Web Frameworks
- Difficulty: intermediate

Cluster 3: "Machine Learning Fundamentals"
- Members: 1 IR
- Topics: ML, AI, Data Science, Algorithms
- Difficulty: advanced
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Required for clustering

### Tuning Parameters

In `src/lib/services/clustering.ts`:
- `temperature`: 0.3 (lower = more consistent grouping)
- `maxOutputTokens`: 4096 (for large cluster responses)

## Future Enhancements

- [ ] Incremental clustering (add new IRs to existing clusters)
- [ ] User-editable cluster names/descriptions
- [ ] Cluster-based podcast generation
- [ ] Cluster visualization (graph view)
- [ ] Sub-clusters for large topic areas
- [ ] Learning path generation from clusters

## Troubleshooting

### "No IRs found"
- Ensure bookmarks have been added
- Check that IR extraction completed (green checkmarks)

### Gemini API Errors
- Verify `GEMINI_API_KEY` in `.env`
- Check API quota/rate limits
- Try with fewer IRs if hitting token limits

### Empty Clusters
- Regenerate clusters (Gemini uses temperature, results vary)
- Add more diverse bookmarks for better grouping

### All IRs in One Cluster
- Content may be too similar
- Add bookmarks on different topics
- Gemini prefers cohesive grouping over forced splitting
