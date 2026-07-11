-- NOA-129: first-party newsletter capture.
--
-- Owned-audience storage in Supabase (no ESP lock-in; syncable to an email
-- platform later). Sign-up is anonymous, so writes go exclusively through the
-- service-role server action (lib/newsletter/actions.ts) which validates + rate
-- limits — the table itself grants NO client policies, so RLS default-denies all
-- anon/authenticated access. This mirrors the NOA-143 rule: no client write path
-- to a table that carries PII / audience value.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  edition_code text,
  source_vertical text,
  source_campaign text,
  source_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

-- One row per address, case-insensitive; the action upserts on this.
create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

-- Recency queries for exports/reporting.
create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

-- RLS on with no policies: anon/authenticated get no read or write. The
-- service-role server action bypasses RLS; that is the only write path.
alter table public.newsletter_subscribers enable row level security;

comment on table public.newsletter_subscribers is
  'NOA-129 newsletter capture. Service-role writes only (server action); RLS default-denies client access.';
