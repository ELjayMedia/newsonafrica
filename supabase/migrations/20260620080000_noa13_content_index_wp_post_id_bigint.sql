-- NOA-13: Fix wp_post_id type mismatch in content_index
-- bookmarks and comments use bigint; content_index uses integer — promote to bigint for consistency
-- Safe to run with zero downtime on an empty table (content_index is currently 0 rows)

ALTER TABLE public.content_index
  ALTER COLUMN wp_post_id TYPE bigint;
