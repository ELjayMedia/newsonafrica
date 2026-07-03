# Search architecture & content-index backfill

How search works end to end (NOA-93..96), and how to (re)populate the index
that powers it.

## Architecture

WordPress remains the source of truth for content. Search never queries
WordPress at request time — it runs against a Supabase mirror:

```
WordPress (per-country sites)
   │  backfill script / webhook
   ▼
content_index (Supabase table, one row per post per country)
   │  search_vector maintained by a BEFORE INSERT OR UPDATE trigger
   ▼
search_content / search_suggestions RPCs (SECURITY-scoped SQL functions)
   │
   ▼
lib/search (typed server-only query layer, cookie-free public client)
   │                         │
   ▼                         ▼
/search page (NOA-94)   /api/search/suggest → SearchBox combobox (NOA-95)
```

Key pieces:

| Piece | Where | Notes |
| --- | --- | --- |
| `content_index` table | `supabase/migrations/20260702120000_content_index.sql` | Unique on `(country, wp_post_id)`; RLS: public read, service-role write. |
| `search_vector` trigger | same migration | Weighted tsvector — title (A) > excerpt/tags/categories (B) > body text (C). Fires on insert **and** update, so re-syncing a row always refreshes it. |
| `search_content` RPC | `supabase/migrations/20260702150000_search_pagination.sql` | Ranked FTS (`plainto_tsquery`, `ts_rank_cd`) over published rows, optional country/category filter, `total_count` window count for real pagination. |
| `search_suggestions` RPC | same migration | Trigram-backed title substring match (ILIKE-escaped), prefix hits ranked first. |
| Query layer | `lib/search/` | `searchContent` / `searchSuggestions` (server-only, degrade to empty results on failure) + pure param normalization in `lib/search/params.ts` (shared with the page, the suggest API and the search box; unit tested). |
| Results page | `app/search/page.tsx` | `?q=`, `?page=`, `?country=`; country filter pills; no-JS GET form; `noindex`. |
| Suggest API | `app/api/search/suggest/route.ts` | `GET ?q=&country=&limit=`, validated + capped, `Cache-Control: no-store`. |
| Search box | `components/search-box.tsx` | Debounced (250 ms) ARIA combobox in the site header; suggestion picks go straight to the article, submit goes to `/search?q=…`. |

## Keeping the index in sync

Two complementary paths, both writing through the service-role client and
upserting on `(country, wp_post_id)`:

1. **Near-real-time**: the WordPress webhook
   (`app/api/webhooks/wordpress/route.ts`) syncs or deletes a single post as
   it is published, updated, trashed or deleted.
2. **Bulk backfill**: pages through every post for one or all countries.
   Run it after applying the `content_index` migration, after a bulk
   WordPress import, or to repair a drifted index.

### Running a backfill

The backfill talks to a *running* app instance (the script cannot import the
server-only sync modules directly), so start `pnpm dev` or target a deployed
URL:

```bash
# all countries against http://localhost:3000
CONTENT_SYNC_SECRET=... pnpm content-sync:backfill

# one country, custom page size, deployed target
CONTENT_SYNC_SECRET=... pnpm content-sync:backfill \
  --country=sz --per-page=50 --base-url=https://example.com
```

`CONTENT_SYNC_SECRET` must match the value the target deployment validates
(`lib/content-sync/admin-auth.ts`). The script loops
`POST /api/admin/content-sync/backfill` page by page per country; each call
syncs one WordPress page, so no single request can hit a serverless timeout.
Progress/state is recorded per country in `content_sync_cursor` and readable
via `GET /api/admin/content-sync/status` (same secret).

### Idempotency & rebuild semantics

- Re-running the backfill is **safe and idempotent**: rows are upserted on
  the `(country, wp_post_id)` unique key, and the trigger recomputes
  `search_vector` (and `updated_at`) on every update. Running it twice
  converges to the same state.
- The index is a disposable mirror — it can be fully rebuilt from WordPress
  at any time. For a from-scratch rebuild, delete the affected rows first
  (`delete from content_index where country = '…';` via the Supabase SQL
  editor or service-role client), then backfill.
- **Known caveat**: the backfill only upserts; posts deleted in WordPress
  while the webhook was down are not pruned by a backfill and linger until a
  webhook delete or a manual rebuild removes them.

### What the index covers (and doesn't)

- `content_plain` is capped at 5,000 characters per post
  (`lib/content-sync/map-to-content-index.ts`) — enough for relevance
  signal; the full article always renders from WordPress.
- The author name is stored (and shown in results) but deliberately **not**
  part of `search_vector`; finding stories by author is what the author
  pages (`/{country}/author/{slug}`) are for.
- Only `status = 'publish'` rows are returned by either RPC.
- FTS uses the `english` configuration; queries in other languages fall back
  to exact-word matching quality.
