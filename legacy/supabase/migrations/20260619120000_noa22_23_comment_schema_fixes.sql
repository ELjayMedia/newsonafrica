-- NOA-22 / NOA-23: Align comment_status enum, create comment_post_counters,
-- reconcile comment_reports column names, and add DB-level counter triggers.
--
-- Context:
--   • The initial schema (20260331110000) created enum values:
--       pending, published, rejected, shadow_hidden, deleted
--   • The codebase and UI expect:
--       pending, active, flagged, hidden, deleted, approved, spam
--   • 20260515112858 attempted `add value 'flagged' after 'active'` but 'active'
--     didn't exist yet, so that migration would have failed on a fresh DB.
--   • comment_post_counters is referenced in types/supabase.d.ts and REST client
--     but was never created in a migration.
--   • comment_reports was created with reporter_user_id but the FK index migration
--     (20260525193000) and types use reporter_id — this migration aligns them.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Extend comment_status enum with the values the codebase relies on.
--     All `add value if not exists` calls are safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.comment_status add value if not exists 'active'        after 'pending';
alter type public.comment_status add value if not exists 'flagged'       after 'active';
alter type public.comment_status add value if not exists 'hidden'        after 'flagged';
alter type public.comment_status add value if not exists 'approved'      after 'hidden';
alter type public.comment_status add value if not exists 'spam'          after 'approved';

-- Legacy values that may be present in old rows; keep them so existing data
-- is never broken, but the application normalises them away on read.
-- 'published' → treated as 'active', 'rejected' → 'deleted', 'shadow_hidden' → 'hidden'

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  Reconcile comment_reports column names.
--     The original DDL used reporter_user_id; the types/indexes use reporter_id.
--     Rename the column so every layer agrees.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1
    from   information_schema.columns
    where  table_schema = 'public'
      and  table_name   = 'comment_reports'
      and  column_name  = 'reporter_user_id'
  ) then
    alter table public.comment_reports rename column reporter_user_id to reporter_id;
  end if;
end
$$;

-- Also add the extended columns that appear in the full schema DDL but may be
-- absent on a database that only ran the original 20260331 migration.
alter table public.comment_reports
  add column if not exists status      text        not null default 'open',
  add column if not exists resolved_by uuid        references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists details     text,
  add column if not exists metadata    jsonb       not null default '{}'::jsonb,
  add column if not exists updated_at  timestamptz not null default now();

-- Patch RLS policies that referenced the old column name.
drop policy if exists "Users can report comments"  on public.comment_reports;
drop policy if exists "Users can view own reports" on public.comment_reports;

create policy "Users can report comments"
  on public.comment_reports for insert
  with check ((select auth.uid()) = reporter_id);

create policy "Users can view own reports"
  on public.comment_reports for select
  using ((select auth.uid()) = reporter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  Create comment_post_counters if it does not already exist.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comment_post_counters (
  wp_post_id      integer     not null,
  edition_code    text        not null,
  total_approved  integer     not null default 0,
  total_pending   integer     not null default 0,
  total_hidden    integer     not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (wp_post_id, edition_code)
);

alter table public.comment_post_counters enable row level security;

drop policy if exists "Anyone can read comment counters" on public.comment_post_counters;
drop policy if exists "Service role manages comment counters" on public.comment_post_counters;

create policy "Anyone can read comment counters"
  on public.comment_post_counters for select
  using (true);

create policy "Service role manages comment counters"
  on public.comment_post_counters
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  Trigger function: keep comment_post_counters in sync whenever a comment
--     status changes (insert, update, delete).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_comment_post_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approved_delta integer := 0;
  v_pending_delta  integer := 0;
  v_hidden_delta   integer := 0;
  v_post_id        integer;
  v_edition        text;
begin
  -- Determine which row's counters to touch and compute deltas.
  if tg_op = 'DELETE' then
    v_post_id := old.wp_post_id;
    v_edition  := old.edition_code;

    -- Subtract old status contribution.
    if old.status in ('active', 'approved', 'published') then
      v_approved_delta := -1;
    elsif old.status = 'pending' then
      v_pending_delta  := -1;
    elsif old.status in ('hidden', 'shadow_hidden', 'flagged', 'spam') then
      v_hidden_delta   := -1;
    end if;

  elsif tg_op = 'INSERT' then
    v_post_id := new.wp_post_id;
    v_edition  := new.edition_code;

    -- Add new status contribution.
    if new.status in ('active', 'approved', 'published') then
      v_approved_delta := 1;
    elsif new.status = 'pending' then
      v_pending_delta  := 1;
    elsif new.status in ('hidden', 'shadow_hidden', 'flagged', 'spam') then
      v_hidden_delta   := 1;
    end if;

  elsif tg_op = 'UPDATE' then
    -- Only act when wp_post_id, edition_code, or status changed.
    if old.wp_post_id = new.wp_post_id
       and old.edition_code = new.edition_code
       and old.status = new.status
    then
      return new;
    end if;

    v_post_id := new.wp_post_id;
    v_edition  := new.edition_code;

    -- Subtract old contribution.
    if old.status in ('active', 'approved', 'published') then
      v_approved_delta := v_approved_delta - 1;
    elsif old.status = 'pending' then
      v_pending_delta  := v_pending_delta  - 1;
    elsif old.status in ('hidden', 'shadow_hidden', 'flagged', 'spam') then
      v_hidden_delta   := v_hidden_delta   - 1;
    end if;

    -- Add new contribution.
    if new.status in ('active', 'approved', 'published') then
      v_approved_delta := v_approved_delta + 1;
    elsif new.status = 'pending' then
      v_pending_delta  := v_pending_delta  + 1;
    elsif new.status in ('hidden', 'shadow_hidden', 'flagged', 'spam') then
      v_hidden_delta   := v_hidden_delta   + 1;
    end if;
  end if;

  -- Upsert the counter row.
  insert into public.comment_post_counters
    (wp_post_id, edition_code, total_approved, total_pending, total_hidden, updated_at)
  values
    (v_post_id, v_edition,
     greatest(v_approved_delta, 0),
     greatest(v_pending_delta,  0),
     greatest(v_hidden_delta,   0),
     now())
  on conflict (wp_post_id, edition_code) do update
    set total_approved = greatest(comment_post_counters.total_approved + excluded.total_approved, 0),
        total_pending  = greatest(comment_post_counters.total_pending  + excluded.total_pending,  0),
        total_hidden   = greatest(comment_post_counters.total_hidden   + excluded.total_hidden,   0),
        updated_at     = now();

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_comment_post_counters_trigger on public.comments;

create trigger sync_comment_post_counters_trigger
  after insert or update of status or delete
  on public.comments
  for each row
  execute function public.sync_comment_post_counters();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  Backfill comment_post_counters from existing comment rows.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.comment_post_counters
  (wp_post_id, edition_code, total_approved, total_pending, total_hidden, updated_at)
select
  wp_post_id,
  edition_code,
  count(*) filter (where status::text in ('active', 'approved', 'published'))  as total_approved,
  count(*) filter (where status::text = 'pending')                              as total_pending,
  count(*) filter (where status::text in ('hidden', 'shadow_hidden', 'flagged', 'spam')) as total_hidden,
  now()
from  public.comments
group by wp_post_id, edition_code
on conflict (wp_post_id, edition_code) do update
  set total_approved = excluded.total_approved,
      total_pending  = excluded.total_pending,
      total_hidden   = excluded.total_hidden,
      updated_at     = excluded.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6.  Fix the FK index on comment_reports that mistakenly referenced reporter_id
--     before the column rename. Drop the old (likely broken) index and recreate.
-- ─────────────────────────────────────────────────────────────────────────────

drop index if exists public.idx_comment_reports_reporter_id;

create index if not exists idx_comment_reports_reporter_id
  on public.comment_reports (reporter_id);
