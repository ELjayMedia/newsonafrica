# 0003. App-layer WordPress reads must go through `lib/wordpress/service`

- Status: Accepted
- Date: 2026-04-16

## Context

Before this decision, pages and components under `app/` were importing
WordPress helpers directly from `lib/wordpress/posts`,
`lib/wordpress/categories`, `lib/wordpress/authors`, and a deprecated
`lib/wordpress-api` module. That created four problems:

- Cache-tag strategy was duplicated across caller files; some callers
  tagged, some didn't.
- Country-scoping logic leaked into page components.
- Moving a GraphQL operation required editing every caller.
- Unit testing page code required mocking several file paths.

## Decision

All reads from the `app/` layer must import from `@/lib/wordpress/service`.
The service module owns:

- Cache tag derivation (country + slug + query kind).
- Country endpoint resolution via `lib/countries.ts`.
- Error handling and retry policy for the upstream GraphQL call.

Direct imports from `@/lib/wordpress/posts`, `@/lib/wordpress/categories`,
`@/lib/wordpress/authors`, `@/lib/wordpress/frontpage`,
`@/lib/wordpress/countries`, and `@/lib/wordpress-api` from `app/**` are
**rejected by ESLint**. Library code inside `lib/wordpress/**` may still
cross-import internally — the ban is only for the app layer.

## Consequences

- **Wins:** One place to change cache strategy, retry policy, or the
  GraphQL transport. Page tests mock one module. New routes default to
  the right cache tags.
- **Costs:** A thin facade module to maintain. Operations that legitimately
  need a one-off shape require a new `service` export rather than an
  inline fetch.
- Any new `lib/wordpress/<something>` module added as a caller-facing
  export must be re-exported through `service` *and* added to the ESLint
  block list in the same PR.

## Alternatives considered

- **Keep scattered imports + best-effort conventions:** This is what we
  had. It broke every few weeks. Rejected.
- **Move service into `lib/wp-server/`:** We tried this; `wp-server`
  became an alias for `service` with deprecated shims. Collapsed into
  `lib/wordpress/service` and deleted the shims.
