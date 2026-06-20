drop policy if exists "Service role can manage content index" on public.content_index;

create policy "Service role can insert content index"
  on public.content_index
  for insert
  to public
  with check ((select auth.role()) = 'service_role');

create policy "Service role can update content index"
  on public.content_index
  for update
  to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

create policy "Service role can delete content index"
  on public.content_index
  for delete
  to public
  using ((select auth.role()) = 'service_role');
