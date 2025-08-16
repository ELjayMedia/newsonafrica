-- Check if bookmarks table exists, if not create it
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  excerpt TEXT,
  "featuredImage" JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Add RLS policies for bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy for selecting bookmarks (users can only see their own)
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
CREATE POLICY "Users can view their own bookmarks" 
  ON bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy for inserting bookmarks
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON bookmarks;
CREATE POLICY "Users can insert their own bookmarks" 
  ON bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy for updating bookmarks
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
CREATE POLICY "Users can update their own bookmarks" 
  ON bookmarks FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy for deleting bookmarks
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;
CREATE POLICY "Users can delete their own bookmarks" 
  ON bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_post_id_idx ON bookmarks(post_id);
