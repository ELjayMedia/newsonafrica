-- NOA-181 / NOA-178: capture qualified advertiser/partner enquiries.
-- Applied to production as Supabase migration 20260927091915.
-- Server-side service-role access only. NOA-186 will route qualified records to CRM.

create table if not exists public.commercial_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new','qualified','proposal','negotiation','won','lost','spam')),
  organisation text not null check (char_length(organisation) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 50),
  market text not null check (char_length(market) between 2 and 120),
  objective text not null check (char_length(objective) between 5 and 600),
  campaign_timing text check (campaign_timing is null or char_length(campaign_timing) <= 200),
  budget_range text check (budget_range is null or char_length(budget_range) <= 120),
  product_interest text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 2000),
  source_path text check (source_path is null or char_length(source_path) <= 512),
  source_campaign text check (source_campaign is null or char_length(source_campaign) <= 120),
  consent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_commercial_enquiries_created
  on public.commercial_enquiries(created_at desc);
create index if not exists idx_commercial_enquiries_status_created
  on public.commercial_enquiries(status, created_at desc);

alter table public.commercial_enquiries enable row level security;

revoke all on table public.commercial_enquiries from public, anon, authenticated;
grant select, insert, update on table public.commercial_enquiries to service_role;

comment on table public.commercial_enquiries is
  'NOA-181: advertiser/partner enquiries captured server-side for qualification and later CRM routing (NOA-186).';
