# Deployment (NOA-119)

How News on Africa ships: a Next.js 15 App Router app deployed to **Coolify**,
backed by **Supabase** (profiles, bookmarks, comments, content index/search)
and a **headless WordPress multisite** (articles). CI on GitHub Actions gates
every push (`.github/workflows/ci.yml`); the successful `main` workflow calls
Coolify's authenticated deploy API.

## 1. Coolify project setup

1. Use the Coolify application UUID `bpn1vrazffmj4zfbfpb8vkft`, repository
   `ELjayMedia/newsonafrica`, branch `main`, and the repository `Dockerfile`.
2. Expose port `3000`, enable the `/` health check, and attach
   `https://app.newsonafrica.com` through the shared Cloudflare Tunnel.
3. Add the environment variables below in Coolify before the first deploy.
   Mark server-only credentials as secrets and make `NEXT_PUBLIC_*` variables
   available at build time as well as runtime.
4. Store a deploy-only Coolify API token in the GitHub Actions secret
   `COOLIFY_DEPLOY_TOKEN`. CI queues a deploy only after all checks pass.
5. Configure a daily Coolify scheduled task for `/api/cron/content-health` at
   `0 4 * * *`, authenticating with `CRON_SECRET`.

## 2. Launch-blocker settings

These are the settings to verify immediately before launch:

| Blocker                    | Required action                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coolify application        | Latest `main` deployment is healthy and the container health check passes.                                                                                                                   |
| Production domain          | Attach `app.newsonafrica.com` to the project and set both `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to `https://app.newsonafrica.com`.                                                           |
| Nigeria WP endpoints       | Set `NEXT_PUBLIC_WP_NG_REST_BASE` and `NEXT_PUBLIC_WP_NG_GRAPHQL` in Coolify. If unset, the app falls back to `${WORDPRESS_API_URL}/ng/wp-json/wp/v2` and `${WORDPRESS_API_URL}/ng/graphql`. |
| SZ GraphQL socket timeouts | Keep `WORDPRESS_RETRY_ATTEMPTS=4` and `WORDPRESS_RETRY_BACKOFF_MS=750` unless production logs show a different tuning requirement.                                                           |

## 3. Environment variables

Every variable in `.env.example`, what it does, and where it is set. "Coolify"
means the application Environment Variables page. Local development uses
`.env.local`.

| Variable                          | Required       | Exposed to browser | Purpose                                                                                                                           | Where set                                                                         |
| --------------------------------- | -------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SITE_URL`                        | yes            | no (server)        | Canonical public origin, no trailing slash. Used for canonical URLs, OG tags, sitemaps, share links.                              | Coolify: `https://app.newsonafrica.com`. Local: `http://localhost:3000`.          |
| `NEXT_PUBLIC_SITE_URL`            | recommended    | yes                | Public equivalent of `SITE_URL` for deployment metadata and client-safe URL generation.                                           | Coolify build + runtime.                                                          |
| `NEXT_PUBLIC_SUPABASE_URL`        | yes            | yes                | Supabase project URL.                                                                                                             | Coolify build + runtime. Supabase Dashboard → Project Settings → API.             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | yes            | yes                | Supabase anon/publishable key — safe to expose, RLS enforces access.                                                              | Coolify build + runtime, same dashboard page.                                     |
| `SUPABASE_SERVICE_ROLE_KEY`       | yes            | **never**          | Privileged key used server-side by content sync and moderation.                                                                   | Coolify runtime secret, same dashboard page.                                      |
| `WORDPRESS_API_URL`               | yes            | no                 | Base URL of the WordPress multisite (no trailing slash). Country editions live at `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2`. | Coolify runtime.                                                                  |
| `NEXT_PUBLIC_WP_NG_REST_BASE`     | launch blocker | yes                | Explicit Nigeria REST base override.                                                                                              | Coolify build + runtime.                                                          |
| `NEXT_PUBLIC_WP_NG_GRAPHQL`       | launch blocker | yes                | Explicit Nigeria WPGraphQL endpoint override.                                                                                     | Coolify build + runtime.                                                          |
| `WORDPRESS_API_AUTH_HEADER`       | no             | no                 | Optional `Authorization` header for a private/staging CMS.                                                                        | Coolify runtime secret when used.                                                 |
| `WORDPRESS_REQUEST_TIMEOUT_MS`    | no             | no                 | Per-request CMS timeout override (defaults: 10s dev / 20s prod).                                                                  | Coolify runtime, only if needed.                                                  |
| `WORDPRESS_RETRY_ATTEMPTS`        | no             | no                 | Retry attempts for transient WordPress network/socket errors. Defaults to 4.                                                      | Coolify runtime if overriding.                                                    |
| `WORDPRESS_RETRY_BACKOFF_MS`      | no             | no                 | Initial retry backoff for transient WordPress failures. Defaults to 750ms.                                                        | Coolify runtime if overriding.                                                    |
| `WORDPRESS_WEBHOOK_SECRET`        | yes            | **never**          | Shared secret authorizing `/api/webhooks/wordpress`. Generate long random values, different per environment.                      | Coolify runtime secret **and** the WordPress webhook plugin config.               |
| `CONTENT_SYNC_SECRET`             | yes            | **never**          | Shared secret for the admin backfill/status routes `/api/admin/content-sync/*` and `scripts/backfill-content-index.ts`.           | Coolify runtime secret; locally in `.env.local` when running the backfill script. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | no (deferred)  | yes                | Paystack checkout — monetization phase, not yet wired.                                                                            | Leave unset until that phase.                                                     |
| `PAYSTACK_SECRET_KEY`             | no (deferred)  | **never**          | Paystack server verification — deferred.                                                                                          | Leave unset until that phase.                                                     |

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

> **Schema note:** the production Supabase schema has since diverged from these
> historical migration files — editions are keyed by `edition_code` (not
> `country`), `content_index` has no `status`/`view_count`, `profiles` uses
> `full_name`/`country`, `bookmarks`/`comments` use `edition_code` with richer
> columns, and the search/most-read RPCs return `edition_code`. The application
> layer (`lib/supabase/types.ts` and the DAL) is aligned to the **live** schema,
> which is the current source of truth. Treat the checked-in migrations as
> historical; a fresh project should be reconciled against live (e.g.
> `supabase db pull` / generated types) before relying on `db push`.

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

After the schema is in place:

1. Copy the project URL + anon key + service-role key into Coolify.
2. Backfill the content index so search/most-read/sitemaps have data:
   ```bash
   CONTENT_SYNC_SECRET=<secret> pnpm content-sync:backfill -- --base-url https://<your-domain>
   ```
3. Auth: enable the Email provider and add the production domain + preview wildcard to Redirect URLs.

### Content-sync monitoring (NOA-15)

`public.content_sync_cursor` is the source of truth for per-edition sync state.
Each row (keyed by `edition_code`) records `sync_status`, `last_synced_at`,
`last_wp_post_id` and `error_message`, maintained by the sync routines in
`lib/content-sync/sync.ts` (webhook single-post sync and the backfill route).

**Status values** (`sync_status`, text):

| Value       | Meaning                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `running`   | A backfill/sync is in progress for the edition.                                                 |
| `completed` | The last sync finished with no page errors; `last_synced_at` is set.                            |
| `failed`    | The last sync hit an error; `error_message` explains it.                                        |
| `idle`      | Reserved initial/quiescent state.                                                               |
| _(no row)_  | Edition present in `content_index` but never tracked by a sync run — shown as **Never synced**. |

**Where to check it:**

- **Admin UI:** `/account/admin/content-sync` — an admin-gated (`profiles.is_admin`) page showing each edition's status, indexed count, last-synced time and any error, with a summary of completed/running/failed/never-synced.
- **JSON:** `GET /api/admin/content-sync/status` (secret-gated, `x-content-sync-secret: $CONTENT_SYNC_SECRET`) returns the same data for scripting/alerting.

Successful syncs update `last_synced_at`; failures populate `error_message`, so
a stale `last_synced_at` or a non-null `error_message` is the signal that an
edition's indexing needs attention.

### Content-index health report (NOA-29)

A one-shot report over `content_index` + `content_sync_cursor` — row count,
full-text coverage, tag/category/content coverage, published-date span, and sync
status per edition. Run it in the Supabase SQL editor, via the MCP
`execute_sql` tool, or `psql`:

```sql
select
  ci.edition_code,
  count(*)                                                              as rows,
  count(*) filter (where ci.search_vector is null)                     as missing_vector,
  round(100.0 * count(*) filter (where coalesce(array_length(ci.tags,1),0) > 0)       / nullif(count(*),0)) as pct_tags,
  round(100.0 * count(*) filter (where coalesce(array_length(ci.categories,1),0) > 0) / nullif(count(*),0)) as pct_categories,
  round(100.0 * count(*) filter (where ci.content_plain is not null)   / nullif(count(*),0)) as pct_content,
  min(ci.published_at)::date                                           as oldest,
  max(ci.published_at)::date                                           as newest,
  c.sync_status, c.last_synced_at, c.error_message
from public.content_index ci
left join public.content_sync_cursor c on c.edition_code = ci.edition_code
group by ci.edition_code, c.sync_status, c.last_synced_at, c.error_message
order by rows desc;
```

Editions with a cursor row but **no** `content_index` rows (never populated) are
found with:

```sql
select edition_code, sync_status, last_synced_at, error_message
from public.content_sync_cursor c
where not exists (select 1 from public.content_index ci where ci.edition_code = c.edition_code);
```

**What "healthy" looks like at launch** (per edition that is meant to be live):

| Metric           | Healthy target                                | Why                                                              |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| `rows`           | ≥ ~200 (editions with a real catalogue)       | Enough breadth for meaningful search across categories           |
| `missing_vector` | **0**                                         | Every row must be searchable (the `search_vector` trigger fired) |
| `pct_categories` | ~100%                                         | Faceted / category search                                        |
| `pct_tags`       | ≥ 80%                                         | Tag facets + sponsored-content targeting                         |
| `newest`         | within the sync cadence (≈24–25h of now)      | Confirms incremental sync is current                             |
| `oldest`         | well before `newest`                          | Confirms the historical backfill ran                             |
| `sync_status`    | `completed` (or `idle`), `error_message` null | No failed/stuck syncs                                            |

A row count near zero, an old `newest`, or a non-null `error_message` marks an
edition that needs a (re-)backfill or investigation. The subset of this report
(status, counts, errors) is also visible at `/account/admin/content-sync`.

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

- Every pull request runs CI without changing production.
- Merge to `main` runs CI again; the `deploy-coolify` job queues production only after every gate passes.
- Rollback: Coolify → Deployments → select a previous successful image and roll it back.
- The Playwright suite can also smoke-test a live deployment:
  ```bash
  PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=https://<preview-url> pnpm test:e2e
  ```

## 7. Known build warnings (accepted)

Two non-blocking warnings appear in the Coolify / `next build` logs. Both are
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
2. **`next.config.ts` TypeScript bootstrap.** The production image keeps TypeScript to load
   the TS-authored `next.config.ts`, emitting a one-line bootstrap note.
   Migrating to `next.config.mjs` was tried (PR #1475) and broke `@/` path-alias
   resolution under the production install mode, so it was reverted. The `.ts`
   config is kept; the note is accepted until alias resolution can first be
   proven in a pull-request build.

## 8. Deferred: Paystack & subscriptions

Payments/subscriptions are not part of this phase. The env vars are reserved in
`.env.example`, and the CSP/Permissions-Policy entries they need were deliberately
removed from the application CSP. When the monetization epic starts: set both Paystack
keys in Coolify, re-add `https://api.paystack.co` to `connect-src` and
`https://checkout.paystack.com` to `form-action`, and change `payment=()` to
`payment=(self)`.
