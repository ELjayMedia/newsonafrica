-- Restore a windowed total_count on the search_content overload the app calls
-- (search_query, country_filter, category_filter, limit_count, offset_count,
-- edition_filter) so search can compute exact result counts + numbered pages.
--
-- The live schema keys editions by edition_code; this overload keeps the
-- country_filter parameter for backward compatibility (resolved via COALESCE
-- with edition_filter). Postgres can't add a RETURNS TABLE column via
-- CREATE OR REPLACE, so drop + recreate; the body is otherwise unchanged.
DROP FUNCTION IF EXISTS public.search_content(text, text, text, integer, integer, text);

CREATE FUNCTION public.search_content(
  search_query text,
  country_filter text DEFAULT NULL::text,
  category_filter text DEFAULT NULL::text,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0,
  edition_filter text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid,
  edition_code text,
  wp_post_id integer,
  slug text,
  title text,
  excerpt text,
  tags text[],
  categories text[],
  author text,
  published_at timestamp with time zone,
  url_path text,
  featured_image_url text,
  rank real,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  resolved_edition text;
BEGIN
  resolved_edition := COALESCE(edition_filter, country_filter);

  RETURN QUERY
  SELECT
    ci.id,
    ci.edition_code,
    ci.wp_post_id::integer,
    ci.slug,
    ci.title,
    ci.excerpt,
    ci.tags,
    ci.categories,
    ci.author,
    ci.published_at,
    ci.url_path,
    ci.featured_image_url,
    ts_rank_cd(ci.search_vector, plainto_tsquery('english', search_query)) AS rank,
    count(*) OVER() AS total_count
  FROM public.content_index ci
  WHERE
    ci.search_vector @@ plainto_tsquery('english', search_query)
    AND (resolved_edition IS NULL OR ci.edition_code = resolved_edition)
    AND (category_filter IS NULL OR category_filter = ANY(ci.categories))
  ORDER BY rank DESC, ci.published_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_content(text, text, text, integer, integer, text)
  TO anon, authenticated, service_role;
