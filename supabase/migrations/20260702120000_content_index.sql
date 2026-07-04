-- NOA-87: Content index for search + most-read.
--
-- content_index mirrors the subset of each WordPress post's fields needed to
-- serve search and "most read" without hitting WordPress on every request.
-- It is populated by lib/content-sync (backfill + webhook-triggered sync)
-- and is safe to fully rebuild at any time from WordPress (source of truth).

create extension if not exists "pg_trgm";

create table if not exists public.content_index (
  id uuid primary key default gen_random_uuid(),
  -- WordPress identity
  wp_post_id bigint not null,
  country text not null,
  slug text not null,
  url_path text not null,
  status text not null default 'publish',
  -- Display fields
  title text not null,
  excerpt text,
  content_plain text,
  author text,
  categories text[] not null default '{}',
  tags text[] not null default '{}',
  featured_image_url text,
  -- Timestamps
  published_at timestamptz not null,
  updated_at timestamptz not null default now(),
  -- Most-read: incremented by the reading surface (out of scope here; the
  -- column exists so that phase doesn't need another migration).
  view_count bigint not null default 0,
  -- Full-text search vector, kept in sync by the trigger below.
  search_vector tsvector,
  constraint content_index_country_wp_post_id_key unique (country, wp_post_id)
);

create index if not exists content_index_country_idx on public.content_index (country);
create index if not exists content_index_wp_post_id_idx on public.content_index (wp_post_id);
create index if not exists content_index_published_at_idx on public.content_index (published_at desc);
create index if not exists content_index_updated_at_idx on public.content_index (updated_at desc);
create index if not exists content_index_view_count_idx on public.content_index (country, view_count desc);
create index if not exists content_index_search_vector_idx on public.content_index using gin (search_vector);
create index if not exists content_index_tags_idx on public.content_index using gin (tags);
create index if not exists content_index_categories_idx on public.content_index using gin (categories);
create index if not exists content_index_title_trgm_idx on public.content_index using gin (title gin_trgm_ops);

create or replace function public.content_index_update_search_vector()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.content_plain, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.categories, ' '), '')), 'B');

  new.updated_at := now();
  return new;
end;
$$ language plpgsql set search_path = '';

drop trigger if exists content_index_search_vector_trigger on public.content_index;
create trigger content_index_search_vector_trigger
  before insert or update on public.content_index
  for each row
  execute function public.content_index_update_search_vector();

alter table public.content_index enable row level security;

drop policy if exists "Anyone can read the content index" on public.content_index;
create policy "Anyone can read the content index"
  on public.content_index for select
  using (true);

drop policy if exists "Service role can manage the content index" on public.content_index;
create policy "Service role can manage the content index"
  on public.content_index
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Tracks backfill/sync progress per country edition.
create table if not exists public.content_sync_cursor (
  country text primary key,
  last_synced_at timestamptz not null default now(),
  last_wp_post_id bigint,
  sync_status text not null default 'idle',
  error_message text,
  updated_at timestamptz not null default now()
);

alter table public.content_sync_cursor enable row level security;

drop policy if exists "Service role can manage the sync cursor" on public.content_sync_cursor;
create policy "Service role can manage the sync cursor"
  on public.content_sync_cursor
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Ranked full-text search, used by the Search phase.
create or replace function public.search_content(
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
  rank real
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
    ts_rank_cd(ci.search_vector, plainto_tsquery('english', search_query)) as rank
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

-- Prefix-match title suggestions for the search-as-you-type box.
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
begin
  return query
  select
    ci.title,
    ci.country,
    ci.slug,
    ci.url_path
  from public.content_index ci
  where
    ci.title ilike search_query || '%'
    and ci.status = 'publish'
    and (country_filter is null or ci.country = country_filter)
  order by ci.published_at desc
  limit limit_count;
end;
$$;

-- Most-read within a country, ordered by view_count.
create or replace function public.most_read_content(
  country_filter text,
  limit_count integer default 10
)
returns table (
  id uuid,
  country text,
  wp_post_id bigint,
  slug text,
  title text,
  excerpt text,
  url_path text,
  featured_image_url text,
  view_count bigint,
  published_at timestamptz
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
    ci.url_path,
    ci.featured_image_url,
    ci.view_count,
    ci.published_at
  from public.content_index ci
  where
    ci.status = 'publish'
    and ci.country = country_filter
  order by ci.view_count desc, ci.published_at desc
  limit limit_count;
end;
$$;
