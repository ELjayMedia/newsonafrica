create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  path text,
  ip_hash text,
  created_at timestamptz default now()
);

alter table public.audit_events enable row level security;
create policy "audit-admin-read" on public.audit_events for select using (false);
