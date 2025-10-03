-- migrate:up
CREATE INDEX IF NOT EXISTS bookmarks_user_id_created_at_idx
  ON public.bookmarks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_post_id_created_at_idx
  ON public.comments (post_id, created_at DESC);

-- migrate:down
DROP INDEX IF EXISTS public.bookmarks_user_id_created_at_idx;
DROP INDEX IF EXISTS public.comments_post_id_created_at_idx;
