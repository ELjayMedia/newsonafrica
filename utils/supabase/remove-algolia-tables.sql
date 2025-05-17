-- Drop Algolia-related tables if they exist
DROP TABLE IF EXISTS algolia_indexing_logs;
DROP TABLE IF EXISTS algolia_webhook_logs;

-- Remove any Algolia-related columns from search_queries table
ALTER TABLE IF EXISTS search_queries 
DROP COLUMN IF EXISTS algolia_query_id,
DROP COLUMN IF EXISTS algolia_response_time;
