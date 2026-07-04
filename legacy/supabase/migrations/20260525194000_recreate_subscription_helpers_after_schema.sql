-- Recreate subscription helper functions after public.subscriptions exists.

create or replace function public.user_has_active_subscription(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and (renewal_date is null or renewal_date > now())
  );
end;
$$;

create or replace function public.get_active_subscription(p_user_id uuid)
returns setof public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select *
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
    and (renewal_date is null or renewal_date > now())
  order by created_at desc
  limit 1;
end;
$$;

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status)
  where status = 'active';

create index if not exists subscriptions_renewal_date_idx
  on public.subscriptions (renewal_date)
  where renewal_date is not null;

comment on function public.user_has_active_subscription(uuid)
  is 'Check if user has an active, non-expired subscription';

comment on function public.get_active_subscription(uuid)
  is 'Get user active subscription record';
