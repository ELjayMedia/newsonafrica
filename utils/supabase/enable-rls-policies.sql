-- Enable Row-Level Security and create policies for News On Africa
-- Run this in the Supabase SQL Editor

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

-- Enable RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Optional: Allow public viewing of profiles (for author pages, etc.)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- =============================================================================
-- COMMENTS TABLE
-- =============================================================================

-- Enable RLS for comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Moderators can manage all comments" ON public.comments;

-- Create policies for comments
CREATE POLICY "Anyone can view active comments"
ON public.comments
FOR SELECT
USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Optional: Policy for moderators (adjust based on your user roles)
-- CREATE POLICY "Moderators can manage all comments"
-- ON public.comments
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles 
--     WHERE id = auth.uid() AND role = 'moderator'
--   )
-- );

-- =============================================================================
-- COMMENT_REACTIONS TABLE
-- =============================================================================

-- Enable RLS for comment_reactions table
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can create their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;

-- Create policies for comment_reactions
CREATE POLICY "Anyone can view reactions"
ON public.comment_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reactions"
ON public.comment_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.comment_reactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.comment_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

-- Enable RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy for system to create notifications (service role)
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- =============================================================================
-- USER_SETTINGS TABLE
-- =============================================================================

-- Enable RLS for user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- STORAGE POLICIES (for avatars and media uploads)
-- =============================================================================

-- Enable RLS for storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Media bucket policies
CREATE POLICY "Media files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to check if user is admin/moderator
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid, resource_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN user_id = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'comments', 'comment_reactions', 'notifications', 'user_settings');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test queries (run these after creating a test user)
-- SELECT * FROM profiles; -- Should only show your profile
-- SELECT * FROM comments WHERE status = 'active'; -- Should show all active comments
-- SELECT * FROM notifications; -- Should only show your notifications
