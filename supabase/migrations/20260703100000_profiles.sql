-- NOA-99: user profiles
--
-- One row per auth user: public display identity (display_name, avatar_url)
-- plus the reader's preferred country edition. Rows are auto-created by a
-- trigger on auth.users signup (pattern carried over from the legacy app's
-- consolidated handle_new_user trigger).
--
-- Access model:
--   * owner-write: only the authenticated owner may insert/update their row
--   * public read of display fields: anonymous clients get column-scoped
--     SELECT on (id, display_name, avatar_url, created_at) only;
--     authenticated clients may read full rows (preferred_country is a
--     two-letter edition code, not sensitive)
--   * no client deletes — rows are removed via the auth.users cascade

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048),
  constraint profiles_preferred_country_format
    check (preferred_country is null or preferred_country ~ '^[a-z]{2}$')
);

comment on table public.profiles is
  'Reader profiles (NOA-99): display identity + preferred country edition, 1:1 with auth.users.';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-scope anonymous reads to the public display fields.
revoke select on public.profiles from anon;
grant select (id, display_name, avatar_url, created_at) on public.profiles to anon;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup (email/password and OAuth alike).
-- SECURITY DEFINER + pinned search_path so the auth admin role can insert
-- despite RLS; ON CONFLICT keeps it idempotent for backfills.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any pre-existing auth users without a profile row.
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  ),
  nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
