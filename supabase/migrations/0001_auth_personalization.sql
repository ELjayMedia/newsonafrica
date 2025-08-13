-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  country text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profile-select-own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile-upd-own"   on public.profiles for update  to authenticated using (id = auth.uid());
create policy "profile-ins-own"   on public.profiles for insert  to authenticated with check (id = auth.uid());

-- bookmarks
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  slug text not null,
  created_at timestamptz default now(),
  unique (user_id, slug)
);
alter table public.bookmarks enable row level security;
create policy "bm-select-own" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "bm-ins-own"    on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy "bm-del-own"    on public.bookmarks for delete to authenticated using (user_id = auth.uid());

-- comments (moderated)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) <= 2000),
  created_at timestamptz default now(),
  is_approved boolean default false
);
alter table public.comments enable row level security;
create policy "cmt-read-approved" on public.comments for select using (is_approved = true);
create policy "cmt-ins-own" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "cmt-del-own-unapproved" on public.comments for delete to authenticated using (user_id = auth.uid() and is_approved = false);

-- feature flags (optional)
create table if not exists public.feature_flags (
  name text primary key,
  enabled boolean not null default false,
  country text
);
alter table public.feature_flags enable row level security;
create policy "ff-read-all" on public.feature_flags for select using (true);
