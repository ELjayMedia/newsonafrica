-- Patch RLS auth initplan warnings by wrapping auth function calls in SELECT.
-- This preserves the same access behavior while allowing Postgres to evaluate
-- auth.uid() / auth.role() once per statement instead of once per row.

-- user_preferences
DROP POLICY IF EXISTS user_preferences_select ON public.user_preferences;
CREATE POLICY user_preferences_select
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_preferences_insert ON public.user_preferences;
CREATE POLICY user_preferences_insert
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_preferences_update ON public.user_preferences;
CREATE POLICY user_preferences_update
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- content_sync_cursor
DROP POLICY IF EXISTS "Service role can manage sync cursor" ON public.content_sync_cursor;
CREATE POLICY "Service role can manage sync cursor"
  ON public.content_sync_cursor
  FOR ALL
  TO public
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

-- subscriptions
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
CREATE POLICY subscriptions_insert
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- comment_reactions
DROP POLICY IF EXISTS comment_reactions_insert ON public.comment_reactions;
CREATE POLICY comment_reactions_insert
  ON public.comment_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS comment_reactions_delete ON public.comment_reactions;
CREATE POLICY comment_reactions_delete
  ON public.comment_reactions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_settings
DROP POLICY IF EXISTS user_settings_select ON public.user_settings;
CREATE POLICY user_settings_select
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_settings_insert ON public.user_settings;
CREATE POLICY user_settings_insert
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- content_index
DROP POLICY IF EXISTS "Service role can manage content index" ON public.content_index;
CREATE POLICY "Service role can manage content index"
  ON public.content_index
  FOR ALL
  TO public
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
