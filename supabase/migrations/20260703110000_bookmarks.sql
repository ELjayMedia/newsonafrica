-- NOA-100: bookmarks
--
-- One row per (user, article). Articles are identified the same way as in
-- content_index — (country, wp_post_id) — with the slug snapshotted so the
-- saved-articles page can still build /{country}/article/{slug} URLs even
-- when the content index has no row for the article (index lag, unsynced
-- editions).
--
-- Access model: strictly owner-only. Every policy is scoped to
-- authenticated users and auth.uid() = user_id; anonymous clients can never
-- read or write bookmarks. There is no UPDATE policy — a bookmark is only
-- ever created or removed.

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  country text not null,
  wp_post_id integer not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint bookmarks_country_format check (country ~ '^[a-z]{2}$'),
  constraint bookmarks_wp_post_id_positive check (wp_post_id > 0),
  constraint bookmarks_slug_length check (char_length(slug) between 1 and 200),
  constraint bookmarks_user_article_key unique (user_id, country, wp_post_id)
);

comment on table public.bookmarks is
  'Saved articles (NOA-100): one row per user + article, article keyed by (country, wp_post_id) to match content_index.';

-- Listing a user''s saved articles, newest first.
create index if not exists bookmarks_user_created_at_idx
  on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

drop policy if exists "Users read own bookmarks" on public.bookmarks;
create policy "Users read own bookmarks"
  on public.bookmarks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own bookmarks" on public.bookmarks;
create policy "Users insert own bookmarks"
  on public.bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own bookmarks" on public.bookmarks;
create policy "Users delete own bookmarks"
  on public.bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Bookmarks are private: nothing for anonymous clients.
revoke all on public.bookmarks from anon;
