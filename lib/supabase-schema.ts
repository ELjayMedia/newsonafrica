// This file defines the Supabase schema for our application
// Run these SQL commands in the Supabase SQL editor to set up the comments table

/*
-- Update comments table with moderation fields
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
  USING (status = 'active' OR status = 'flagged');

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

-- Policy for moderators (you'll need to implement role-based access)
CREATE POLICY "Moderators can review comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (
    -- This is a placeholder. In a real system, you'd check if the user has moderator role
    -- For example: auth.uid() IN (SELECT user_id FROM moderators)
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_moderator = true)
  )
  WITH CHECK (
    reviewed_at IS NOT NULL AND 
    reviewed_by IS NOT NULL
  );
*/

// Types for our comments system
export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  // New moderation fields
  status: "active" | "flagged" | "deleted"
  reported_by?: string
  report_reason?: string
  reviewed_at?: string
  reviewed_by?: string
  // For UI state
  isReplying?: boolean
  isEditing?: boolean
  isOptimistic?: boolean // Flag for optimistic UI
  // Profile data
  profile?: {
    username: string
    avatar_url: string | null
  }
  // Replies
  replies?: Comment[]
}

export type NewComment = {
  post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  status?: "active" | "flagged" | "deleted"
}

export type ReportCommentData = {
  commentId: string
  reportedBy: string
  reason: string
}

// For rate limiting
export interface CommentSubmission {
  userId: string
  timestamp: number
}
