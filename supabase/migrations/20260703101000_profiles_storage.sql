-- NOA-99: profiles storage bucket for avatar uploads
--
-- Avatar files are uploaded by the browser client to
--   profiles/avatars/<user-id>-<uuid>.<ext>
-- and served via their public object URL (stored on profiles.avatar_url).
--
-- Mirrors the legacy bucket migrations:
--   * 20260515214230_create_profiles_storage_bucket.sql (bucket + owner CRUD)
--   * 20260517163203_restrict_profiles_bucket_listing.sql (no broad SELECT
--     policy — a public bucket serves objects by URL without one, and
--     omitting it prevents anonymous listing/enumeration via the API)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profiles',
  'profiles',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner-scoped writes: object names must be prefixed with the caller's uid.

drop policy if exists "Users upload own profile avatars" on storage.objects;
create policy "Users upload own profile avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profiles'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );

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

drop policy if exists "Users delete own profile avatars" on storage.objects;
create policy "Users delete own profile avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profiles'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );

-- Restricted listing: owners may list only their own objects; there is
-- deliberately NO public/anon SELECT policy on this bucket.
drop policy if exists "Users list own profile avatars" on storage.objects;
create policy "Users list own profile avatars"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profiles'
    and name like 'avatars/' || auth.uid()::text || '-%'
  );
