-- Fix CLUSTERS table - drop and recreate with all columns
-- Run this in Snowflake SQL worksheet

-- Drop existing table (if any data exists, it will be lost)
DROP TABLE IF EXISTS CLUSTERS;

-- Create table with all required columns
CREATE TABLE CLUSTERS (
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

-- Verify table structure
DESCRIBE TABLE CLUSTERS;

-- Verify empty table
SELECT * FROM CLUSTERS LIMIT 5;
