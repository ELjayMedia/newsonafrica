create or replace function public.content_index_health_report()
returns table (
  edition_code text,
  rows bigint,
  missing_vector bigint,
  pct_tags numeric,
  pct_categories numeric,
  pct_content numeric,
  oldest date,
  newest date,
  sync_status text,
  last_synced_at timestamptz,
  error_message text
)
language sql
security definer
set search_path = ''
as $$
  select
    ci.edition_code,
    count(*)::bigint as rows,
    count(*) filter (where ci.search_vector is null)::bigint as missing_vector,
    round(100.0 * count(*) filter (where coalesce(array_length(ci.tags,1),0) > 0) / nullif(count(*),0), 1) as pct_tags,
    round(100.0 * count(*) filter (where coalesce(array_length(ci.categories,1),0) > 0) / nullif(count(*),0), 1) as pct_categories,
    round(100.0 * count(*) filter (where ci.content_plain is not null) / nullif(count(*),0), 1) as pct_content,
    min(ci.published_at)::date as oldest,
    max(ci.published_at)::date as newest,
    c.sync_status,
    c.last_synced_at,
    c.error_message
  from public.content_index ci
  left join public.content_sync_cursor c on c.edition_code = ci.edition_code
  group by ci.edition_code, c.sync_status, c.last_synced_at, c.error_message
  order by rows desc;
$$;

comment on function public.content_index_health_report() is
  'NOA-140: Content-index health report for scheduled monitoring. Returns per-edition row counts, search coverage, and sync status.';
