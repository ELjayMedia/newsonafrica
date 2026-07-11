-- NOA-148: remove redundant, overlapping triggers on public.comments.
--
-- The table accumulated duplicate triggers across earlier migrations, so each
-- write ran the same maintenance more than once: post counters were counted
-- up to 3x, replies_count 2x, and updated_at was stamped by three triggers.
-- Keep exactly one canonical trigger per concern and drop the duplicates.
--
-- Canonical triggers kept (not dropped here):
--   * sync_comment_post_counters_trigger -> comment_post_counters (the function
--     fixed in 20260711020000 to use only valid comment_status values)
--   * trg_replies_ins / trg_replies_del  -> comments.replies_count
--   * trg_comments_touch                 -> comments.updated_at
--
-- The comments table was created out-of-band (no migration creates it), so
-- guard on it existing for a fresh-DB (preview branch) replay.
--
-- One-time note: on production the existing comment_post_counters values (which
-- the old duplicate triggers had inflated) were recomputed from the comments
-- table separately; a fresh database computes correct counters from the
-- canonical trigger, so no data backfill is needed here.
do $$
begin
  if to_regclass('public.comments') is null then
    return;
  end if;

  -- Duplicate post-counter maintenance.
  execute 'drop trigger if exists comment_post_counters_trig on public.comments';
  execute 'drop trigger if exists trg_comments_counter_ins on public.comments';
  execute 'drop trigger if exists trg_comments_counter_upd on public.comments';
  execute 'drop trigger if exists trg_comments_counter_del on public.comments';

  -- Duplicate replies-count maintenance.
  execute 'drop trigger if exists comment_replies_count_trig on public.comments';

  -- Duplicate updated_at stamping (two of the three BEFORE UPDATE triggers).
  execute 'drop trigger if exists set_updated_at_comments on public.comments';
  execute 'drop trigger if exists touch_updated_at_trig on public.comments';
end
$$;
