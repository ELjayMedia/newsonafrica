-- Replace SECURITY DEFINER bookmark policy helpers with direct ownership checks.
-- This removes an unnecessary RPC surface while preserving the same reader
-- authorization semantics. Applied to production first as migration 20260909004732.

drop policy if exists bookmarks_insert_consolidated on public.bookmarks;
create policy bookmarks_insert_consolidated
  on public.bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists bookmarks_update_consolidated on public.bookmarks;
create policy bookmarks_update_consolidated
  on public.bookmarks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists bookmarks_delete_consolidated on public.bookmarks;
create policy bookmarks_delete_consolidated
  on public.bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke execute on function public.bookmarks_can_insert(uuid) from public, anon, authenticated;
revoke execute on function public.bookmarks_can_update(uuid) from public, anon, authenticated;
revoke execute on function public.bookmarks_can_delete(uuid) from public, anon, authenticated;
