-- NOA-137: search query logging.
--
-- Captures one row per executed search (first page), including zero-result
-- searches, so we can report top queries, zero-result rate, and search volume
-- by edition (feeds the search-analytics KPIs in docs/audience-metrics.md).
--
-- Writes happen server-side via the service-role client (fire-and-forget, after
-- the response), so the table grants NO client policies: RLS default-denies all
-- anon/authenticated access. `user_id` is nullable — search is anonymous and
-- stays cookie-free, so it is not populated today.

create table if not exists public.search_query_log (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  edition_code text,
  result_count integer not null default 0,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists search_query_log_created_at_idx
  on public.search_query_log (created_at desc);

-- Case-insensitive grouping for "top queries".
create index if not exists search_query_log_query_idx
  on public.search_query_log (lower(query));

alter table public.search_query_log enable row level security;

comment on table public.search_query_log is
  'NOA-137 search query logging. Service-role writes only (server-side, fire-and-forget); RLS default-denies client access.';
