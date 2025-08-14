insert into storage.buckets (id, name, public)
  values ('user-media', 'user-media', false)
  on conflict (id) do nothing;

create policy "read-own-avatars" on storage.objects for select
  using (bucket_id = 'user-media' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "write-own-avatars" on storage.objects for insert
  with check (bucket_id = 'user-media' and (auth.uid())::text = (storage.foldername(name))[1]);
