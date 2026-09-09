-- Harden Supabase objects that were unintentionally exposed through the Data API.
-- Applied to production first as migration 20260909004632.

-- Paystack webhook replay protection is server-side only. The table was created
-- without RLS, which made its payload hashes writable/readable by client roles.
alter table public.webhook_events enable row level security;
revoke all on table public.webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.webhook_events to service_role;

drop policy if exists webhook_events_service_role on public.webhook_events;
create policy webhook_events_service_role
  on public.webhook_events
  for all
  to service_role
  using (true)
  with check (true);

-- Campaign reporting is an internal/server-side surface.
revoke all on table public.campaign_summary from public, anon, authenticated;
grant select on table public.campaign_summary to service_role;

-- Internal health/ad RPCs should never be callable from anonymous or reader
-- sessions. Keep them available to service-role server code only.
alter function public.content_index_health_report() set search_path = '';
revoke execute on function public.content_index_health_report() from public, anon, authenticated;
grant execute on function public.content_index_health_report() to service_role;

alter function public.log_ad_event(text,text,text,text,text,text,text,bigint,text,jsonb) set search_path = '';
revoke execute on function public.log_ad_event(text,text,text,text,text,text,text,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.log_ad_event(text,text,text,text,text,text,text,bigint,text,jsonb) to service_role;

alter function public.refresh_campaign_summary() set search_path = '';
revoke execute on function public.refresh_campaign_summary() from public, anon, authenticated;
grant execute on function public.refresh_campaign_summary() to service_role;

-- Subscription helpers do not need SECURITY DEFINER. Running as invoker means
-- the existing subscriptions RLS policy restricts signed-in readers to their
-- own rows, while service_role retains its normal server-side bypass.
alter function public.user_has_active_subscription(uuid) security invoker;
alter function public.user_has_active_subscription(uuid) set search_path = '';
revoke execute on function public.user_has_active_subscription(uuid) from public, anon;
grant execute on function public.user_has_active_subscription(uuid) to authenticated, service_role;

alter function public.get_active_subscription(uuid) security invoker;
alter function public.get_active_subscription(uuid) set search_path = '';
revoke execute on function public.get_active_subscription(uuid) from public, anon;
grant execute on function public.get_active_subscription(uuid) to authenticated, service_role;

-- Trigger helpers are invoked by Postgres, not by the Data API. Remove direct
-- reader execution and pin their lookup paths.
alter function public.sync_comment_post_counters() set search_path = pg_catalog, public;
revoke execute on function public.sync_comment_post_counters() from public, anon, authenticated;
grant execute on function public.sync_comment_post_counters() to service_role;

alter function public.expire_old_credentials() set search_path = pg_catalog, public;
alter function public.generate_credential_number() set search_path = pg_catalog, public;
alter function public.most_read_content(text, integer) set search_path = '';
alter function public.set_credential_number() set search_path = pg_catalog, public;
alter function public.set_updated_at() set search_path = pg_catalog, public;

-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists idx_comment_reports_resolved_by
  on public.comment_reports(resolved_by);
create index if not exists idx_credential_verifications_credential_id
  on public.credential_verifications(credential_id);
create index if not exists idx_crew_members_credential_id
  on public.crew_members(credential_id);
create index if not exists idx_equipment_assigned_to
  on public.equipment(assigned_to);
