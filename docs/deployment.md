# Deployment (NOA-119)

How News on Africa ships: a Next.js 15 App Router app deployed to **Vercel**,
backed by **Supabase** (profiles, bookmarks, comments, content index/search)
and a **headless WordPress multisite** (articles). CI on GitHub Actions gates
every push (`.github/workflows/ci.yml`); Vercel's Git integration does the
actual deploying.

## 1. Vercel project setup

1. Import the GitHub repository into Vercel (**Add New → Project**).
2. Framework preset: **Next.js** (auto-detected; also pinned in
   `vercel.json`). Keep the default build command (`next build`) and output.
3. Install command comes from `vercel.json`
   (`pnpm install --frozen-lockfile`); Vercel picks the pnpm version from the
   `packageManager` field in `package.json` (pnpm 9) and Node 22 from
   `engines.node` — set **Project Settings → General → Node.js Version** to 22
   if it doesn't auto-match.
4. Add the environment variables listed below (**Project Settings →
   Environment Variables**) before the first deploy.
5. Assign the production domain; set `SITE_URL` / `NEXT_PUBLIC_SITE_URL` to
   exactly that origin.
6. Before public launch, confirm the Vercel project reports `live: true` and
   `app.newsonafrica.com` is attached as the production domain. The connector
   can read this state but cannot currently toggle it.

## 2. Launch-blocker settings

These are the settings to verify immediately before launch:

| Blocker | Required action |
| --- | --- |
| Vercel project live flag | Enable the Vercel project live state so `live` changes from `false` to `true`. |
| Production domain | Attach `app.newsonafrica.com` to the project and set both `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to `https://app.newsonafrica.com`. |
| Nigeria WP endpoints | Set `NEXT_PUBLIC_WP_NG_REST_BASE` and `NEXT_PUBLIC_WP_NG_GRAPHQL` in Vercel Production and Preview. If unset, the app falls back to `${WORDPRESS_API_URL}/ng/wp-json/wp/v2` and `${WORDPRESS_API_URL}/ng/graphql`. |
| SZ GraphQL socket timeouts | Keep `WORDPRESS_RETRY_ATTEMPTS=4` and `WORDPRESS_RETRY_BACKOFF_MS=750` unless production logs show a different tuning requirement. |

## 3. Environment variables

Every variable in `.env.example`, what it does, and where it is set. "Vercel"
means Project Settings → Environment Variables; scope each to Production/Preview
as noted. Local development uses `.env.local`.

| Variable | Required | Exposed to browser | Purpose | Where set |
| --- | --- | --- | --- | --- |
| `SITE_URL` | yes | no (server) | Canonical public origin, no trailing slash. Used for canonical URLs, OG tags, sitemaps, share links. | Vercel: `https://app.newsonafrica.com` in Production. Local: `http://localhost:3000`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | yes | Public equivalent of `SITE_URL` for deployment metadata and client-safe URL generation. | Vercel Production/Preview. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase project URL. | Vercel (both scopes). Supabase Dashboard → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Supabase anon/publishable key — safe to expose, RLS enforces access. | Vercel (both scopes), same dashboard page. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **never** | Privileged key used server-side by content sync and moderation. Mark as **Sensitive** in Vercel. | Vercel (both scopes), same dashboard page. |
| `WORDPRESS_API_URL` | yes | no | Base URL of the WordPress multisite (no trailing slash). Country editions live at `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`. | Vercel (both scopes; Preview may point at a staging CMS). |
| `NEXT_PUBLIC_WP_NG_REST_BASE` | launch blocker | yes | Explicit Nigeria REST base override. | Vercel Production/Preview. |
| `NEXT_PUBLIC_WP_NG_GRAPHQL` | launch blocker | yes | Explicit Nigeria WPGraphQL endpoint override. | Vercel Production/Preview. |
| `WORDPRESS_API_AUTH_HEADER` | no | no | Optional `Authorization` header for a private/staging CMS. | Vercel, usually Preview only. |
| `WORDPRESS_REQUEST_TIMEOUT_MS` | no | no | Per-request CMS timeout override (defaults: 10s dev / 20s prod). | Vercel, only if needed. |
| `WORDPRESS_RETRY_ATTEMPTS` | no | no | Retry attempts for transient WordPress network/socket errors. Defaults to 4. | Vercel Production/Preview if overriding. |
| `WORDPRESS_RETRY_BACKOFF_MS` | no | no | Initial retry backoff for transient WordPress failures. Defaults to 750ms. | Vercel Production/Preview if overriding. |
| `WORDPRESS_WEBHOOK_SECRET` | yes | **never** | Shared secret authorizing `/api/webhooks/wordpress`. Generate long random values, different per environment. | Vercel (Sensitive) **and** the WordPress webhook plugin config. |
| `CONTENT_SYNC_SECRET` | yes | **never** | Shared secret for the admin backfill/status routes `/api/admin/content-sync/*` and `scripts/backfill-content-index.ts`. | Vercel (Sensitive); locally in `.env.local` when running the backfill script. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | no (deferred) | yes | Paystack checkout — monetization phase, not yet wired. | Leave unset until that phase. |
| `PAYSTACK_SECRET_KEY` | no (deferred) | **never** | Paystack server verification — deferred. | Leave unset until that phase. |

Optional runtime knob not in `.env.example`: `LOG_LEVEL`
(`debug|info|warn|error|silent`) tunes `lib/log.ts`; production defaults to
`info`.

CI (`.github/workflows/ci.yml`) injects dummy-but-shape-valid values for the
required vars — no live backend is contacted by the pipeline, so no GitHub
secrets are needed for CI.

## 4. Supabase setup & migrations

Migrations live in `supabase/migrations/*.sql` (content index + FTS search,
profiles + avatar storage, bookmarks, comments, admin flag). Apply them in
filename order — they are timestamped and idempotent-ordered.

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

After the schema is in place:

1. Copy the project URL + anon key + service-role key into Vercel.
2. Backfill the content index so search/most-read/sitemaps have data:
   ```bash
   CONTENT_SYNC_SECRET=<secret> pnpm content-sync:backfill -- --base-url https://<your-domain>
   ```
3. Auth: enable the Email provider and add the production domain + preview wildcard to Redirect URLs.

## 5. WordPress webhook configuration

Near-real-time cache revalidation + content-index sync is driven by
`POST /api/webhooks/wordpress` (NOA-88). In the WordPress multisite, hook
`save_post` / `before_delete_post` (site plugin or a webhook plugin) to POST:

```json
{
  "action": "post_published | post_updated | post_deleted | category_updated | tag_updated",
  "country": "sz | za | ng",
  "post": { "id": 123, "slug": "the-post-slug", "categorySlugs": ["news"], "tagSlugs": [] }
}
```

to `https://<your-domain>/api/webhooks/wordpress`, authenticated either way:

- header `x-webhook-secret: <WORDPRESS_WEBHOOK_SECRET>`, or
- header `x-wp-signature: sha256=<hex HMAC-SHA256 of the raw body>` keyed with the same secret.

## 6. Preview / production flow

- Every PR branch → Vercel builds a Preview deployment with Preview-scoped env vars.
- Merge to `main` → CI runs again and Vercel promotes a Production deployment.
- Rollback: Vercel Dashboard → Deployments → Promote to Production on a previous good build.
- The Playwright suite can also smoke-test a live deployment:
  ```bash
  PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=https://<preview-url> pnpm test:e2e
  ```

## 7. Known build warnings (accepted)

Two non-blocking warnings appear in the Vercel / `next build` logs. Both are
known and accepted (NOA-120) — they do not fail the build or affect runtime:

1. **Edge Runtime — Supabase SSR in middleware.** `middleware.ts` uses
   `@supabase/ssr`'s `createServerClient` to refresh auth tokens on every
   navigation (NOA-97), and the build flags that a Node.js API is referenced
   from the Edge runtime. Those API references live in library code paths the
   middleware never executes on Edge — the client only reads/writes cookies and
   calls `fetch` for `auth.getUser()` — so the warning is cosmetic. The
   middleware stays on the Edge runtime deliberately (session refresh must run
   at the edge on every request); we do not adopt the experimental Node.js
   middleware runtime solely to silence a benign warning.
2. **`next.config.ts` TypeScript bootstrap.** Vercel installs TypeScript to load
   the TS-authored `next.config.ts`, emitting a one-line bootstrap note.
   Migrating to `next.config.mjs` was tried (PR #1475) and broke `@/` path-alias
   resolution under the production install mode, so it was reverted. The `.ts`
   config is kept; the note is accepted until alias resolution can first be
   proven in a Vercel preview.

## 8. Deferred: Paystack & subscriptions

Payments/subscriptions are not part of this phase. The env vars are reserved in
`.env.example`, and the CSP/Permissions-Policy entries they need were deliberately
removed from `vercel.json`. When the monetization epic starts: set both Paystack
keys in Vercel, re-add `https://api.paystack.co` to `connect-src` and
`https://checkout.paystack.com` to `form-action`, and change `payment=()` to
`payment=(self)`.
