# 0001. Use Next.js App Router with React Server Components

- Status: Accepted
- Date: 2026-04-16

## Context

News on Africa renders article and category pages whose primary cost is a
GraphQL round-trip to a WordPress origin. We need:

- Server-side rendering with per-path caching and on-demand revalidation by
  tag, so editorial updates surface quickly without blowing the whole
  cache.
- A clean split between data-fetching code (runs on the server) and
  interactive UI (runs in the browser), to keep bundle size small.
- Route-level streaming and Suspense boundaries so the above-the-fold hero
  can render before related rails finish loading.
- A first-class story for server actions (subscribe, comment, bookmark)
  that share auth context with page loaders.

## Decision

Use Next.js 15 with the App Router (`app/`) as the sole routing layer.
Default all components to React Server Components (RSC). Mark interactive
leaves `"use client"` only when they need hooks, state, or browser APIs.

Use `unstable_cache` / `revalidateTag` / `revalidatePath` for data freshness
rather than rolling our own caching layer.

## Consequences

- **Wins:** Smaller client bundles; per-query cache tags enable fine-grained
  editorial revalidation; Server Actions remove most of the `/api/*` glue
  for mutations; streaming Suspense improves LCP on article pages.
- **Costs:** The server/client boundary is a sharp edge — misplaced
  `"use client"` in a leaf forces whole subtrees to bundle; directive
  placement is linted. RSC debugging is harder than classic SSR; we lean
  on structured logs (`lib/log.ts`) to surface server-side failures.
- Pages Router (`pages/`) is not used. Legacy helpers imported from
  `pages/` are out of scope for this project.

## Alternatives considered

- **Pages Router:** Mature, well-understood, but would cost us RSC, server
  actions, and the streaming model. Rejected.
- **Remix:** Strong data loading story, but we already have the WPGraphQL
  tooling aligned to Next.js (codegen, cache tags, Vercel runtime).
  Rejected to avoid the migration.
- **Gatsby / pure SSG:** Rebuilding on every editorial change is too
  coarse for a news site. Rejected.
