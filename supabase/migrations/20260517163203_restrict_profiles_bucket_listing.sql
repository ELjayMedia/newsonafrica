-- Remove broad public listing from the public profiles bucket.
-- Public buckets can still serve objects by URL without a broad SELECT policy on storage.objects.
drop policy if exists "Public read profile avatars" on storage.objects;