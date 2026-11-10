# Data flow: WordPress → Supabase → Next.js (NOA-16)

How content and reader state move through News on Africa, and **which system
owns what**. This reflects the current rebuild (WPGraphQL DAL + the
`edition_code` Supabase schema), so it supersedes earlier data-flow notes.

## System ownership

| Concern                                                                            | Owner                                 | Notes                                                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Editorial content (article title, slug, body, media, author, terms, publish state) | **WordPress** (headless, per-edition) | Source of truth. Read via WPGraphQL.                                                                |
| Public rendering & routing                                                         | **Next.js on self-hosted Coolify**    | App Router server components; no article content stored here.                                       |
| Search / discovery read-model                                                      | **Supabase `content_index`**          | A denormalized, full-text-searchable projection of published WordPress posts. **Not** a second CMS. |
| Reader identity & interaction (auth, profile, bookmarks, comments)                 | **Supabase**                          | Independent of article content; references posts by ID only.                                        |

There is **no** `wp_posts_cache` table in the current rebuild — `content_index`
is the only Supabase-side projection of WordPress content.

## Editions

Three country editions — Eswatini (`sz`), South Africa (`za`), Nigeria (`ng`)
— each a WordPress site under a subpath of `WORDPRESS_API_URL`:

- REST: `${WORDPRESS_API_URL}/<edition>/wp-json/wp/v2`
- GraphQL: `${WORDPRESS_API_URL}/<edition>/graphql`

Resolved in `lib/wordpress/countries.ts` (`getRestBase` / `getGraphQLEndpoint`).
Nigeria can override its endpoints via `NEXT_PUBLIC_WP_NG_REST_BASE` /
`NEXT_PUBLIC_WP_NG_GRAPHQL` (its content lives on a different host); the other
editions fall back to the subpath pattern above.

## 1. Read path (rendering)

```
Reader → Cloudflare Tunnel → Coolify/Next.js
  → App Router server component (e.g. app/[countryCode]/article/[slug]/page.tsx)
    → DAL: lib/dal/posts.ts  (WPGraphQL queries; databaseId → wp_post_id)
      → lib/wordpress/graphql-client.ts → WordPress <edition> GraphQL endpoint
    → Next fetch cache (tags from lib/wordpress/cache-tags.ts, revalidate=60s)
  → HTML
```

The DAL (`lib/dal/*`) is the only approved way to read WordPress. It normalizes
GraphQL shapes into `Post`/`PostSummary` (`lib/dal/mappers.ts` for REST-shaped
data, `lib/dal/posts.ts` for GraphQL) and carries the numeric WordPress
`databaseId` through the app as `wp_post_id`. Category/tag/author listings and
the home rail read the same way. Reads degrade gracefully: a CMS/network
failure logs and renders an empty/partial surface rather than a 500.

## 2. Sync path (WordPress → `content_index`)

Two entry points, both in `lib/content-sync/sync.ts`, writing rows shaped by
`lib/content-sync/map-to-content-index.ts` and upserting on
`(edition_code, wp_post_id)`:

- **Near-real-time (webhook, NOA-88):** `POST /api/webhooks/wordpress` — a
  WordPress `save_post` / `before_delete_post` hook posts
  `{ action, country, post:{ id, slug, ... } }` (authenticated by
  `x-webhook-secret` or an HMAC `x-wp-signature`). The route revalidates the
  affected Next cache tags and calls `syncPostById` / `deletePostFromIndex`.
- **Bulk backfill:** `POST /api/admin/content-sync/backfill` (secret-gated) or
  `pnpm content-sync:backfill`, via `runBackfillForCountry` → `listPostsForSync`
  → upsert. Used for initial population or repair.

Each run records per-edition state in `content_sync_cursor`
(`sync_status`, `last_synced_at`, `last_wp_post_id`, `error_message`). A
`BEFORE INSERT/UPDATE` trigger (`content_index_search_vector_trigger`)
populates the `search_vector` tsvector on write.

`content_index` columns: `edition_code`, `wp_post_id`, `slug`, `url_path`,
`title`, `excerpt`, `content_plain`, `tags[]`, `categories[]`, `author`,
`featured_image_url`, `published_at`, `search_vector`. Only published content is
indexed (there is no `status` column).

## 3. Discovery path (`content_index` → reader)

- **Search** (`lib/search`): the `search_content` RPC (weighted FTS over
  `search_vector`, returns a windowed `total_count` for exact pagination) and
  `search_suggestions` (trigram type-ahead). Both return `edition_code`.
- **Most-read rail** (`lib/dal/most-read.ts`): the `most_read_content` RPC.
- **Sitemaps** (`lib/seo/sitemap-data.ts`): read `content_index` directly by
  `edition_code`.

All of these link the reader back to the canonical article route
`/<edition>/article/<slug>` (see `url_path` / `lib/content-sync/article-url.ts`).

## 4. Reader state (Supabase, keyed to WordPress IDs)

| Feature      | Table                                                       | Link to WordPress                                                                         |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Auth         | `auth.users`                                                | —                                                                                         |
| Profile      | `public.profiles` (`full_name`, `country`, `avatar_url`, …) | —                                                                                         |
| Bookmarks    | `public.bookmarks`                                          | `(user_id, wp_post_id, edition_code)` unique; snapshots title/slug/excerpt/featured_image |
| Comments     | `public.comments`                                           | `(edition_code, wp_post_id)`; threaded by `parent_id`                                     |
| Search index | `public.content_index`                                      | `(edition_code, wp_post_id)` unique                                                       |

**Cross-system join key:** the pair **`(edition_code, wp_post_id)`** is the
stable identifier for a piece of content across `content_index`, `bookmarks`,
and `comments`. `wp_post_id` comes from GraphQL `databaseId`, normalized once at
the DAL boundary. Article content is never duplicated into bookmarks/comments —
they reference it by this key (bookmarks additionally snapshot display metadata
so a saved item still renders if the article isn't indexed).

## 5. Monitoring & operations

- **Sync health:** `/account/admin/content-sync` (admin UI) and
  `GET /api/admin/content-sync/status` (JSON) read `content_sync_cursor` +
  live `content_index` counts. See [deployment.md](./deployment.md) §4.
- **Cache invalidation:** the webhook revalidates Next fetch-cache tags on
  publish/update; a daily fallback revalidation keeps surfaces fresh.

## Current state & gaps

- `content_index` is **populated** (initial backfill run for sz/za/ng).
- **No scheduled full re-sync** yet — freshness relies on the WordPress webhook
  for incremental updates; a periodic backfill (cron/Action calling the backfill
  route) would catch anything the webhook misses.
- Nigeria content depends on its endpoint override env vars being set in
  production (see NOA-121); without them `/ng` falls back to the subpath host.
- The checked-in `supabase/migrations/*.sql` predate the live `edition_code`
  schema — `lib/supabase/types.ts` is the current source of truth (see
  deployment.md §4 schema note).
