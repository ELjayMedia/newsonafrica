-- NOA-142: Sponsor/ad event logging for campaign reporting
-- Creates tables for tracking ad impressions and clicks

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('impression', 'click')),
  placement_type text not null check (placement_type in ('ad_slot', 'sponsored_card', 'takeover', 'native')),
  campaign_id text,
  sponsor_name text,
  edition_code text not null,
  vertical text,
  country text not null,
  article_id bigint,
  session_id text,
  user_agent text,
  ip_hash text,
  metadata jsonb
);

-- Campaign summary materialized view
create materialized view if not exists public.campaign_summary as
select
  campaign_id,
  sponsor_name,
  edition_code,
  placement_type,
  count(*) filter (where event_type = 'impression') as impressions,
  count(*) filter (where event_type = 'click') as clicks,
  case
    when count(*) filter (where event_type = 'impression') > 0
    then round(100.0 * count(*) filter (where event_type = 'click') / count(*) filter (where event_type = 'impression'), 2)
    else 0
  end as ctr_percent,
  min(created_at) as first_event_at,
  max(created_at) as last_event_at
from public.ad_events
where campaign_id is not null
group by campaign_id, sponsor_name, edition_code, placement_type;

-- Index for fast campaign lookups
create index idx_ad_events_campaign on public.ad_events(campaign_id);
create index idx_ad_events_created on public.ad_events(created_at);
create index idx_ad_events_edition on public.ad_events(edition_code);

-- RLS: service-role only
alter table public.ad_events enable row level security;

create policy "Service role can insert ad events"
  on public.ad_events
  for insert
  to service_role
  with check (true);

create policy "Service role can read ad events"
  on public.ad_events
  for select
  to service_role
  using (true);

-- Function to record ad events
create or replace function public.log_ad_event(
  p_event_type text,
  p_placement_type text,
  p_edition_code text,
  p_country text,
  p_campaign_id text default null,
  p_sponsor_name text default null,
  p_vertical text default null,
  p_article_id bigint default null,
  p_session_id text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.ad_events (
    event_type,
    placement_type,
    edition_code,
    country,
    campaign_id,
    sponsor_name,
    vertical,
    article_id,
    session_id,
    metadata
  ) values (
    p_event_type,
    p_placement_type,
    p_edition_code,
    p_country,
    p_campaign_id,
    p_sponsor_name,
    p_vertical,
    p_article_id,
    p_session_id,
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Function to refresh campaign summary
create or replace function public.refresh_campaign_summary()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view public.campaign_summary;
end;
$$;

comment on table public.ad_events is 'NOA-142: Ad/sponsor event logging for campaign reporting';
comment on materialized view public.campaign_summary is 'NOA-142: Campaign performance summary (impressions, clicks, CTR)';
