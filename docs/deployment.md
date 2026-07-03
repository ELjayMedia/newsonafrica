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
   Environment Variables**) before the first deploy — `lib/env.ts` validates
   them with zod at boot and the build fails fast on missing/malformed values.
5. Assign the production domain; set `SITE_URL` to exactly that origin.

`vercel.json` is intentionally minimal — ported from `legacy/vercel.json`
with the following changes:

- **Kept**: the security header set (CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) applied to all
  routes.
- **Adapted**: Paystack entries removed from the CSP (`api.paystack.co`
  connect-src, `checkout.paystack.com` form-action) and `payment=()` in
  Permissions-Policy — re-add these when the monetization phase lands.
  Supabase (`https://*.supabase.co`, `wss://*.supabase.co`) stays in
  connect-src; YouTube/Vimeo stay in frame-src for article embeds.
- **Dropped**: deprecated `X-XSS-Protection`; the static-asset
  `Cache-Control` rules (Vercel already serves `/_next/static` immutable, API
  routes set their own `no-store`, and `sw.js` caching is handled in
  `next.config.ts` `headers()`); and the daily `/api/revalidate` cron —
  webhook-driven tag revalidation (NOA-88, see §4) replaces it.

## 2. Environment variables

Every variable in `.env.example`, what it does, and where it is set. "Vercel"
means Project Settings → Environment Variables; scope each to
Production/Preview as noted. Local development uses `.env.local`.

| Variable | Required | Exposed to browser | Purpose | Where set |
| --- | --- | --- | --- | --- |
| `SITE_URL` | yes | no (server) | Canonical public origin, no trailing slash. Used for canonical URLs, OG tags, sitemaps, share links. | Vercel: production domain in Production, the stable preview URL (or leave per-branch) in Preview. Local: `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase project URL. | Vercel (both scopes). Supabase Dashboard → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Supabase anon/publishable key — safe to expose, RLS enforces access. | Vercel (both scopes), same dashboard page. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **never** | Privileged key used server-side by content sync and moderation. Mark as **Sensitive** in Vercel. | Vercel (both scopes), same dashboard page. |
| `WORDPRESS_API_URL` | yes | no | Base URL of the WordPress multisite (no trailing slash). Country editions live at `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`. | Vercel (both scopes; Preview may point at a staging CMS). |
| `WORDPRESS_API_AUTH_HEADER` | no | no | Optional `Authorization` header for a private/staging CMS (e.g. `Basic …`). | Vercel, usually Preview only. |
| `WORDPRESS_REQUEST_TIMEOUT_MS` | no | no | Per-request CMS timeout override (defaults: 10s dev / 20s prod). | Vercel, only if needed. |
| `WORDPRESS_WEBHOOK_SECRET` | yes | **never** | Shared secret authorizing `/api/webhooks/wordpress` (§4). Generate long random values, different per environment. | Vercel (Sensitive) **and** the WordPress webhook plugin config. |
| `CONTENT_SYNC_SECRET` | yes | **never** | Shared secret for the admin backfill/status routes `/api/admin/content-sync/*` and `scripts/backfill-content-index.ts`. | Vercel (Sensitive); locally in `.env.local` when running the backfill script. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | no (deferred) | yes | Paystack checkout — **monetization phase, not yet wired**. | Leave unset until that phase. |
| `PAYSTACK_SECRET_KEY` | no (deferred) | **never** | Paystack server verification — **deferred**. | Leave unset until that phase. |

Optional runtime knob not in `.env.example`: `LOG_LEVEL`
(`debug|info|warn|error|silent`) tunes `lib/log.ts`; production defaults to
`info`.

CI (`.github/workflows/ci.yml`) injects dummy-but-shape-valid values for the
required vars — no live backend is contacted by the pipeline, so **no GitHub
secrets are needed for CI**.

## 3. Supabase setup & migrations

Migrations live in `supabase/migrations/*.sql` (content index + FTS search,
profiles + avatar storage, bookmarks, comments, admin flag). Apply them in
filename order — they are timestamped and idempotent-ordered.

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push          # applies any migrations the project hasn't run yet
```

(Alternatively, paste each file into the Dashboard SQL editor in filename
order — first-time setup only; prefer the CLI so the migration history table
stays accurate.)

After the schema is in place:

1. Copy the project URL + anon key + service-role key into Vercel (§2).
2. **Backfill the content index** so search/most-read/sitemaps have data:
   ```bash
   CONTENT_SYNC_SECRET=<secret> pnpm content-sync:backfill -- --base-url https://<your-domain>
   ```
   (drives `/api/admin/content-sync/backfill` page by page; re-runnable,
   upserts are idempotent).
3. Auth: enable the Email provider (Dashboard → Authentication → Providers)
   and add the production domain + preview wildcard to **Redirect URLs**.

## 4. WordPress webhook configuration

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
- header `x-wp-signature: sha256=<hex HMAC-SHA256 of the raw body>` keyed
  with the same secret.

`GET` on the same route is a liveness check. Missing/invalid auth logs a
warning and increments the `webhook.wordpress.unauthorized` counter
(`lib/metrics.ts`); sync failures land in the structured logs (`lib/log.ts`,
JSON lines in production) which Vercel's Log Drains can forward.

## 5. Preview / production flow

- **Every PR branch** → Vercel builds a **Preview deployment** with
  Preview-scoped env vars; GitHub Actions runs `checks` (typecheck, lint,
  unit tests + coverage thresholds, build) and `e2e` (Playwright smoke suite
  against a self-contained build with a stubbed CMS — no live backends).
- **Merge to `main`** → CI runs again and Vercel promotes a **Production
  deployment** with Production-scoped env vars.
- Rollback: Vercel Dashboard → Deployments → *Promote to Production* on a
  previous good build (instant, no rebuild).
- The Playwright suite can also smoke-test a live deployment:
  ```bash
  PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=https://<preview-url> pnpm test:e2e
  ```
  (content assertions may need a CMS with real posts; the shell/404/login
  specs are backend-independent).

## 6. Deferred: Paystack & subscriptions

Payments/subscriptions are **not part of this phase**. The env vars are
reserved in `.env.example`, and the CSP/Permissions-Policy entries they need
were deliberately removed from `vercel.json` (§1). When the monetization
epic starts: set both Paystack keys in Vercel, re-add
`https://api.paystack.co` to `connect-src` and
`https://checkout.paystack.com` to `form-action`, and change
`payment=()` to `payment=(self)`.
