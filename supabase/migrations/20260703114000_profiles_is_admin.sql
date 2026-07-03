-- NOA-102: admin flag for comment moderation
--
-- Admin gating choice: a simple `is_admin` boolean on public.profiles,
-- checked server-side (lib/auth/admin.ts requireAdmin()) before any
-- moderation page renders or moderation action runs. Moderation writes go
-- through the service-role client, so no client-facing RLS policy ever
-- grants moderation powers; the flag is purely a server-side gate. This is
-- the simplest approach consistent with the existing profiles-based auth
-- setup — a full role system can replace the boolean later without touching
-- the gate's call sites.
--
-- The flag is only settable by operators (SQL / service role): client
-- UPDATE on profiles is column-scoped below so users cannot grant
-- themselves admin through the PostgREST API, whatever the row policies
-- allow.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Server-side moderation gate (NOA-102). Set via SQL/service role only; client updates are column-scoped away.';

-- Users keep updating their own display fields (policy "Users update own
-- profile" from 20260703100000), but never is_admin: replace the blanket
-- UPDATE grant with a column list. (Column grants compose with RLS — the
-- row policies still apply.)
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, preferred_country) on public.profiles to authenticated;

-- Anonymous SELECT stays scoped to the public display columns defined in
-- 20260703100000 (id, display_name, avatar_url, created_at) — is_admin is
-- deliberately not added there.
