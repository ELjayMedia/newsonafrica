-- 1. Backfill profile rows for any auth users who have none yet
INSERT INTO public.profiles (id, username, email, full_name, avatar_url, created_at, updated_at)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1)),
  u.email,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(u.raw_user_meta_data->>'name'), '')),
  NULLIF(TRIM(u.raw_user_meta_data->>'avatar_url'), ''),
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2. Add FK from comments.user_id → profiles.id so PostgREST can resolve
--    the "profile:profiles(username,avatar_url)" embedded join in list queries.
--    The existing FK to auth.users remains for data integrity.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comments_user_id_profiles_fkey'
      AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Create comments_view so executeListQuery finds it on first try (stops 404 noise).
--    security_invoker ensures the comments table's RLS policies apply to view queries.
CREATE OR REPLACE VIEW public.comments_view
  WITH (security_invoker = true)
AS
  SELECT * FROM public.comments;

GRANT SELECT ON public.comments_view TO anon, authenticated, service_role;
