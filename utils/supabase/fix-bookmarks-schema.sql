-- Drop the existing table if it has incorrect column names
DROP TABLE IF EXISTS bookmarks CASCADE;

-- Create bookmarks table with proper snake_case column names
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  excerpt TEXT,
  featured_image JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Add RLS policies for bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy for selecting bookmarks (users can only see their own)
CREATE POLICY "Users can view their own bookmarks" 
  ON bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy for inserting bookmarks
CREATE POLICY "Users can insert their own bookmarks" 
  ON bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy for updating bookmarks
CREATE POLICY "Users can update their own bookmarks" 
  ON bookmarks FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy for deleting bookmarks
CREATE POLICY "Users can delete their own bookmarks" 
  ON bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX bookmarks_post_id_idx ON bookmarks(post_id);
CREATE INDEX bookmarks_created_at_idx ON bookmarks(created_at);
