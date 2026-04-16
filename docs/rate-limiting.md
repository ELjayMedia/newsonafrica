# Rate Limiting Policy

This document describes where rate limits are enforced in the News on Africa
backend, the current thresholds, and the playbook for adding or tuning new
limits.

> Status: as of 2026-04-16. When you change a limit, update this doc in the
> same PR.

## Scope and limitations

All rate limiting today is **per-instance, in-memory**. Limits reset on
deploys and do not coordinate across serverless instances. This is good
enough for burst protection on the current traffic profile but is **not a
security boundary** — high-volume or distributed abuse must be mitigated at
the edge (WAF, CDN rules) until a shared store (Upstash / Redis / Supabase
table) is wired in.

Known consequences:

- A user whose traffic is sprayed across multiple instances sees the
  effective limit multiplied by the instance count.
- Cold starts reset per-IP counters, so a spammer hitting cold instances
  may evade enforcement.
- Limits are IP-keyed via `x-forwarded-for`/`x-real-ip`, which requires a
  trusted reverse proxy. Direct-to-origin traffic defaults to `127.0.0.1`
  and therefore shares a bucket — that is acceptable in our deployment
  topology (origin sits behind Cloudflare / Vercel edge) but worth
  remembering if you change the hosting model.

## Enforcement points

### 1. Comments API — `app/api/comments/route.ts`

Uses `applyRateLimit` → `lib/rateLimit.ts#rateLimit` via the
`makeRoute({ rateLimit: ... })` helper in `lib/api/route-helpers.ts`.

| Method | Limit | Window | Token env |
| --- | --- | --- | --- |
| `GET /api/comments` | 30 requests | 60 s | `COMMENTS_GET_API_CACHE_TOKEN` |
| `POST /api/comments` | 5 requests | 60 s | `COMMENTS_POST_API_CACHE_TOKEN` |
| `PATCH /api/comments` | 10 requests | 60 s | `COMMENTS_PATCH_API_CACHE_TOKEN` |

There is an additional **per-user post cooldown** of 10 s
(`COMMENT_POST_RATE_LIMIT_MS`) enforced inside the POST handler, independent
of the IP-based limiter.

Response contract on limit hit:

- HTTP 429
- JSON body `{ success: false, error: string, meta?: { rateLimit: { retryAfterSeconds } } }`
- Clients (`components/CommentForm.tsx`) should display the retry hint.

### 2. Search API — `app/api/search/route.ts`

Uses a **route-local** `Map`-based limiter (not the shared helper).

| Setting | Value |
| --- | --- |
| Limit | 50 requests |
| Window | 60 s |
| Dev mode | Disabled (`NODE_ENV === "development"` short-circuits) |
| Key | `search:${x-forwarded-for | x-real-ip | "unknown"}` |

Response on limit hit:

- HTTP 429 (via `respondWithSearch`)
- JSON body `{ error: "Too many search requests", message: "Please try again later" }`
- `Cache-Control: private, no-store, no-cache, must-revalidate`

> Cleanup note: the search route's private limiter predates `makeRoute` and
> should eventually be migrated onto `applyRateLimit` so all route limits
> share one store and share the 500-token LRU eviction strategy in
> `lib/rateLimit.ts`.

### 3. Other surfaces

There are **no** rate limits today on:

- Bookmarks API (`app/api/bookmarks/**`) — gated by Supabase RLS + session.
- GraphQL WordPress reads — protected by Next.js cache tags + upstream WP
  rate limiting.
- Paystack webhook / subscription callbacks — upstream limits apply.

If you add a new authenticated mutation route, add a limit in the same PR.
Authenticated-only routes still need limits to defend against bot-registered
accounts.

## Shared helpers reference

| Helper | File | Purpose |
| --- | --- | --- |
| `rateLimit({ interval, uniqueTokenPerInterval })` | `lib/rateLimit.ts` | LRU token-bucket factory used by `applyRateLimit`. Throws `Error("Rate limit exceeded")` on overflow. |
| `applyRateLimit(request, limit, token)` | `lib/api-utils.ts` | Wraps the shared limiter, resolves the identifier from headers, returns a 429 `NextResponse` on limit. |
| `checkRateLimit(key, limit, windowMs)` | `lib/rate-limit-utils.ts` | Standalone sliding-window limiter with `retryAfter` output. Used by non-route callers. |
| `calculateBackoff(baseDelay, retryCount, maxMultiplier)` | `lib/rate-limit-utils.ts` | Helper for client-side exponential backoff on retry. |
| `formatRetryMessage(seconds)` | `lib/rate-limit-utils.ts` | Human-readable retry copy. |

## Adding a new limit

1. Decide on limit + window. If the route mutates state, start strict
   (≤10/min). Tune based on real traffic (check `lib/log.ts` warn-level
   entries for `"Rate limit exceeded"`).
2. Prefer `makeRoute({ rateLimit: { limit, tokenEnv } })` over rolling your
   own store.
3. Set a unique `tokenEnv` value per route/method so users hitting
   different endpoints don't share a bucket.
4. Add a row to the **Enforcement points** table above.
5. If the limit is security-critical, open a follow-up to back it with a
   shared store — the in-memory limiter is best-effort only.

## Known follow-ups

- Migrate the search route off its private `Map` onto `applyRateLimit`.
- Evaluate a shared store (Redis / Upstash / `rate_limit_counters` table)
  so limits survive deploys and coordinate across instances.
- Emit structured metrics (limit hit counts per route) through
  `lib/log.ts` so tuning isn't blind.
