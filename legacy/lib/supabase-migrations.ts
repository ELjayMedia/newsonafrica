export const MIGRATION_INSTRUCTIONS = `
-- === Shared enums needed by the new schema ===
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookmark_read_state') THEN
    CREATE TYPE public.bookmark_read_state AS ENUM ('unread', 'in_progress', 'read');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_status') THEN
    CREATE TYPE public.comment_status AS ENUM ('active', 'flagged', 'deleted', 'pending');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_reaction_type') THEN
    CREATE TYPE public.comment_reaction_type AS ENUM ('like', 'love', 'laugh', 'sad', 'angry');
  END IF;
END $$;

-- === Comments + bookmarks now reference WordPress posts + editions ===
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'post_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'wp_post_id'
  ) THEN
    ALTER TABLE public.comments RENAME COLUMN post_id TO wp_post_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'country'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'edition_code'
  ) THEN
    ALTER TABLE public.comments RENAME COLUMN country TO edition_code;
  END IF;
END $$;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS wp_post_id TEXT,
  ADD COLUMN IF NOT EXISTS edition_code TEXT,
  ADD COLUMN IF NOT EXISTS reactions_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN status TYPE public.comment_status USING status::public.comment_status,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN wp_post_id SET NOT NULL,
  ALTER COLUMN edition_code SET DEFAULT 'african-edition';

UPDATE public.comments
SET edition_code = COALESCE(edition_code, 'african-edition')
WHERE edition_code IS NULL;

ALTER TABLE public.comments
  ALTER COLUMN edition_code DROP DEFAULT;

CREATE INDEX IF NOT EXISTS comments_wp_post_id_idx
  ON public.comments (wp_post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_edition_code_idx
  ON public.comments (edition_code, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'post_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'wp_post_id'
  ) THEN
    ALTER TABLE public.bookmarks RENAME COLUMN post_id TO wp_post_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'country'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'edition_code'
  ) THEN
    ALTER TABLE public.bookmarks RENAME COLUMN country TO edition_code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'read_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'read_state'
  ) THEN
    ALTER TABLE public.bookmarks RENAME COLUMN read_status TO read_state;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'note'
  ) THEN
    ALTER TABLE public.bookmarks RENAME COLUMN notes TO note;
  END IF;
END $$;

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS wp_post_id TEXT,
  ADD COLUMN IF NOT EXISTS edition_code TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS read_state public.bookmark_read_state;

UPDATE public.bookmarks
SET read_state = CASE
  WHEN read_state::TEXT IN ('unread', 'in_progress', 'read') THEN read_state
  ELSE 'unread'::public.bookmark_read_state
END;

ALTER TABLE public.bookmarks
  ALTER COLUMN read_state TYPE public.bookmark_read_state USING read_state::public.bookmark_read_state,
  ALTER COLUMN read_state SET DEFAULT 'unread',
  ALTER COLUMN read_state SET NOT NULL,
  ALTER COLUMN wp_post_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS bookmarks_wp_post_id_idx
  ON public.bookmarks (wp_post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookmarks_edition_code_idx
  ON public.bookmarks (edition_code, created_at DESC);

-- === Bookmark collections + counters ===
CREATE TABLE IF NOT EXISTS public.bookmark_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS bookmark_collections_user_idx
  ON public.bookmark_collections (user_id, sort_index NULLS LAST);

ALTER TABLE public.bookmark_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections are readable by owner" ON public.bookmark_collections;
DROP POLICY IF EXISTS "Collections are manageable by owner" ON public.bookmark_collections;

CREATE POLICY "Collections are readable by owner"
  ON public.bookmark_collections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Collections are manageable by owner"
  ON public.bookmark_collections
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.bookmark_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookmarks_collection_id_idx
  ON public.bookmarks (collection_id);

CREATE TABLE IF NOT EXISTS public.bookmark_user_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  collections_count INTEGER NOT NULL DEFAULT 0,
  collection_unread_counts JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookmark_user_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Counters are readable by owner" ON public.bookmark_user_counters;
DROP POLICY IF EXISTS "Counters are manageable by owner" ON public.bookmark_user_counters;

CREATE POLICY "Counters are readable by owner"
  ON public.bookmark_user_counters
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Counters are manageable by owner"
  ON public.bookmark_user_counters
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- === Comment reactions + automatic counters ===
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type public.comment_reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_reactions_comment_idx
  ON public.comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS comment_reactions_user_idx
  ON public.comment_reactions (user_id);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can manage their reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can create their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.comment_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;

CREATE POLICY "Anyone can read reactions"
  ON public.comment_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their reactions"
  ON public.comment_reactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
      SET reactions_count = COALESCE(reactions_count, 0) + 1
      WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
      SET reactions_count = GREATEST(COALESCE(reactions_count, 0) - 1, 0)
      WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_reaction_count_trigger ON public.comment_reactions;
CREATE TRIGGER update_comment_reaction_count_trigger
  AFTER INSERT OR DELETE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_reaction_count();
`;
