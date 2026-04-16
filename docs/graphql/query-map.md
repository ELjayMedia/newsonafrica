# GraphQL Query Map

This map ties each UI surface to its primary GraphQL operation, variable contract, UI-consumed response fields, owning Next.js entrypoint, and freshness target.

See also: [GraphQL architecture](./architecture.md) for layer boundaries and required sync steps when operation shapes change.

## Namespace mapping (source operation ↔ runtime constant)

Use both naming namespaces explicitly:

- **Source operation files:** `lib/graphql/operations/**` (for example `Posts_BySlug`)
- **Runtime/query constants:** `lib/wordpress/queries.ts` (for example `PostBySlug` via `POST_BY_SLUG_QUERY`)

| Query-map surface | Source operation name (`lib/graphql/operations/**`) | Runtime operation name (`lib/wordpress/queries.ts`) | Runtime constant export |
| --- | --- | --- | --- |
| `home_feed` | `Posts_FrontPageSlices`, `Posts_LatestPosts`, `Posts_FpTaggedPosts` | `FrontPageSlices`, `LatestPosts`, `FpTaggedPosts` | `FRONT_PAGE_SLICES_QUERY`, `LATEST_POSTS_QUERY`, `FP_TAGGED_POSTS_QUERY` |
| `article_detail` | `Posts_BySlug` | `PostBySlug` | `POST_BY_SLUG_QUERY` |
| `category_feed` | `Taxonomy_PostsByCategory`, `Taxonomy_CategoryPosts` | `PostsByCategory`, `CategoryPosts` | `POSTS_BY_CATEGORY_QUERY`, `CATEGORY_POSTS_QUERY` |
| `tag_feed` | `Taxonomy_TaggedPosts`, `Taxonomy_TagBySlug` | `TaggedPosts`, `TagBySlug` | `TAGGED_POSTS_QUERY`, `TAG_BY_SLUG_QUERY` |
| `search_results` | `Search_Posts` | `Posts` | `POSTS_QUERY` |
| `related_articles` | `Posts_RelatedPostsWithCategories`, `Posts_RelatedPosts`, `Posts_RelatedPostsByTags` | `RelatedPostsWithCategories`, `RelatedPosts`, `RelatedPostsByTags` | `RELATED_POSTS_WITH_CATEGORIES_QUERY`, `RELATED_POSTS_QUERY`, `RELATED_POSTS_BY_TAGS_QUERY` |
| `author_profile` | `Authors_AuthorData` | `AuthorData` | `AUTHOR_DATA_QUERY` |
| `breaking_news_banner` | `Posts_FeaturedPosts` | `FeaturedPosts` | `FEATURED_POSTS_QUERY` |

### Contributor rule

When adding a new query surface or operation, **update both namespaces in the same PR**:

1. Add/update the source operation entry/documentation (`lib/graphql/operations/**` references).
2. Add/update the runtime mapping entry in this file for `lib/wordpress/queries.ts`.

## `home_feed`

| Item | Details |
| --- | --- |
| Query operation name | `FrontPageSlices` (`FRONT_PAGE_SLICES_QUERY`) |
| Required variables and types | `heroFirst: Int!`, `first: Int!`; optional `heroTagSlugs: [String!]`, `after: String` |
| Expected return shape (UI fields only) | `hero.nodes[] { databaseId, slug, date, modified, title, excerpt, uri, link, featuredImage.node{sourceUrl,altText,caption,mediaDetails{width,height}}, categories.nodes{databaseId,name,slug}, tags.nodes{databaseId,name,slug}, author.node{databaseId,name,slug,description,avatar{url}} }`; `latest.pageInfo { endCursor, hasNextPage }`; `latest.edges[] { cursor, node{...PostSummaryFields} }` |
| Owning route/component path in Next.js | Route: `app/(public)/[countryCode]/page.tsx`; data loader: `app/(public)/(home)/home-data.ts` |
| Data freshness target | **ISR 300s** (`revalidate = 300` on route; query fetch uses short-lived GraphQL cache) |
| Cache strategy entry | `cs_home_feed` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Hide hero/trending slices that fail shape checks, keep previously cached stories when available, otherwise show `NewsGridSkeleton` for latest feed until retry succeeds. |

> Notes: home aggregation also uses `LatestPosts` and `FpTaggedPosts` as fallback candidates via the same home data pipeline. Default home feed page size is **12 posts** for incremental slices.

## `article_detail`

| Item | Details |
| --- | --- |
| Query operation name | `PostBySlug` (`POST_BY_SLUG_QUERY`) |
| Required variables and types | `slug: ID!`; optional `asPreview: Boolean = false` |
| Expected return shape (UI fields only) | `post` and/or fallback `posts.nodes[0]` with `PostFields` = `PostSummaryFields` + `content`; UI reads slug/title/excerpt/content/date/modified/featuredImage/categories/tags/author |
| Owning route/component path in Next.js | Route: `app/(public)/[countryCode]/article/[slug]/page.tsx`; resolver: `app/(public)/[countryCode]/article/[slug]/article-data.ts` |
| Data freshness target | **Tagged ISR (default 300s + on-demand revalidation by post slug tag)** |
| Cache strategy entry | `cs_article_detail` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Render route-level not-found/empty article state; hide related rails and metadata blocks sourced from invalid payloads; show retry CTA via page refresh prompt. |

## `category_feed`

| Item | Details |
| --- | --- |
| Query operation name | `PostsByCategory` (`POSTS_BY_CATEGORY_QUERY`) for page feed; `CategoryPosts` (`CATEGORY_POSTS_QUERY`) for cursor pagination helper |
| Required variables and types | `PostsByCategory`: `category: String!`, `first: Int!`, optional `after: String`; `CategoryPosts`: `slug: String!`, `first: Int!`, optional `after: String` |
| Expected return shape (UI fields only) | `categories.nodes[0] { databaseId,name,slug,description,count }`; `posts.pageInfo { endCursor, hasNextPage }`; `posts.nodes[] { ...PostSummaryFields }` |
| Owning route/component path in Next.js | Route: `app/(public)/[countryCode]/category/[slug]/page.tsx`; data layer: `lib/data/category.ts` and `lib/wordpress/service/categories.ts` |
| Data freshness target | **ISR 300s page + data calls configured as no-store/SSR-style (`revalidate: 0`)** |
| Cache strategy entry | `cs_category_feed` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Keep category header if taxonomy node is valid; hide malformed cards; otherwise show category skeleton and “Try again” CTA for pagination fetches. |

> Notes: default category feed page size is **15 posts** per page.

## `tag_feed`

| Item | Details |
| --- | --- |
| Query operation name | `TaggedPosts` (`TAGGED_POSTS_QUERY`) + tag metadata query `TagBySlug` (`TAG_BY_SLUG_QUERY`) |
| Required variables and types | `TaggedPosts`: `tagSlugs: [String!]!`, `first: Int!`, optional `after: String`; `TagBySlug`: `slug: ID!` |
| Expected return shape (UI fields only) | `posts.pageInfo { endCursor, hasNextPage }`; `posts.nodes[] { ...PostSummaryFields }`; `tag { databaseId,id,name,slug,count }` |
| Owning route/component path in Next.js | Route: `app/(public)/tag/[slug]/page.tsx`; client pagination action: `app/(public)/tag/[slug]/actions.ts` |
| Data freshness target | **ISR 300s route + query cache ~short TTL (60s)** |
| Cache strategy entry | `cs_tag_feed` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Hide invalid tag meta chip/count; keep validated posts list only; if list validation fails, show `TagPageSkeleton` and retry CTA in pagination control area. |

## `search_results`

| Item | Details |
| --- | --- |
| Query operation name | `Posts` (`POSTS_QUERY`) with `search` + offset pagination |
| Required variables and types | Required: `first: Int!`; optional but used by search flow: `offset: Int`, `search: String`, `orderField: PostObjectsConnectionOrderbyEnum`, `orderDirection: OrderEnum` |
| Expected return shape (UI fields only) | `posts.pageInfo { hasNextPage, offsetPagination { total } }`; `posts.nodes[] { ...PostSummaryFields }` |
| Owning route/component path in Next.js | Route: `app/(public)/search/page.tsx` → API: `app/api/search/route.ts` → GraphQL adapter: `lib/wordpress-search.ts` |
| Data freshness target | **SSR / client-driven fetch with no cache (`revalidate: 0`)** |
| Cache strategy entry | `cs_search_results` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Return empty result set to client with recoverable error metadata, render search empty/error panel with explicit retry action instead of broken cards. |

## `related_articles`

| Item | Details |
| --- | --- |
| Query operation name | Primary: `RelatedPostsWithCategories` (`RELATED_POSTS_WITH_CATEGORIES_QUERY`); fallback: `RelatedPosts` (`RELATED_POSTS_QUERY`) and `RelatedPostsByTags` (`RELATED_POSTS_BY_TAGS_QUERY`) |
| Required variables and types | `RelatedPostsWithCategories`: `id: ID!`, `exclude: ID!`, `first: Int!`; `RelatedPosts`: `catIds: [ID!]`, `exclude: ID!`, `first: Int!`; `RelatedPostsByTags`: `tagSlugs: [String!]!`, `exclude: ID!`, `first: Int!` |
| Expected return shape (UI fields only) | Related nodes use `...PostSummaryFields`; primary query reads `post.categories.nodes[].posts.nodes[]`; fallback reads `posts.nodes[]` |
| Owning route/component path in Next.js | Server component rail: `app/(public)/[countryCode]/article/[slug]/RelatedRail.tsx`; article page placements: `app/(public)/[countryCode]/article/[slug]/page.tsx` |
| Data freshness target | **Server fetch, short revalidation (~60s) with article/category cache tags** |
| Cache strategy entry | `cs_related_articles` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Hide related rail block entirely when primary + fallback operations fail validation; never block article rendering; optional retry CTA appears only in debug/admin surfaces. |

## `author_profile`

| Item | Details |
| --- | --- |
| Query operation name | `AuthorData` (`AUTHOR_DATA_QUERY`) |
| Required variables and types | `slug: String!`, `first: Int!`; optional `after: String` |
| Expected return shape (UI fields only) | `user { id,databaseId,name,slug,description,avatar{url}, posts{ pageInfo{endCursor,hasNextPage}, nodes[]{ ...PostSummaryFields } } }` |
| Owning route/component path in Next.js | Route: `app/(public)/author/[slug]/page.tsx`; renderer: `app/(public)/author/[slug]/AuthorContent.tsx` |
| Data freshness target | **ISR 3600s page; underlying author query currently no-store (`revalidate: 0`)** |
| Cache strategy entry | `cs_author_profile` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Show author page skeleton for first paint failures; if only posts connection fails, keep author bio/header and hide post grid with retry CTA below header. |

## `breaking_news_banner`

| Item | Details |
| --- | --- |
| Query operation name | `FeaturedPosts` (`FEATURED_POSTS_QUERY`) is the closest existing operation for banner-style headline strips (tag-driven) |
| Required variables and types | `tag: String!`, `first: Int!` |
| Expected return shape (UI fields only) | `posts.nodes[] { ...PostSummaryFields }` (typically title, slug/uri, date, featured image for compact banner cards) |
| Owning route/component path in Next.js | **Not currently wired to a dedicated banner component**; query helper exists in `lib/wordpress/posts.ts` (`getFeaturedPosts`) |
| Data freshness target | **Short ISR-style query cache (~60s) once connected to UI** |
| Cache strategy entry | `cs_breaking_news_banner` in `docs/graphql/cache-strategy.md` |
| Fallback UI behavior on validation failure | Hide banner strip completely and fall back to normal headline modules; no blocking UI; retry is deferred to next background refresh cycle. |
