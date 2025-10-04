-- Tighten comments row level security policies

-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Readers can access their own comments
CREATE POLICY IF NOT EXISTS "Users can read own comments" ON public.comments
  FOR SELECT USING (auth.uid() = user_id);

-- Readers can access comments for their edition/country
CREATE POLICY IF NOT EXISTS "Edition readers can read comments" ON public.comments
  FOR SELECT USING (
    country = current_setting('request.jwt.claims.country', true)
  );

-- Users can insert comments only for their own account and edition
CREATE POLICY IF NOT EXISTS "Users can insert own comments" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND country = current_setting('request.jwt.claims.country', true)
  );

-- Users can update comments only for their own account and edition
CREATE POLICY IF NOT EXISTS "Users can update own comments" ON public.comments
  FOR UPDATE USING (
    auth.uid() = user_id
    AND country = current_setting('request.jwt.claims.country', true)
  ) WITH CHECK (
    auth.uid() = user_id
    AND country = current_setting('request.jwt.claims.country', true)
  );

-- Users can delete comments only for their own account and edition
CREATE POLICY IF NOT EXISTS "Users can delete own comments" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id
    AND country = current_setting('request.jwt.claims.country', true)
  );
