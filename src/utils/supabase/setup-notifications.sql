-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);

-- Create index on is_read for faster filtering
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

-- Set up RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create comment_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create index on comment_id for faster lookups
CREATE INDEX IF NOT EXISTS comment_reactions_comment_id_idx ON public.comment_reactions(comment_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS comment_reactions_user_id_idx ON public.comment_reactions(user_id);

-- Set up RLS policies
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON public.comment_reactions
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Users can only create their own reactions
CREATE POLICY "Users can create their own reactions"
  ON public.comment_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON public.comment_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add is_rich_text column to comments if it doesn't exist
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_rich_text BOOLEAN NOT NULL DEFAULT false;

-- Add reaction_count column to comments if it doesn't exist
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS reaction_count INTEGER NOT NULL DEFAULT 0;
