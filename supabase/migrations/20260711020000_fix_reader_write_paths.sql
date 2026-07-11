-- Fix two production write-path breakages for signed-in readers (bookmarks +
-- comments), found during NOA-19 / NOA-22 QA.
--
-- The referenced objects (bookmarks_can_* policy helpers, the
-- sync_comment_post_counters trigger function, comment_post_counters table) were
-- all created out-of-band and are absent on a database built purely from this
-- migration history — e.g. a Supabase preview branch — so every statement is
-- guarded on the object existing (same rationale as 20260711000000).

-- 1) Bookmarks: the RLS policies call bookmarks_can_insert/update/delete
--    (SECURITY DEFINER), but `authenticated` had no EXECUTE, so every
--    insert/update/delete failed with "permission denied for function".
do $$
begin
  if to_regprocedure('public.bookmarks_can_insert(uuid)') is not null then
    grant execute on function public.bookmarks_can_insert(uuid) to authenticated;
  end if;
  if to_regprocedure('public.bookmarks_can_update(uuid)') is not null then
    grant execute on function public.bookmarks_can_update(uuid) to authenticated;
  end if;
  if to_regprocedure('public.bookmarks_can_delete(uuid)') is not null then
    grant execute on function public.bookmarks_can_delete(uuid) to authenticated;
  end if;
end
$$;

-- 2) Comments: sync_comment_post_counters() compared status against the enum
--    literals 'published' and 'shadow_hidden', which are not values of the
--    current comment_status enum {active,flagged,hidden,deleted,pending,approved,
--    spam}. Postgres casts every literal in an IN-list to the enum, so the
--    invalid literal raised 22P02 and aborted every comment insert. Recreate the
--    function using only valid statuses (visible = active/approved; hidden bucket
--    = hidden/flagged/spam).
do $$
begin
  if to_regprocedure('public.sync_comment_post_counters()') is null then
    return;
  end if;
  execute $mig$
create or replace function public.sync_comment_post_counters()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $body$
declare
  v_approved_delta integer := 0;
  v_pending_delta  integer := 0;
  v_hidden_delta   integer := 0;
  v_post_id        integer;
  v_edition        text;
begin
  if tg_op = 'DELETE' then
    v_post_id := old.wp_post_id;
    v_edition  := old.edition_code;
    if old.status in ('active', 'approved') then v_approved_delta := -1;
    elsif old.status = 'pending' then v_pending_delta  := -1;
    elsif old.status in ('hidden', 'flagged', 'spam') then v_hidden_delta := -1;
    end if;
  elsif tg_op = 'INSERT' then
    v_post_id := new.wp_post_id;
    v_edition  := new.edition_code;
    if new.status in ('active', 'approved') then v_approved_delta := 1;
    elsif new.status = 'pending' then v_pending_delta  := 1;
    elsif new.status in ('hidden', 'flagged', 'spam') then v_hidden_delta := 1;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.wp_post_id = new.wp_post_id and old.edition_code = new.edition_code and old.status = new.status then return new; end if;
    v_post_id := new.wp_post_id;
    v_edition  := new.edition_code;
    if old.status in ('active', 'approved') then v_approved_delta := v_approved_delta - 1;
    elsif old.status = 'pending' then v_pending_delta  := v_pending_delta  - 1;
    elsif old.status in ('hidden', 'flagged', 'spam') then v_hidden_delta := v_hidden_delta - 1;
    end if;
    if new.status in ('active', 'approved') then v_approved_delta := v_approved_delta + 1;
    elsif new.status = 'pending' then v_pending_delta  := v_pending_delta  + 1;
    elsif new.status in ('hidden', 'flagged', 'spam') then v_hidden_delta := v_hidden_delta + 1;
    end if;
  end if;
  insert into public.comment_post_counters (wp_post_id, edition_code, total_approved, total_pending, total_hidden, updated_at)
  values (v_post_id, v_edition, greatest(v_approved_delta, 0), greatest(v_pending_delta, 0), greatest(v_hidden_delta, 0), now())
  on conflict (wp_post_id, edition_code) do update
    set total_approved = greatest(comment_post_counters.total_approved + excluded.total_approved, 0),
        total_pending  = greatest(comment_post_counters.total_pending  + excluded.total_pending,  0),
        total_hidden   = greatest(comment_post_counters.total_hidden   + excluded.total_hidden,   0),
        updated_at     = now();
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$body$;
  $mig$;
end
$$;
