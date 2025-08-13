# Auth & Personalization

This document outlines how authentication, profiles, bookmarks and personalization work with Supabase.

## Flows
- Users sign in via OTP magic link from `/signin`.
- `/auth/callback` exchanges the code and establishes a session.
- `signOut()` clears the session.

## Profiles
- `profiles` table stores display name, avatar and country.
- First visit to `/profile` inserts a row for the user if missing.
- The form updates the row through a server action which respects RLS policies.

## Bookmarks
- `bookmarks` table stores saved article slugs per user.
- `BookmarkButton` toggles a bookmark via a server action with optimistic UI.
- `/profile/bookmarks` lists saved slugs with `force-dynamic` caching.

## Comments
- `comments` table supports moderated comments; only approved comments are readable.
- Submissions run through a profanity check and require authentication.

## Personalized Slots
- `ForYouSlot` reads the current session and renders suggested content. The component is marked `force-dynamic` to avoid cache leakage.
- Place personalized components under a `Suspense` boundary so the main page remains cacheable.

## RLS Guarantees
RLS policies ensure users can only access their own rows for `profiles`, `bookmarks` and pending `comments`. The `feature_flags` table is read-only for all users.

## Cache Safety
All personalized server components export `dynamic = 'force-dynamic'` or use `cache: 'no-store'`. Do not expose the service role key to the client; all writes occur via server actions.
