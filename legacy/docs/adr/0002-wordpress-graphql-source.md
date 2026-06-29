# 0002. WordPress is the canonical content source via WPGraphQL

- Status: Accepted
- Date: 2026-04-16

## Context

Editorial teams for each country edition author articles in WordPress and
have long-standing workflows, plugins, and media pipelines there. Moving
them to a new CMS is not on the table. The front end needs:

- Typed, versioned access to posts, categories, tags, authors, and
  featured media.
- Sub-second perceived freshness on breaking news without unbounded
  origin traffic.
- One ingestion path shared by SSR pages, sitemaps, and server actions.

## Decision

Use WordPress + the `WPGraphQL` plugin as the canonical read path. All
GraphQL operations live under `lib/graphql/operations/**` and are consumed
via typed client hooks in `lib/wordpress/**`. Codegen (`types/wpgraphql.ts`)
is the source of truth for WP response shapes.

REST endpoints from WP are only used when WPGraphQL cannot express the
query; those exceptions must be documented in
`docs/graphql/query-map.md`.

## Consequences

- **Wins:** One typed ingestion path; codegen catches schema drift at
  build time; cache tags on GraphQL reads enable precise ISR invalidation
  tied to post/category slugs.
- **Costs:** We depend on the upstream WPGraphQL plugin's release cadence
  and its field coverage. Schema changes on WP side require a codegen run
  in this repo (documented in `docs/graphql/architecture.md`).
- Any service that needs WP data must go through the typed clients —
  direct `fetch` against the GraphQL endpoint from app code is banned
  (enforced by ESLint; see ADR 0003).

## Alternatives considered

- **WordPress REST API:** Weaker typing, N+1 requests for nested data,
  harder to unify caching. Rejected.
- **Headless CMS replacement (Contentful / Sanity):** Editorial cost to
  migrate + retrain outweighs the infrastructure benefit today.
  Rejected for now.
- **Custom ingestion into Supabase:** Duplicates the CMS; adds a sync
  layer that would dominate maintenance. Rejected.
