# Caching & ISR strategy

Content comes from headless WordPress (`lib/wordpress/`, `lib/dal/`) and is
mirrored into Supabase (`lib/content-sync/`) for search/most-read. Both
layers use **tag-based Next.js fetch caching** so a WordPress edit shows up
quickly without a blanket cache flush.

## How a request is cached

Every WordPress fetch (REST via `fetchWordPressRest(List)`, GraphQL via
`fetchWordPressGraphQL`) accepts `{ tags, revalidate }`, which map straight
onto `fetch`'s `next: { tags, revalidate }`. The DAL (`lib/dal/*`) sets both
on every call:

| DAL call | Tags attached | Time-based revalidate |
| --- | --- | --- |
| `listPosts` | `posts(country)` + `category`/`tag`/`author` (if filtered) | 60s |
| `getPostBySlug` / `getPostById` | `postSlug`/`post(country, id)` + `posts(country)` | 60s |
| `listCategories` / `getCategoryBySlug` | `categories`/`category(country, slug)` | 300s |
| `listTags` / `getTagBySlug` | `tags`/`tag(country, slug)` | 300s |
| `listAuthors` / `getAuthorBySlug` | `authors`/`author(country, slug)` | 300s |

Tag names come from `lib/wordpress/cache-tags.ts` (`cacheTags.*`) so every
caller (DAL, webhook, future routes) constructs the *same* string for the
same entity — e.g. `cacheTags.postSlug("ng", "election-results")` always
produces `country:ng:post-slug:election-results`.

The time-based `revalidate` is a safety net (content is never more than a
minute or five stale even if a webhook is missed); the tag is what makes
updates feel instant when WordPress does call the webhook.

## On-demand revalidation (the webhook)

`app/api/webhooks/wordpress/route.ts` is called by a WordPress plugin hook
(`save_post`, `before_delete_post`, term edit hooks) with the changed
post/category/tag and the country edition it belongs to. It:

1. Validates the request via `x-webhook-secret: <WORDPRESS_WEBHOOK_SECRET>`
   or an HMAC `x-wp-signature: sha256=<hex>` of the raw body.
2. Calls `revalidateTag()` for every tag the change could affect —
   `country`, `home`, `posts`, the specific `post`/`postSlug`, and any
   `category`/`tag`/`author` the post belongs to.
3. For post publish/update/delete, also calls
   `lib/content-sync/sync.ts` (`syncPostById` / `deletePostFromIndex`) to
   keep the Supabase `content_index` in step with WordPress, synchronously,
   before responding.

If `country` is omitted or unrecognized, the handler conservatively
revalidates all supported countries rather than risking stale pages.

## Content index (search / most-read)

`content_index` (see `supabase/migrations/20260702120000_content_index.sql`)
is a denormalized read model, not a cache in the Next.js sense — it's
queried directly by Supabase (via `lib/supabase/server.ts` /
`lib/supabase/browser.ts`), not through `fetch`. It's kept in sync by:

- The webhook (real-time, single post) — see above.
- `scripts/backfill-content-index.ts` / `POST /api/admin/content-sync/backfill`
  (bulk, for initial load or repair) — see `docs/` note in NOA-87's commit
  and the script's own header comment for usage.

`content_sync_cursor` tracks per-country sync status/timestamps, surfaced by
`GET /api/admin/content-sync/status`.

## Rendering strategy for pages (guidance for the Reading phase)

- **Home / category / tag feeds**: fetch through the DAL with the tags
  above; no `export const revalidate` needed at the page level — the fetch
  cache config already governs it. Use `generateStaticParams` sparingly
  (country list only) since most content is time-sensitive.
- **Article pages**: fetch `getPostBySlug`, which tags
  `postSlug`/`posts`; safe to prerender with `dynamicParams = true` and let
  ISR + the webhook handle updates.
- **Search / most-read**: read from Supabase directly (not the WordPress
  fetch cache) — call `getContentSyncStatus`-style server functions built on
  `lib/supabase/server.ts`, and rely on Supabase's own consistency (no
  Next.js tag needed) since the content index already reflects the webhook.
- Avoid `cache: "no-store"` outside of admin/webhook routes — it defeats
  the point of the tag strategy and adds latency to every request.
