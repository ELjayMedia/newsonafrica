-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  country_pref text,
  language_pref text
);
alter table public.profiles enable row level security;
create policy if not exists "Profiles are readable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy if not exists "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Bookmarks table
create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  country text,
  saved_at timestamptz not null default now(),
  unique(user_id, article_id)
);
alter table public.bookmarks enable row level security;
create policy if not exists "Bookmarks are readable by owner" on public.bookmarks
  for select using (auth.uid() = user_id);
create policy if not exists "Bookmarks are manageable by owner" on public.bookmarks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Comments table
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  body text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  country text,
  status text default 'active',
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy if not exists "Anyone can read comments" on public.comments
  for select using (true);
create policy if not exists "Users can insert own comments" on public.comments
  for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own comments" on public.comments
  for update using (auth.uid() = user_id);
create policy if not exists "Users can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text,
  provider_customer_id text,
  provider_sub_id text,
  status text,
  current_period_end timestamptz
);
alter table public.subscriptions enable row level security;
create policy if not exists "Users manage own subscriptions" on public.subscriptions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User preferences
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sections text[],
  blocked_topics text[],
  countries text[]
);
alter table public.user_preferences enable row level security;
create policy if not exists "Users manage own preferences" on public.user_preferences
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Countries lookup
create table if not exists public.countries (
  iso text primary key,
  name text not null,
  flag_emoji text,
  wp_term_id integer,
  slug text
);
alter table public.countries enable row level security;
create policy if not exists "Anyone can read countries" on public.countries
  for select using (true);
create policy if not exists "Service role can manage countries" on public.countries
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Enable realtime on comments
alter publication supabase_realtime add table public.comments;
