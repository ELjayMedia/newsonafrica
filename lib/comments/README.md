# Comments module architecture

This directory is the canonical comments domain for moderation and user comment lifecycle.
The moderation backend is **Supabase**, accessed through domain services in `lib/comments/service.ts`.

## Module ownership

- **UI components**
  - Render comment data and trigger interactions only.
  - Must call API route handlers and must not query Supabase or WordPress moderation APIs directly.
  - Current legacy WordPress moderation UI (`components/CommentModeration.tsx`) has been removed.

- **API route handlers**
  - Validate request input, enforce auth, normalize status values, and map HTTP payloads.
  - Delegate all comment business logic to `lib/comments/service.ts`.
  - Examples: `app/api/admin/comments/route.ts`, `app/api/admin/comments/[id]/route.ts`.

- **Domain service**
  - `lib/comments/service.ts` owns moderation and comment domain rules.
  - Handles visibility, status transitions, reaction aggregation, pagination/cursors, and cache tags.

- **Persistence adapters**
  - DAL modules provide persistence entrypoints and should resolve to Supabase comment adapters.
  - Canonical DAL entrypoint is `lib/dal/comments.ts`.

## Allowed dependencies and data flow

Allowed direction of dependencies:

1. UI components → API route handlers (HTTP)
2. API route handlers → comments domain service (`lib/comments/service.ts`)
3. Domain service → Supabase clients / adapters

Disallowed:

- UI components importing Supabase DAL modules directly.
- API handlers bypassing the domain service for moderation mutations.
- New moderation logic implemented against WordPress comment APIs.

In short, moderation flow is:

`UI` → `app/api/admin/comments*` → `lib/comments/service.ts` → `Supabase`
