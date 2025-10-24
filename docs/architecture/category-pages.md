# Category & Listing Page Architecture

## Server data pipeline
- **Entry point:** `app/[countryCode]/category/[slug]/page.tsx` is a server component configured for ISR (`revalidate = 300`) and Node runtime; it only pre-generates params for category slugs surfaced in `siteConfig.categories`, leaving the rest to ISR. 【F:app/[countryCode]/category/[slug]/page.tsx†L19-L116】【F:config/site.ts†L27-L43】
- **WordPress config:** `siteConfig.wordpress` exposes the computed GraphQL endpoint, replacing older REST fallbacks and credential requirements. 【F:config/site.ts†L46-L48】
- **Metadata caching:** `generateMetadata` memoizes the computed `Metadata` in `enhancedCache` so repeated requests avoid duplicate fetches until the TTL expires. 【F:app/[countryCode]/category/[slug]/page.tsx†L52-L190】
- **Page data fetch:** `CountryCategoryPage` defers to `getCategoryPageData`, which wraps `getPostsByCategoryForCountry` and maps results into UI-friendly shapes (category summary, posts, related chips, pagination cursor). 【F:app/[countryCode]/category/[slug]/page.tsx†L197-L241】【F:lib/data/category.ts†L1-L83】
- **WordPress access helpers:** `getPostsByCategoryForCountry` issues a batched GraphQL query that tags requests for revalidation and returns category metadata alongside post slices in a single round trip. 【F:lib/wp-server/categories.ts†L58-L177】
- **Underlying fetches:** GraphQL calls go through `fetchWordPressGraphQL`, which wraps `fetchWithRetry` and attaches cache tags for ISR-friendly revalidation hints. 【F:lib/wordpress/client.ts†L34-L70】

## UI composition & client boundaries
- **Server frame:** The page renders a container with `CategoryHeader`, an empty/error state, and wiring for pagination. 【F:app/[countryCode]/category/[slug]/page.tsx†L209-L239】
- **Server leafs:** `CategoryHeader`, `EmptyState`, and `ErrorState` are server components that format metadata and fallback messaging. 【F:components/category/CategoryHeader.tsx†L1-L35】【F:components/category/EmptyState.tsx†L1-L11】
- **Client leaves:** `PostList` and `LoadMoreClient` are client components. `PostList` handles rendering interactive post tiles, while `LoadMoreClient` issues client-side fetches against the category API route to append more posts. 【F:components/posts/PostList.tsx†L1-L29】【F:components/category/LoadMoreClient.tsx†L1-L78】
- **Load more API:** `/api/category/[countryCode]/[slug]/posts` reuses `getPostsByCategoryForCountry` plus the shared post-list mapper so client pagination stays aligned with the server-rendered first page. 【F:app/api/category/[countryCode]/[slug]/posts/route.ts†L1-L23】

## Operational characteristics
- **Retries & timeouts:** `fetchWithRetry` handles transient network failures and honours the shared timeout configuration for WordPress requests. 【F:lib/wordpress/client.ts†L34-L70】【F:lib/utils/fetchWithRetry.ts†L1-L103】
- **Request deduping:** WordPress helpers attach cache tags and revalidate hints so identical `fetchWordPressGraphQL` calls can reuse cached payloads across ISR requests. 【F:lib/wordpress/client.ts†L42-L55】【F:lib/wp-server/categories.ts†L36-L177】
- **Tag/author reuse:** Tag and author listing pages reuse the same primitives—`fetchTaggedPosts`/`getAuthorBySlug` feed into `mapWordPressPostsToPostListItems`, and the UI renders through `PostList` with client pagination handled by dedicated components.【F:app/tag/[slug]/page.tsx†L1-L42】【F:app/tag/[slug]/TagFeedClient.tsx†L1-L117】【F:app/author/[slug]/page.tsx†L1-L116】

## Client-leaf expectations
- **No suspense boundaries:** The server component mounts client leaves directly, so any loading UX after hydration is handled in the client component (e.g., `LoadMoreClient` button states). 【F:components/category/LoadMoreClient.tsx†L58-L78】
- **Cache invalidation:** Client paginated requests use `cache: "no-store"` so they bypass Next caching and rely on the API route to serve fresh slices per cursor. 【F:components/category/LoadMoreClient.tsx†L49-L64】
