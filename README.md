# News on Africa

Independent African journalism — a greenfield rebuild of the News on Africa web app.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS v4** with a documented design-tokens layer
- **next-themes** for light/dark theming
- **zod** for typed, validated environment config
- **pnpm** on **Node 22**

Supabase (accounts/data), headless WordPress (content), and Paystack
(subscriptions) integrate in later phases. Clean seams are already in place
(see `lib/env.ts` and the notes below).

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in values as integrations land
pnpm dev                     # http://localhost:3000
```

## Scripts

| Command                      | Description                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`                   | Start the dev server                                                                               |
| `pnpm build`                 | Production build                                                                                   |
| `pnpm start`                 | Run the production build                                                                           |
| `pnpm lint`                  | ESLint (eslint-config-next)                                                                        |
| `pnpm typecheck`             | `tsc --noEmit`                                                                                     |
| `pnpm format`                | Format with Prettier                                                                               |
| `pnpm test`                  | Vitest unit tests                                                                                  |
| `pnpm content-sync:backfill` | Backfill the Supabase search/content index from WordPress (see [docs/search.md](./docs/search.md)) |

## Project layout

```
app/                 App Router routes, layout, error boundaries, globals.css
  design-system/     Live preview of UI primitives + tokens
components/          Shell (header/footer/theme) + ui/ primitives
  ui/                Button, Card, Input, Container, Skeleton
lib/                 utils (cn), design-tokens, env (zod validation)
legacy/              The previous app, archived for reference & parity
```

## Conventions

- Import via the `@/*` path alias (maps to repo root).
- Use design tokens, not hard-coded values: `bg-primary`, `text-foreground`,
  and the typography helpers (`display-lg`, `heading-md`, `body-md`, ...).
  Tokens live in `app/globals.css` (runtime source of truth) and are mirrored
  in `lib/design-tokens.ts`.
- Environment access goes through `lib/env.ts` (`publicEnv` / `serverEnv`).
  Never import `serverEnv` into a `"use client"` module.

## Integration seams (later phases)

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` already in the env schema (optional for now).
- **WordPress**: `WORDPRESS_API_URL`.
- **Paystack**: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`.
- Remote image patterns / rewrites belong in `next.config.ts`.

## Search & content index

Full-text search runs against a Supabase `content_index` mirror of WordPress
content (never against WordPress at request time). Architecture, sync paths,
and backfill/rebuild instructions live in [docs/search.md](./docs/search.md).

For the end-to-end **WordPress → Supabase → Next.js data flow** — which system
owns content, search, comments, bookmarks and user state, the read/sync/discovery
paths, and the `(edition_code, wp_post_id)` join key — see
[docs/data-flow.md](./docs/data-flow.md).

## Legacy app

The previous implementation is preserved under [`legacy/`](./legacy) for
reference and feature parity. It is excluded from typecheck, lint, and the
build.
