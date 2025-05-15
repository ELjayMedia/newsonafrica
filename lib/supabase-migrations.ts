// This file contains SQL migrations that need to be run in the Supabase SQL editor
// Copy and paste these commands to update your schema

export const COMMENT_SYSTEM_MIGRATION = `
-- Add moderation fields to comments table
ALTER TABLE public.comments 
 ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
 ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES auth.users(id),
 ADD COLUMN IF NOT EXISTS report_reason TEXT,
 ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Create index for status field
CREATE INDEX IF NOT EXISTS comments_status_idx ON public.comments(status);

-- Update RLS policies to account for status
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
CREATE POLICY "Anyone can read active comments"
 ON public.comments
 FOR SELECT
 USING (status = 'active' OR status = 'flagged' OR status IS NULL);

-- Policy for reporting comments
CREATE POLICY "Authenticated users can report comments"
 ON public.comments
 FOR UPDATE
 TO authenticated
 USING (auth.uid() = reported_by)
 WITH CHECK (
   status = 'flagged' AND 
   reported_by IS NOT NULL AND 
   report_reason IS NOT NULL
 );
`

export const MIGRATION_INSTRUCTIONS = `
-- Add status column to comments table if it doesn't exist
ALTER TABLE public.comments 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS report_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Add rich text support
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_rich_text BOOLEAN NOT NULL DEFAULT false;

-- Add reaction support
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reaction_count INTEGER NOT NULL DEFAULT 0;

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'sad', 'angry')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS comment_reactions_user_id_idx ON public.comment_reactions(user_id);

-- Update RLS policies
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions
CREATE POLICY "Anyone can read reactions"
  ON public.comment_reactions
  FOR SELECT
  USING (true);

-- Users can create their own reactions
CREATE POLICY "Users can create their own reactions"
  ON public.comment_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON public.comment_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
`

// Instructions for running the migration
export const MIGRATION_RUN_INSTRUCTIONS = `
To update your Supabase database schema:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a "New Query"
4. Copy and paste the SQL commands above
5. Click "Run" to execute the migration

After running the migration, your comment system will have moderation capabilities.
`
