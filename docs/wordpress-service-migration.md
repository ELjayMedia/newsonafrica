# WordPress service migration

## Decision

We are standardizing on the **direct RSC/service model**.

- `lib/wordpress/*` remains the source of truth for WordPress reads.
- Next.js server components, route handlers, and server actions should import `@/lib/wordpress/service` (or narrowly scoped `@/lib/wordpress/*` modules) directly.
- `/api/wp/*` is treated as a legacy public surface and is being deprecated because there are no in-repo frontend call sites depending on it.

## Inventory of internal WordPress read call sites

### 1) Server-only app usage (in-repo consumers)

These call sites read WordPress data through `lib/wordpress/*` / `lib/wordpress/service` directly:

- App routes/pages and data loaders
  - `app/(public)/(home)/home-data.ts`
  - `app/(public)/[countryCode]/article/[slug]/article-data.ts`
  - `app/(public)/[countryCode]/article/[slug]/page.tsx`
  - `app/(public)/[countryCode]/category/[slug]/page.tsx`
  - `app/(public)/author/[slug]/page.tsx`
  - `app/(public)/tag/page.tsx`
  - `app/(public)/tag/[slug]/page.tsx`
  - `app/(public)/sitemap.html/page.tsx`
  - `app/server-sitemap.xml/route.ts`
  - `app/news-sitemap/root/route.ts`
  - `app/news-sitemap/[countryCode]/route.ts`
  - `app/sitemap.ts`
- Server actions / internal API routes
  - `app/actions/content.ts`
  - `app/(public)/tag/[slug]/actions.ts`
  - `app/api/bookmarks/hydrate/route.ts`
  - `app/api/search/wordpress-fallback.ts`
- Shared libs, hooks, and components that source WordPress data
  - `lib/wp-data.ts`
  - `lib/sidebar.ts`
  - `lib/wp.ts`
  - `lib/data/category.ts`
  - `hooks/useEnhancedRelatedPosts.ts`
  - `components/Header.tsx`

### 2) Public API usage for third parties

Externally consumable WordPress proxy endpoints:

- `app/api/wp/posts/route.ts`
- `app/api/wp/categories/route.ts`
- `app/api/wp/countries/route.ts`

In-repo search did not find any internal frontend fetches to `/api/wp/*`, so these are classified as third-party/legacy public API only.

## Deprecation plan (`/api/wp/*`)

Deprecated endpoints:

- `GET /api/wp/posts`
- `GET /api/wp/categories`
- `GET /api/wp/countries`

Deprecation behavior now:

- Responses include `Deprecation: true`.
- Responses include `Sunset: Tue, 30 Jun 2026 23:59:59 GMT`.
- Responses include a deprecation `Link` header to this document.

## Migration cutoff

- **Cutoff / sunset date:** **2026-06-30 23:59:59 GMT**.
- After cutoff, `/api/wp/*` routes can be removed if no contractual third-party consumers remain.
- New internal features must use `@/lib/wordpress/service` directly and must not introduce new `/api/wp/*` dependencies.
