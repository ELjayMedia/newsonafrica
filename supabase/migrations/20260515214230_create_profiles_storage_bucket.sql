-- Create the storage bucket used by app/actions/profile.ts for avatar uploads.
-- Avatar files are stored under avatars/<user-id>-<uuid>.<ext>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profiles',
  'profiles',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for avatar objects in the profiles bucket.
drop policy if exists "Public read profile avatars" on storage.objects;
create policy "Public read profile avatars"
on storage.objects
for select
to public
using (bucket_id = 'profiles');

-- Authenticated users can upload their own avatar objects.
drop policy if exists "Users upload own profile avatars" on storage.objects;
create policy "Users upload own profile avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profiles'
  and name like 'avatars/' || auth.uid()::text || '-%'
);

-- Authenticated users can replace their own avatar objects.
drop policy if exists "Users update own profile avatars" on storage.objects;
create policy "Users update own profile avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profiles'
  and name like 'avatars/' || auth.uid()::text || '-%'
)
with check (
  bucket_id = 'profiles'
  and name like 'avatars/' || auth.uid()::text || '-%'
);

-- Authenticated users can remove their own avatar objects.
drop policy if exists "Users delete own profile avatars" on storage.objects;
create policy "Users delete own profile avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profiles'
  and name like 'avatars/' || auth.uid()::text || '-%'
);