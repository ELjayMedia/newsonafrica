# 0004. Supabase owns auth and user-generated data

- Status: Accepted
- Date: 2026-04-16

## Context

News on Africa needs to store things WordPress does not own: user
accounts, bookmarks, comments, subscription state, and editorial audit
events. We also need:

- Row-Level Security on user-scoped data so a broken query can't leak
  across accounts.
- OAuth + email auth with session cookies that share context with
  Next.js server actions.
- A managed Postgres we can migrate with code review instead of
  click-ops.
- Webhooks / triggers for downstream events (e.g., welcome emails on
  signup).

## Decision

Use Supabase for:

- **Auth:** `@supabase/ssr` client in Next.js middleware + route helpers;
  sessions on HTTP-only cookies.
- **Database:** Postgres with migrations under `supabase/migrations/**`.
- **RLS:** Every user-scoped table has an RLS policy; `authenticated`
  role is the default; service role is only used from trusted server
  paths.
- **Edge functions:** Used for operations that must run close to the DB
  with the service role (e.g., subscription reconciliation).

WordPress continues to own editorial content (ADR 0002); Supabase owns
everything else.

## Consequences

- **Wins:** One managed auth story; RLS is a strong default; migrations
  are versioned; cost scales with usage.
- **Costs:** Two data sources to keep in sync (a user's bookmark
  references a WP post id; deleted posts orphan bookmarks). Mitigation:
  we treat bookmarks as soft references — missing posts render a
  tombstone, not an error.
- Service-role keys never leave the server. Compromising a browser-exposed
  key should not allow privilege escalation.

## Alternatives considered

- **Auth0 + a separate Postgres:** Splits auth from data, duplicating
  session plumbing. Rejected.
- **Custom auth on top of Postgres:** Cheaper at low scale but diverts
  engineering from product work. Rejected.
- **Firebase:** Non-Postgres data model, harder to query across comments
  + subscriptions + bookmarks. Rejected.
