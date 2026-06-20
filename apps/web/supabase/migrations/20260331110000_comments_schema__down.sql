DROP INDEX IF EXISTS public.comments_user_id_created_at_idx;
DROP INDEX IF EXISTS public.comments_parent_id_created_at_idx;
DROP INDEX IF EXISTS public.comments_article_slug_status_created_at_idx;

DROP TABLE IF EXISTS public.comment_threads CASCADE;
DROP TABLE IF EXISTS public.comment_reports CASCADE;

ALTER TABLE IF EXISTS public.comments
  ALTER COLUMN status DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comments'
      AND column_name = 'status'
      AND udt_name = 'comment_status'
  ) THEN
    ALTER TABLE public.comments
      ALTER COLUMN status TYPE TEXT USING status::TEXT;
  END IF;
END
$$;

DROP TYPE IF EXISTS public.comment_status;
