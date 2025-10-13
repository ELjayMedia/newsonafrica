-- Enforce edition-aware row level security on bookmarks

-- Drop existing policies to redefine them with edition constraints
DROP POLICY IF EXISTS "Bookmarks are readable by owner" ON public.bookmarks;
DROP POLICY IF EXISTS "Bookmarks are manageable by owner" ON public.bookmarks;

-- Backfill bookmark country data so it aligns with the caller's edition
UPDATE public.bookmarks AS b
SET country = COALESCE(p.country_pref, 'african-edition')
FROM public.profiles AS p
WHERE b.user_id = p.id
  AND COALESCE(b.country, '') IS DISTINCT FROM COALESCE(p.country_pref, 'african-edition');

-- Default any remaining NULL countries to the primary edition
UPDATE public.bookmarks
SET country = 'african-edition'
WHERE country IS NULL;

-- Bookmarks remain readable by their owner when editions align
CREATE POLICY IF NOT EXISTS "Bookmarks are readable by owner" ON public.bookmarks
  FOR SELECT USING (
    auth.uid() = user_id
    AND COALESCE(country, 'african-edition') = COALESCE(current_setting('request.jwt.claims.country', true), 'african-edition')
  );

-- Bookmarks remain manageable by their owner when editions align
CREATE POLICY IF NOT EXISTS "Bookmarks are manageable by owner" ON public.bookmarks
  USING (
    auth.uid() = user_id
    AND COALESCE(country, 'african-edition') = COALESCE(current_setting('request.jwt.claims.country', true), 'african-edition')
  ) WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(country, 'african-edition') = COALESCE(current_setting('request.jwt.claims.country', true), 'african-edition')
  );
