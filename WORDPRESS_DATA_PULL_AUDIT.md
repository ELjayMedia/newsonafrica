# WordPress Data Pull Audit Report - News on Africa

**Date:** January 2025  
**Project:** ELjayMedia/newsonafrica  
**Branch:** claude/code-review-sbyzb8  
**Status:** ✅ WordPress integration is properly implemented

---

## Executive Summary

The app correctly pulls data from WordPress via a multi-layered architecture with proper error handling, caching, webhooks, and content synchronization. The integration follows a well-documented pattern across REST and GraphQL clients with appropriate retry logic and per-country endpoint routing.

---

## Architecture Overview

### 1. **Data Flow Layers** (from source to presentation)

```
WordPress (Headless CMS)
        ↓
lib/wordpress/rest-client.ts & graphql-client.ts (API clients)
        ↓
lib/wordpress/http.ts (Resilient fetch with retry/timeout)
        ↓
lib/dal/ (Data Access Layer - posts, categories, authors, tags)
        ↓
lib/content-sync/sync.ts (Supabase content index)
        ↓
App pages (consume data via DAL)
```

### 2. **Multi-Country Support**

The app is architected as a **WordPress multisite** with per-country editions:
- **Base URL:** `${WORDPRESS_API_URL}/<country>/wp-json/wp/v2` (REST)
- **GraphQL:** `${WORDPRESS_API_URL}/<country>/graphql`
- **Example:** Nigeria can override with custom `NEXT_PUBLIC_WP_NG_REST_BASE` and `NEXT_PUBLIC_WP_NG_GRAPHQL`

**File:** `lib/wordpress/countries.ts` - Correctly handles country normalization and endpoint resolution.

---

## ✅ Verified Implementations

### A. REST API Client (`lib/wordpress/rest-client.ts`)

**Status:** ✅ Properly Implemented

**Features:**
- Typed REST API client wrapping `fetchWithRetry`
- Query parameter building with proper handling of arrays/undefined values
- Pagination via `X-WP-Total` and `X-WP-TotalPages` headers
- Next.js fetch cache integration with tags and revalidation
- Proper error handling with `WordPressRestError` class

**Example Usage:**
```typescript
const { items, pageInfo } = await fetchWordPressRestList<WPRestPost>(country, "posts", {
  params: {
    page: 1,
    per_page: 20,
    _embed: true,  // Embed author, featured image, terms
    categories: categoryId,
    orderby: "date",
    order: "desc",
  },
  tags: [cacheTags.posts(country)],
  revalidate: 60, // 60-second cache
});
```

**Test Coverage:** ✅ `lib/wordpress/rest-client.test.ts` validates URL construction, error handling, and pagination parsing.

---

### B. GraphQL Client (`lib/wordpress/graphql-client.ts`)

**Status:** ✅ Properly Implemented

**Features:**
- Discriminated result type: `{ ok: true, data }` or detailed `{ ok: false, kind, error }`
- Proper error classification (HTTP errors, GraphQL errors, invalid payloads)
- Retry logic via `fetchWithRetry`
- Next.js fetch cache integration

**Design Benefit:** Callers can branch on specific error types without try/catch for expected failures.

---

### C. Resilient HTTP Layer (`lib/wordpress/http.ts`)

**Status:** ✅ Best Practices Implementation

**Features:**
- **Timeout handling:** 10s (dev) / 20s (prod) default
- **Automatic retry:** 4 attempts with exponential backoff
- **Transient failures retried:** 408, 425, 429, 5xx status codes
- **Jitter:** ±20% on backoff to prevent thundering herd
- **Retry-After header:** Honored for rate-limit responses
- **Configurable:** Via env vars (`WORDPRESS_REQUEST_TIMEOUT_MS`, `WORDPRESS_RETRY_ATTEMPTS`, `WORDPRESS_RETRY_BACKOFF_MS`)

**Example Flow:**
```
Attempt 1: network error → wait 750ms + jitter → retry
Attempt 2: 503 Service Unavailable → wait 1500ms + jitter → retry  
Attempt 3: 429 Too Many Requests → wait 5000ms (capped) → retry
Attempt 4: success ✅
```

---

### D. Data Access Layer (`lib/dal/`)

**Status:** ✅ Properly Abstracted

**Key Functions:**

#### `lib/dal/posts.ts`
- ✅ `listPosts()` - Filter by country, category, tag, author with pagination
- ✅ `getPostBySlug()` - Fetch single post with fallback across editions
- ✅ `getPostBySlugWithFallback()` - Cross-country slug resolution for link resilience
- ✅ `getRelatedPosts()` - Smart matching via shared categories/tags
- ✅ `getPostById()` - Direct ID lookup with 404 handling

**Cache Strategy:**
```typescript
const REVALIDATE_SECONDS = 60;
const tags = [
  cacheTags.posts(country),
  cacheTags.category(country, slug),  // Category-specific tag
  cacheTags.postSlug(country, slug),  // Post slug tag
];
```

#### `lib/dal/home.ts`
- ✅ `getHomeFeed()` - Curated + latest posts with graceful degradation
- Editor-pinned stories via "fp" (front-page) tag
- Falls back to empty if either feed fetch fails

#### Other DAL modules
- ✅ `categories.ts` - Category listing and slug→ID resolution
- ✅ `tags.ts` - Tag listing and slug→ID resolution
- ✅ `authors.ts` - Author listing and slug→ID resolution
- ✅ `countries.ts` - Country list and validation

**Test Coverage:** Extensive tests validate filtering, pagination, and fallback behavior.

---

### E. Webhook Integration (`app/api/webhooks/wordpress/route.ts`)

**Status:** ✅ Secure & Comprehensive

**Features:**
- ✅ HMAC-SHA256 signature verification (`x-wp-signature` header)
- ✅ Shared secret auth (`x-webhook-secret` header)
- ✅ Timing-safe comparison to prevent timing attacks
- ✅ Handles 4 action types:
  - `post_published` → sync + revalidate cache
  - `post_updated` → sync + revalidate cache
  - `post_deleted` → remove from index + revalidate
  - `category_updated` / `tag_updated` → revalidate cache
- ✅ Per-country cache tag invalidation
- ✅ Fallback: unknown country → revalidate all editions

**Payload Example:**
```json
{
  "action": "post_published",
  "country": "ng",
  "post": {
    "id": 123,
    "slug": "article-headline",
    "categorySlugs": ["politics", "africa"],
    "tagSlugs": ["breaking-news", "fp"]
  }
}
```

---

### F. Content Sync (`lib/content-sync/sync.ts`)

**Status:** ✅ Production-Ready

**Features:**
- ✅ Single-post sync via `syncPostById()` (webhook-triggered, near real-time)
- ✅ Bulk sync via `syncPostsPage()` (backfill script, admin routes)
- ✅ Upsert into Supabase `content_index` table
- ✅ Conflict resolution: on-conflict key is `(country, wp_post_id)`
- ✅ Error batching and reporting

**Two Entry Points:**
1. **Webhook** (`app/api/webhooks/wordpress/route.ts`): Single post on publish/update
2. **Admin Routes** (`app/api/admin/content-sync/{status,backfill}`): Bulk backfill
3. **Script** (`scripts/backfill-content-index.ts`): Manual repopulation

---

### G. Page Implementations

#### Home Page (`app/[countryCode]/page.tsx`)

**Status:** ✅ Correctly Fetches Data

```typescript
const [feedResult, mostReadResult] = await Promise.allSettled([
  getHomeFeed(countryCode, { total: 13, secondary: 3 }),
  getMostReadPosts(countryCode, 6),
]);
```

- ✅ Uses DAL for data fetching
- ✅ Graceful degradation: renders fallback UI if both feeds fail
- ✅ Dynamic rendering (no static generation) — appropriate for time-sensitive content
- ✅ Proper country validation
- ✅ Server-side data loading (no client-side hydration mismatch)

#### Article Page (`app/[countryCode]/article/[slug]/page.tsx`)

**Status:** ✅ Correctly Fetches Data

```typescript
const resolved = await getPostBySlugWithFallback(countryCode, slug);
const related = await getRelatedPosts(sourceCountry, post, 3);
const mostRead = await getMostReadPosts(countryCode, 6);
```

- ✅ Cross-country slug fallback (link resilience)
- ✅ Related articles via shared taxonomy
- ✅ Most-read sidebar rail
- ✅ Proper 404 handling
- ✅ Rich metadata for SEO (OpenGraph, Twitter Card, structured data)

---

## Environment Configuration

**Status:** ✅ Properly Validated

**File:** `.env.example` and `lib/env.ts`

**Required Variables:**
```env
WORDPRESS_API_URL=https://cms.example.com
WORDPRESS_WEBHOOK_SECRET=<change-me>
WORDPRESS_RETRY_ATTEMPTS=4
WORDPRESS_RETRY_BACKOFF_MS=750
```

**Optional Overrides (per-country):**
```env
NEXT_PUBLIC_WP_NG_REST_BASE=https://cms.example.com/ng/wp-json/wp/v2
NEXT_PUBLIC_WP_NG_GRAPHQL=https://cms.example.com/ng/graphql
```

**Validation:** Zod schema in `lib/env.ts` enforces:
- URLs are valid
- Secrets are at least 16 characters
- All required vars present before app starts

---

## Caching Strategy

**Status:** ✅ Well-Documented

**Reference:** `docs/caching-strategy.md`

**Per-Page Cache Tags:**
- `posts:<country>` — All posts for edition
- `post:<country>:<id>` — Specific post
- `post-slug:<country>:<slug>` — Post by slug
- `category:<country>:<slug>` — Posts in category
- `tag:<country>:<slug>` — Posts with tag
- `author:<country>:<slug>` — Posts by author

**Revalidation:**
- Home feed: 60 seconds
- Article pages: 60 seconds
- Content sync: On-demand (webhook revalidates relevant tags)

**Next.js Integration:**
```typescript
const { items, pageInfo } = await fetchWordPressRestList<WPRestPost>(
  country, 
  "posts",
  {
    tags: [cacheTags.posts(country), cacheTags.category(country, slug)],
    revalidate: 60,  // Cache for 60 seconds
  }
);
```

---

## Testing Coverage

**Status:** ✅ Unit Tests Verified

**Test Files:**
- ✅ `lib/wordpress/rest-client.test.ts` — URL building, error handling, pagination
- ✅ `lib/wordpress/graphql-client.test.ts` — Error classification
- ✅ `lib/wordpress/http.test.ts` — Timeout, retry, backoff logic
- ✅ `app/api/webhooks/wordpress/route.test.ts` — Webhook auth and tag revalidation
- ✅ `lib/dal/` — DAL functions with filtering and fallback

**E2E Tests:**
- ✅ `e2e/article-404.spec.ts` — 404 handling
- ✅ `e2e/home.spec.ts` — Home page rendering
- ✅ `e2e/search.spec.ts` — Search integration

---

## Security Checklist

**Status:** ✅ All Recommendations Met

| Concern | Implementation | Status |
|---------|---------------|----|
| API Key Exposure | Server-only via `lib/env.ts` | ✅ |
| Webhook Auth | HMAC-SHA256 + timing-safe comparison | ✅ |
| SQL Injection | Supabase parameterized queries (DAL uses `upsert()`) | ✅ |
| Network Resilience | Retry + timeout for transient failures | ✅ |
| Rate Limiting | Respects `Retry-After` header | ✅ |
| RLS | Content index assumes Supabase RLS configured | ⚠️ Verify in Supabase |
| CORS | Proper `Accept: application/json` headers | ✅ |

---

## ⚠️ Observations & Recommendations

### 1. **Supabase RLS Policy Verification Needed**

The app assumes Row-Level Security (RLS) is configured on the `content_index` table in Supabase. **Action:**
- Verify that RLS policies exist and are enforced
- Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` has read-only access via RLS

### 2. **Webhook Plugin in WordPress**

The app expects a WordPress plugin to POST to `/api/webhooks/wordpress` on post save/delete. **Current Status:**
- The endpoint is implemented and secured ✅
- The WordPress plugin or hook is **NOT included in this codebase**
- **Action:** Ensure WordPress has a plugin that:
  - Listens to `save_post` / `before_delete_post` hooks
  - POSTs the payload with HMAC signature
  - Example payload provided in route comments

### 3. **Content Index Backfill**

The content index (Supabase) must be populated. **Available Methods:**
1. **Script:** `pnpm content-sync:backfill`
2. **Admin Route:** `POST /api/admin/content-sync/backfill` (requires `CONTENT_SYNC_SECRET`)
3. **Manual:** Call via CLI or cron

**Action:** Run one backfill after deploying to populate the index.

### 4. **Most-Read Tracking**

The app shows most-read posts via `getMostReadPosts()`. **Current Implementation:**
- **File:** `lib/dal/most-read.ts`
- Likely fetches from Supabase table (needs verification)
- **Action:** Verify the `most_read` table exists and is populated

### 5. **Search Implementation**

The app includes search via `/search` and `/api/search/suggest`. **Current Status:**
- Uses content index (Supabase)
- **File:** `lib/dal/` + Supabase full-text search
- **Action:** Verify Supabase search indexes are configured

### 6. **Nigeria Edition Endpoint Override**

Environment variables allow Nigeria to have a custom WordPress instance. **Current Setup:**
```env
NEXT_PUBLIC_WP_NG_REST_BASE=...
NEXT_PUBLIC_WP_NG_GRAPHQL=...
```

**Action:** If using a separate Nigeria instance, populate these vars.

---

## Performance Metrics

**Status:** ✅ Optimized

| Aspect | Implementation | Notes |
|--------|---------------|----|
| Timeout | 10s (dev) / 20s (prod) | Configurable via env |
| Retry Attempts | 4 by default | Exponential backoff with jitter |
| Max Backoff | 5000ms | Prevents excessive delays |
| Cache Duration | 60 seconds | Balances freshness vs. performance |
| Embed Strategy | `_embed=true` | Reduces N+1 requests (author, image, terms) |
| Pagination | Per-page: 20–50 posts | Configurable in DAL |

---

## Files to Review/Verify

### Critical
- [ ] `/vercel/share/.env.project` — Confirm all WordPress vars are set
- [ ] WordPress site — Test webhook delivery to `/api/webhooks/wordpress`
- [ ] Supabase — Verify `content_index` table exists and RLS is configured

### Important
- [ ] `scripts/backfill-content-index.ts` — Run to populate content index
- [ ] `lib/dal/most-read.ts` — Verify most-read logic
- [ ] WordPress plugin — Ensure it POSTs webhooks correctly

### Reference
- [ ] `docs/caching-strategy.md` — Full cache tag documentation
- [ ] `.env.example` — Complete environment variables guide

---

## Summary Table

| Component | Status | Coverage | Risk |
|-----------|--------|----------|------|
| REST Client | ✅ | High | Low |
| GraphQL Client | ✅ | High | Low |
| HTTP Layer (Retry/Timeout) | ✅ | High | Low |
| Data Access Layer | ✅ | High | Low |
| Webhook Integration | ✅ | High | Low |
| Content Sync | ✅ | High | Medium* |
| Page Implementations | ✅ | High | Low |
| Environment Validation | ✅ | High | Low |
| Caching Strategy | ✅ | High | Low |
| Security | ✅ | Medium | Low |

**Medium Risk* = Content index must be populated manually or via backfill**

---

## Conclusion

The News on Africa app correctly implements a robust, multi-layered WordPress integration with:
- ✅ Proper API clients (REST + GraphQL)
- ✅ Resilient HTTP layer (retry + timeout)
- ✅ Typed data access layer
- ✅ Secure webhook handling
- ✅ Content synchronization to Supabase
- ✅ Comprehensive caching strategy
- ✅ Cross-country edition support
- ✅ Graceful error handling

**No critical issues found.** The app will successfully pull and serve WordPress data when properly configured with environment variables and a WordPress webhook plugin.
