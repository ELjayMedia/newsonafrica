-- Define comments domain tables and indexes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'comment_status'
  ) THEN
    CREATE TYPE public.comment_status AS ENUM (
      'pending',
      'published',
      'rejected',
      'shadow_hidden',
      'deleted'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  status public.comment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure required columns exist for pre-existing deployments.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS article_slug TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comments'
      AND column_name = 'status'
      AND udt_name <> 'comment_status'
  ) THEN
    ALTER TABLE public.comments
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.comments
      ALTER COLUMN status TYPE public.comment_status
      USING (
        CASE
          WHEN status IN ('pending', 'published', 'rejected', 'shadow_hidden', 'deleted') THEN status::public.comment_status
          WHEN status = 'active' THEN 'published'::public.comment_status
          ELSE 'pending'::public.comment_status
        END
      );
  END IF;
END
$$;

ALTER TABLE public.comments
  ALTER COLUMN status SET DEFAULT 'pending'::public.comment_status;

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional table for deep nesting support.
CREATE TABLE IF NOT EXISTS public.comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_comment_id UUID NOT NULL UNIQUE REFERENCES public.comments(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_article_slug_status_created_at_idx
  ON public.comments (article_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_parent_id_created_at_idx
  ON public.comments (parent_id, created_at ASC);

CREATE INDEX IF NOT EXISTS comments_user_id_created_at_idx
  ON public.comments (user_id, created_at DESC);
