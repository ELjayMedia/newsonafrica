-- Content Index Table for Full-Text Search
-- Replaces Algolia with Supabase Postgres FTS

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Main content index table
CREATE TABLE IF NOT EXISTS public.content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_code TEXT NOT NULL,
  wp_post_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_plain TEXT,
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url_path TEXT NOT NULL,
  featured_image_url TEXT,
  search_vector tsvector,
  UNIQUE (edition_code, wp_post_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS content_index_edition_code_idx ON public.content_index (edition_code);
CREATE INDEX IF NOT EXISTS content_index_wp_post_id_idx ON public.content_index (wp_post_id);
CREATE INDEX IF NOT EXISTS content_index_published_at_idx ON public.content_index (published_at DESC);
CREATE INDEX IF NOT EXISTS content_index_updated_at_idx ON public.content_index (updated_at DESC);

-- GIN index for full-text search (most important for performance)
CREATE INDEX IF NOT EXISTS content_index_search_vector_idx ON public.content_index USING GIN (search_vector);

-- GIN index for array searches (tags, categories)
CREATE INDEX IF NOT EXISTS content_index_tags_idx ON public.content_index USING GIN (tags);
CREATE INDEX IF NOT EXISTS content_index_categories_idx ON public.content_index USING GIN (categories);

-- Trigram index for prefix/typo-tolerant search on title
CREATE INDEX IF NOT EXISTS content_index_title_trgm_idx ON public.content_index USING GIN (title gin_trgm_ops);

-- Function to update search_vector automatically
CREATE OR REPLACE FUNCTION public.content_index_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content_plain, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.categories, ' '), '')), 'B');
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector on INSERT/UPDATE
DROP TRIGGER IF EXISTS content_index_search_vector_trigger ON public.content_index;
CREATE TRIGGER content_index_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.content_index
  FOR EACH ROW
  EXECUTE FUNCTION public.content_index_update_search_vector();

-- RLS: Public read access, service role write access
ALTER TABLE public.content_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can search content" ON public.content_index;
DROP POLICY IF EXISTS "Service role can manage content index" ON public.content_index;

CREATE POLICY "Anyone can search content"
  ON public.content_index FOR SELECT USING (true);

CREATE POLICY "Service role can manage content index"
  ON public.content_index
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Sync cursor table to track last synced timestamp per edition
CREATE TABLE IF NOT EXISTS public.content_sync_cursor (
  edition_code TEXT PRIMARY KEY,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_wp_post_id INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_sync_cursor_updated_at_idx ON public.content_sync_cursor (updated_at DESC);

ALTER TABLE public.content_sync_cursor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage sync cursor" ON public.content_sync_cursor;

CREATE POLICY "Service role can manage sync cursor"
  ON public.content_sync_cursor
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Helper function: Search with ranking
CREATE OR REPLACE FUNCTION public.search_content(
  search_query TEXT,
  edition_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  edition_code TEXT,
  wp_post_id INTEGER,
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  tags TEXT[],
  categories TEXT[],
  author TEXT,
  published_at TIMESTAMPTZ,
  url_path TEXT,
  featured_image_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.edition_code,
    ci.wp_post_id,
    ci.slug,
    ci.title,
    ci.excerpt,
    ci.tags,
    ci.categories,
    ci.author,
    ci.published_at,
    ci.url_path,
    ci.featured_image_url,
    ts_rank_cd(ci.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM public.content_index ci
  WHERE 
    ci.search_vector @@ plainto_tsquery('english', search_query)
    AND (edition_filter IS NULL OR ci.edition_code = edition_filter)
    AND (category_filter IS NULL OR category_filter = ANY(ci.categories))
  ORDER BY rank DESC, ci.published_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get suggestions (prefix match on title)
CREATE OR REPLACE FUNCTION public.search_suggestions(
  search_query TEXT,
  edition_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  title TEXT,
  edition_code TEXT,
  slug TEXT,
  url_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.title,
    ci.edition_code,
    ci.slug,
    ci.url_path
  FROM public.content_index ci
  WHERE 
    ci.title ILIKE search_query || '%'
    AND (edition_filter IS NULL OR ci.edition_code = edition_filter)
  ORDER BY ci.published_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
