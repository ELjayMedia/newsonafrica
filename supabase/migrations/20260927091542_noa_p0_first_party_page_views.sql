-- NOA-138 / NOA-178: P0 first-party audience analytics.
-- Applied to production as Supabase migration 20260927091542.
-- Server-side service-role writes only. No raw IP, account ID, email or
-- persistent cross-session visitor identifier is stored.

create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 2048),
  edition_code text check (edition_code is null or char_length(edition_code) <= 10),
  content_type text not null default 'other'
    check (content_type in ('home','edition','article','category','tag','author','search','commercial','legal','auth','other')),
  article_id bigint,
  session_id text not null check (char_length(session_id) between 8 and 64),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  device_class text not null default 'unknown'
    check (device_class in ('mobile','tablet','desktop','unknown')),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_analytics_page_views_created_at
  on public.analytics_page_views(created_at desc);
create index if not exists idx_analytics_page_views_path
  on public.analytics_page_views(path);
create index if not exists idx_analytics_page_views_edition_created
  on public.analytics_page_views(edition_code, created_at desc);
create index if not exists idx_analytics_page_views_session_created
  on public.analytics_page_views(session_id, created_at desc);

alter table public.analytics_page_views enable row level security;

revoke all on table public.analytics_page_views from public, anon, authenticated;
grant select, insert on table public.analytics_page_views to service_role;

comment on table public.analytics_page_views is
  'NOA-138: privacy-safe first-party page views. Server-side service-role writes only; no raw IP, account ID, email or persistent cross-session visitor ID.';
comment on column public.analytics_page_views.session_id is
  'Random browser-session identifier stored in sessionStorage; not an authenticated user identifier.';
comment on column public.analytics_page_views.referrer_host is
  'Hostname only. Full referrer URLs and query strings are intentionally not stored.';
