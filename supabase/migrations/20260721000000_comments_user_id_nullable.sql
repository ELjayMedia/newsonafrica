-- NOA-133: allow comments.user_id to be null so accounts can be deleted while
-- their comment threads survive.
--
-- Two problems this fixes:
--
--   1. Latent bug. `comments.user_id` already carries an FK to auth.users with
--      ON DELETE SET NULL (comments_user_id_fkey), but the column was NOT NULL.
--      Those two are contradictory: deleting any auth user who had ever
--      commented would abort with a NOT NULL violation, so account deletion was
--      impossible for commenters.
--
--   2. Account deletion. The delete-account flow (lib/auth/delete-account.ts)
--      anonymizes the leaving user's comments (user_id -> null, status
--      'deleted', body cleared) *before* deleting the auth user. With user_id
--      null those rows no longer match either FK on the column
--      (comments_user_id_profiles_fkey ON DELETE CASCADE to profiles, or the
--      SET NULL FK to auth.users), so deleting the user/profile does not cascade
--      them away — and, crucially, other readers' replies (comments.parent_id
--      ON DELETE CASCADE) are preserved because the parent rows survive as
--      deleted stubs.
--
-- Read paths already treat a deleted comment as authorless (lib/dal/comments.ts
-- coalesces the author to null and blanks the body for status='deleted'), and
-- filter deleted rows out of the author profile lookup, so a null user_id never
-- reaches the UI.
--
-- The comments table is created out-of-band (no migration creates it), so guard
-- on it existing for a fresh-DB (preview branch) replay.
do $$
begin
  if to_regclass('public.comments') is null then
    return;
  end if;

  execute 'alter table public.comments alter column user_id drop not null';
end
$$;
