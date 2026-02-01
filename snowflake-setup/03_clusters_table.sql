-- Clusters table - groups related IRs by semantic similarity
-- Run this in Snowflake SQL worksheet

CREATE TABLE IF NOT EXISTS CLUSTERS (
  ID VARCHAR(36) PRIMARY KEY,
  NAME VARCHAR(255) NOT NULL,
  DESCRIPTION TEXT,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  
  -- Array of IR IDs in this cluster
  IR_IDS VARIANT NOT NULL,
  
  -- Aggregated topics from all IRs in cluster
  AGGREGATED_TOPICS VARIANT,
  
  -- Metadata
  MEMBER_COUNT INTEGER DEFAULT 0,
  AVG_DIFFICULTY VARCHAR(32)
);

-- Verify table creation
SELECT * FROM CLUSTERS LIMIT 5;
