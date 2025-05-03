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

// Instructions for running the migration
export const MIGRATION_INSTRUCTIONS = `
To update your Supabase database schema:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a "New Query"
4. Copy and paste the SQL commands above
5. Click "Run" to execute the migration

After running the migration, your comment system will have moderation capabilities.
`
