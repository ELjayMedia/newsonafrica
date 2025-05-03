-- This SQL should be run in the Supabase SQL Editor to create the bookmarks table with the correct schema

-- Create bookmarks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  title TEXT,
  slug TEXT,
  "featuredImage" JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create a unique constraint to prevent duplicate bookmarks
ALTER TABLE public.bookmarks 
  DROP CONSTRAINT IF EXISTS bookmarks_user_id_post_id_key;

ALTER TABLE public.bookmarks 
  ADD CONSTRAINT bookmarks_user_id_post_id_key 
  UNIQUE (user_id, post_id);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON bookmarks;

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS bookmarks_post_id_idx ON public.bookmarks (post_id);
