-- NOA-101: article comments (threaded, moderated)
--
-- Articles are identified by (country, wp_post_id), matching content_index
-- and bookmarks. user_id references public.profiles(id) — not auth.users —
-- so PostgREST can embed author display fields (the pattern the legacy app
-- had to retrofit in its 20260417120000 migration).
--
-- Moderation status enum: the legacy schema accumulated nine values
-- (pending / published / rejected / shadow_hidden / deleted + active /
-- flagged / hidden / approved / spam) across three migrations. This rebuild
-- consolidates them to four:
--   pending  – awaiting review, visible only to its author
--   approved – publicly visible (legacy: published, active, approved)
--   hidden   – moderator-hidden, visible only to its author
--              (legacy: shadow_hidden, hidden, flagged, spam)
--   deleted  – removed; a stub row is kept (body cleared by the app) so
--              threads with replies keep their structure
--              (legacy: rejected, deleted)
--
-- Comments post as 'approved' (post-moderation). To switch the site to
-- pre-moderation, flip the column default to 'pending' and change the
-- insert policy's status check to match — no application-code change needed.
--
-- Threading: parent_id points at the direct parent; root_id at the
-- top-level comment of the thread and is maintained by trigger, so a whole
-- thread can be fetched with one indexed query per page of roots.

create type public.comment_status as enum ('pending', 'approved', 'hidden', 'deleted');

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  wp_post_id integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  root_id uuid references public.comments (id) on delete cascade,
  body text not null,
  status public.comment_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint comments_country_format check (country ~ '^[a-z]{2}$'),
  constraint comments_wp_post_id_positive check (wp_post_id > 0),
  constraint comments_body_length check (char_length(body) <= 4000),
  constraint comments_body_present check (status = 'deleted' or char_length(btrim(body)) > 0)
);

comment on table public.comments is
  'Article comments (NOA-101): threaded via parent_id/root_id, moderated via comment_status, article keyed by (country, wp_post_id).';

-- Cursor pagination over top-level comments, newest first.
create index if not exists comments_article_roots_idx
  on public.comments (country, wp_post_id, created_at desc, id desc)
  where parent_id is null;

-- Fetching every reply for a page of threads in one query.
create index if not exists comments_root_created_at_idx
  on public.comments (root_id, created_at asc);

create index if not exists comments_parent_id_idx
  on public.comments (parent_id);

create index if not exists comments_user_id_created_at_idx
  on public.comments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Thread integrity: derive root_id from the parent (or self for top-level
-- comments) and refuse replies that cross articles. SECURITY DEFINER so the
-- parent lookup is not subject to the inserting user's RLS visibility.
-- ---------------------------------------------------------------------------

create or replace function public.set_comment_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_row public.comments%rowtype;
begin
  if new.parent_id is null then
    new.root_id := new.id;
  else
    select * into parent_row from public.comments where id = new.parent_id;
    if not found then
      raise exception 'Parent comment % does not exist', new.parent_id;
    end if;
    if parent_row.country <> new.country or parent_row.wp_post_id <> new.wp_post_id then
      raise exception 'Reply must belong to the same article as its parent';
    end if;
    if parent_row.status = 'deleted' then
      raise exception 'Cannot reply to a deleted comment';
    end if;
    new.root_id := parent_row.root_id;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_set_thread on public.comments;
create trigger comments_set_thread
  before insert on public.comments
  for each row execute function public.set_comment_thread();

-- ---------------------------------------------------------------------------
-- updated_at maintenance + status-transition guard. Authors may only move
-- their comment to 'deleted'; every other status change is reserved for the
-- service role (moderation, NOA-102).
-- ---------------------------------------------------------------------------

create or replace function public.guard_comment_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status <> 'deleted'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only moderators can change comment status';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists comments_guard_update on public.comments;
create trigger comments_guard_update
  before update on public.comments
  for each row execute function public.guard_comment_update();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.comments enable row level security;

-- Everyone (anon included) reads approved comments plus deleted stubs (the
-- app clears the body on delete, so a stub only reveals that a comment
-- existed — needed to keep threads with replies renderable). Authors also
-- see their own pending/hidden comments.
drop policy if exists "Visible comments are readable" on public.comments;
create policy "Visible comments are readable"
  on public.comments
  for select
  using (
    status in ('approved', 'deleted')
    or (select auth.uid()) = user_id
  );

-- Authors insert their own comments; status is pinned to the posting
-- default so nobody can self-assign another moderation state. Under
-- pre-moderation this check becomes `status = 'pending'`.
drop policy if exists "Users insert own comments" on public.comments;
create policy "Users insert own comments"
  on public.comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'approved'
  );

-- Authors edit their own non-deleted comments and may soft-delete them.
-- The guard trigger blocks any other status transition.
drop policy if exists "Users update own comments" on public.comments;
create policy "Users update own comments"
  on public.comments
  for update
  to authenticated
  using ((select auth.uid()) = user_id and status <> 'deleted')
  with check ((select auth.uid()) = user_id);

-- No client-side hard deletes; removal is the soft 'deleted' status.
-- (Service-role moderation bypasses RLS.)
