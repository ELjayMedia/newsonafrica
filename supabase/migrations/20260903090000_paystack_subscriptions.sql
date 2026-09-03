-- NOA-144: Paystack payment flow for the rebuild
-- Creates webhook_events table and subscription helpers

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'paystack',
  payload_hash text unique not null,
  created_at timestamptz not null default now()
);

-- Add payment_provider to subscriptions if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'subscriptions' and column_name = 'payment_provider') then
    alter table public.subscriptions add column payment_provider text;
  end if;
end $$;

-- Helper: check if user has active subscription
create or replace function public.user_has_active_subscription(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and (end_date is null or end_date > now())
  );
$$;

-- Helper: get active subscription for user
create or replace function public.get_active_subscription(p_user_id uuid)
returns json
language sql
security definer
set search_path = ''
as $$
  select row_to_json(s.*)
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status = 'active'
    and (s.end_date is null or s.end_date > now())
  limit 1;
$$;

comment on table public.webhook_events is 'NOA-144: Idempotent webhook event log (payload_hash unique)';
comment on function public.user_has_active_subscription(uuid) is 'NOA-144: Check if user has an active subscription';
comment on function public.get_active_subscription(uuid) is 'NOA-144: Get active subscription details for user';
