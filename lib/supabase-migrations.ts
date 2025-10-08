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

`

export const COMMENT_SYSTEM_MIGRATION = `
-- Add comment system related migrations
ALTER TABLE public.comments 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

-- Create index for faster parent-child lookups
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- Add threaded comments support
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;

`
