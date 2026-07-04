-- NOA-93: Search query layer schema extensions.
--
-- 1. `search_content` gains a `total_count` column (window count over the
--    full filtered match set) so the search results page can render real
--    pagination without a second round-trip. Changing a function's return
--    type requires drop + recreate; this migration supersedes the version in
--    20260702120000_content_index.sql (per-migration immutability — never
--    edit an applied migration).
-- 2. `search_suggestions` matches anywhere in the title (backed by the
--    existing `content_index_title_trgm_idx` trigram index) instead of
--    prefix-only, ranking prefix matches first, then earlier in-title
--    matches, then recency.

drop function if exists public.search_content(text, text, text, integer, integer);

create function public.search_content(
  search_query text,
  country_filter text default null,
  category_filter text default null,
  limit_count integer default 20,
  offset_count integer default 0
)
returns table (
  id uuid,
  country text,
  wp_post_id bigint,
  slug text,
  title text,
  excerpt text,
  tags text[],
  categories text[],
  author text,
  published_at timestamptz,
  url_path text,
  featured_image_url text,
  rank real,
  total_count bigint
)
language plpgsql
set search_path = ''
as $$
begin
  return query
  select
    ci.id,
    ci.country,
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
    ts_rank_cd(ci.search_vector, plainto_tsquery('english', search_query)) as rank,
    count(*) over () as total_count
  from public.content_index ci
  where
    ci.search_vector @@ plainto_tsquery('english', search_query)
    and ci.status = 'publish'
    and (country_filter is null or ci.country = country_filter)
    and (category_filter is null or category_filter = any(ci.categories))
  order by rank desc, ci.published_at desc
  limit limit_count
  offset offset_count;
end;
$$;

-- Same signature and return type as before, so create-or-replace suffices.
create or replace function public.search_suggestions(
  search_query text,
  country_filter text default null,
  limit_count integer default 10
)
returns table (
  title text,
  country text,
  slug text,
  url_path text
)
language plpgsql
set search_path = ''
as $$
declare
  -- Escape ILIKE wildcards so user input like "%" can't match everything.
  escaped_query text := replace(replace(replace(search_query, '\', '\\'), '%', '\%'), '_', '\_');
begin
  return query
  select
    ci.title,
    ci.country,
    ci.slug,
    ci.url_path
  from public.content_index ci
  where
    ci.title ilike '%' || escaped_query || '%'
    and ci.status = 'publish'
    and (country_filter is null or ci.country = country_filter)
  order by
    (ci.title ilike escaped_query || '%') desc,
    position(lower(search_query) in lower(ci.title)) asc,
    ci.published_at desc
  limit least(greatest(limit_count, 1), 20);
end;
$$;
