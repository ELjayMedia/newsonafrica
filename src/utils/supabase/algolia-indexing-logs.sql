-- Create table for Algolia indexing logs
CREATE TABLE IF NOT EXISTS algolia_indexing_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  posts_indexed INTEGER NOT NULL,
  time_taken FLOAT NOT NULL,
  success BOOLEAN NOT NULL,
  source TEXT NOT NULL,
  error TEXT
);

-- Create index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS algolia_indexing_logs_timestamp_idx ON algolia_indexing_logs(timestamp);

-- Add RLS policies
ALTER TABLE algolia_indexing_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view logs
CREATE POLICY "Anyone can view indexing logs" 
ON algolia_indexing_logs FOR SELECT 
USING (true);

-- Only authenticated users can insert logs
CREATE POLICY "Only authenticated users can insert logs" 
ON algolia_indexing_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);
