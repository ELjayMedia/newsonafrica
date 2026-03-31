# GraphQL architecture

This note defines the boundary between **GraphQL source documents + compile-time artifacts** and the **WordPress runtime data layer**.

## Layer boundaries

### `src/lib/graphql/*` (document and schema-facing layer)

Use this layer for artifacts that describe or support the GraphQL operation contract itself:

- **Typed operation documents** in `src/lib/graphql/operations/**`.
- **Shared fragments** in `src/lib/graphql/fragments/**`.
- **Telemetry helpers** in `src/lib/graphql/metrics.ts` (operation-name keyed telemetry primitives).

In short: this layer owns operation shape, field selection, variable contracts, and telemetry instrumentation primitives.

### `lib/wordpress/*` (runtime service layer)

Use this layer for runtime behavior that executes operations against WordPress and serves app features:

- **Service wrappers/use-case entrypoints** (for example post/category/author/search loaders).
- **Query execution plumbing** (request composition, retries, error mapping, fallback flow).
- **Caching and tags** (TTL/revalidate behavior, tag assignment, invalidation integration).

In short: this layer owns *how* operations run in production and *how* responses are cached, tagged, and exposed to routes/components.

## Which layer to edit for common tasks

- **Add a new page query**
  - Primary edits: `src/lib/graphql/operations/**` (+ fragments when needed).
  - Follow-up runtime wiring: `lib/wordpress/queries.ts` and relevant service wrapper in `lib/wordpress/**`.
- **Change cache policy** (TTL, tag set, invalidation ownership)
  - Primary edits: `lib/wordpress/**` runtime fetch/service code.
  - Required docs sync: `docs/graphql/cache-strategy.md` and the linked surface row in `docs/graphql/query-map.md`.
- **Change telemetry behavior**
  - Metric model/helper changes: `src/lib/graphql/metrics.ts`.
  - Call-site/runtime emission changes: `lib/wordpress/**` where execution events are recorded.
  - SLO/ops expectation updates: `docs/graphql/slo.md`.

## Required sync steps when operation shape changes

When a GraphQL operation's variables or selected fields change, update all of the following in the same PR:

1. **Types**
   - Regenerated/updated operation result and variable types (and any validators that mirror shape).
2. **Query map**
   - `docs/graphql/query-map.md` surface entry: operation mapping, variable contract, UI-consumed fields.
3. **Cache strategy**
   - `docs/graphql/cache-strategy.md` strategy row and tag/revalidation assumptions if freshness ownership changed.
4. **Service wrappers**
   - `lib/wordpress/**` wrapper signatures, fallback logic, and response adaptation to match the new shape.

Treat these as one atomic contract update: operation document, runtime execution, cache policy, and docs must remain aligned.
