# GraphQL Query Map

This map documents the GraphQL operations that back each major UI surface and the freshness target currently wired in code.

## `home_feed`

| Item | Details |
| --- | --- |
| Query operation name | `FrontPageSlices` (primary), plus `CategoryPostsBatch` for category rails and `FpTaggedPosts` / `LatestPosts` as fallback aggregation inputs. |
| Required variables and types | `FrontPageSlices`: `heroFirst: Int!`, `heroTagSlugs: [String!]`, `latestFirst: Int!`.<br/>`CategoryPostsBatch`: `slugs: [String!]!`, `first: Int!`.<br/>`FpTaggedPosts`: `tagSlugs: [String!]!`, `first: Int!`.<br/>`LatestPosts`: `first: Int!`, `after: String`. |
| Expected return shape (UI fields only) | `hero.nodes[]` and `latest.edges[].node` mapped to `HomePost`: `id`, `title`, `slug`, `excerpt`, `date`, `featuredImage.node.sourceUrl`, `featuredImage.node.altText`.<br/>Category rails: `categories.nodes[].{name,slug}` + each category `posts.nodes[]` mapped to the same summary fields. |
| Owning route/component path | Routes: `app/(public)/(home)/page.tsx`, `app/(public)/[countryCode]/page.tsx`.<br/>Server data composer: `app/(public)/(home)/home-data.ts`.<br/>UI: `components/client/HomeContentClient.tsx`. |
| Data freshness target | **ISR 300s** at route level (`revalidate = 300`) + cached home-data fetcher at 300s; underlying GraphQL requests for slices/tagged/category/latest use **60s revalidate** (`CACHE_DURATIONS.SHORT`). |

## `article_detail`

| Item | Details |
| --- | --- |
| Query operation name | `PostBySlugDirect` (primary), `PostByDatabaseId` when slug has numeric stable suffix. |
| Required variables and types | `PostBySlugDirect`: `slug: ID!`, `asPreview: Boolean = false`.<br/>`PostByDatabaseId`: `id: ID!`, `asPreview: Boolean = false`. |
| Expected return shape (UI fields only) | `post`: `databaseId`, `id`, `slug`, `title`, `excerpt`, `content`, `date`, `featuredImage.node.{sourceUrl,altText}`, `categories.nodes[].name`, `author.node.{name,slug,avatar.url}`. |
| Owning route/component path | Route: `app/(public)/[countryCode]/article/[slug]/page.tsx`.<br/>Resolver: `app/(public)/[countryCode]/article/[slug]/resolve-article.ts` and `lib/wordpress/article-data.ts`.<br/>UI: `components/article/ArticleHeader.tsx`, `components/article/ArticleBody.tsx`. |
| Data freshness target | **ISR 300s** page output; GraphQL fetch uses tag-based cache (publish webhook invalidation path) and switches to **no cache** in preview mode (`revalidate = 0`). |

## `category_feed`

| Item | Details |
| --- | --- |
| Query operation name | `PostsByCategory` (page load), plus `CategoryPosts` for cursor-based incremental loading endpoints/components. |
| Required variables and types | `PostsByCategory`: `category: String!`, `first: Int!`, `after: String`.<br/>`CategoryPosts`: `slug: String!`, `after: String`, `first: Int!`. |
| Expected return shape (UI fields only) | `categories.nodes[0].{name,slug,description,count}` and `posts.nodes[]` post summaries for cards/list (`title`, `slug`, `excerpt`, `date`, `featuredImage`, `author`, `categories`), plus `posts.pageInfo.{hasNextPage,endCursor}`. |
| Owning route/component path | Route: `app/(public)/[countryCode]/category/[slug]/page.tsx`.<br/>Data layer: `lib/data/category.ts`, `lib/wordpress/categories.ts`.<br/>UI: `components/category/CategoryHeader.tsx`, `components/posts/PostList.tsx`, `components/category/LoadMoreClient.tsx`. |
| Data freshness target | **ISR 300s** at page level; GraphQL category queries run with **60s revalidate**. |

## `tag_feed`

| Item | Details |
| --- | --- |
| Query operation name | `TagBySlug` (tag metadata) + `TaggedPosts` (initial list and pagination). |
| Required variables and types | `TagBySlug`: `slug: ID!`.<br/>`TaggedPosts`: `tagSlugs: [String!]!`, `first: Int!`, `after: String`. |
| Expected return shape (UI fields only) | `tag.{name,description,slug,count}` and `posts.nodes[]` with post summary fields used by `PostList` (`title`, `slug`, `excerpt`, `date`, `featuredImage`, `author`, `categories`), with `posts.pageInfo.{hasNextPage,endCursor}`. |
| Owning route/component path | Route: `app/(public)/tag/[slug]/page.tsx`.<br/>Client paginator: `app/(public)/tag/[slug]/TagFeedClient.tsx`.<br/>Server action: `app/(public)/tag/[slug]/actions.ts`. |
| Data freshness target | **ISR 300s** route shell; metadata/feed GraphQL requests use **60s revalidate**. |

## `search_results`

| Item | Details |
| --- | --- |
| Query operation name | **Primary runtime:** no GraphQL (Supabase `search_content` RPC via `/api/search`).<br/>**GraphQL fallback utility:** `Posts` (search term query in `lib/wordpress-search.ts`). |
| Required variables and types | GraphQL fallback `Posts`: `first: Int!`, `after: String`, `search: String`, `offset: Int`, `orderField: PostObjectsConnectionOrderbyEnum`, `orderDirection: OrderEnum`, optional filters (`category`, `tagSlugs`, `authorIds`, etc.). |
| Expected return shape (UI fields only) | For fallback GraphQL: `posts.nodes[]` summary fields used in search cards (`title`, `slug`, `excerpt`, `date`, `featuredImage`, `categories`, `author`), and `posts.pageInfo.{hasNextPage,offsetPagination.total}`. |
| Owning route/component path | Route shell: `app/(public)/search/page.tsx`.<br/>Client fetch path: `components/SearchContent.tsx` -> `/api/search` (`app/api/search/route.ts`).<br/>GraphQL fallback helper: `lib/wordpress-search.ts`. |
| Data freshness target | Search API is **SSR dynamic / no-store** (`dynamic = "force-dynamic"`, API `revalidate = 0`, cache-control no-store). GraphQL fallback also uses **no cache** (`CACHE_DURATIONS.NONE`). |

## `related_articles`

| Item | Details |
| --- | --- |
| Query operation name | `RelatedPosts` (category-based), with tag-first path using `RelatedPostsByTags` when article tags are available. |
| Required variables and types | `RelatedPosts`: `catIds: [ID!]`, `exclude: ID!`, `first: Int!`.<br/>`RelatedPostsByTags`: `tagSlugs: [String!]!`, `exclude: ID!`, `first: Int!`. |
| Expected return shape (UI fields only) | `posts.nodes[]` summary fields used by related/most-read cards: `databaseId`, `slug`, `title`, `excerpt`, `date`, `featuredImage.node.{sourceUrl,altText}`, `categories.nodes[].{name,slug}`. |
| Owning route/component path | Route usage: `app/(public)/[countryCode]/article/[slug]/page.tsx` via `app/(public)/[countryCode]/article/[slug]/RelatedRail.tsx`.<br/>Data fetch: `lib/wordpress/posts.ts` (`getRelatedPostsForCountry`). |
| Data freshness target | **ISR 300s** on article page; related-post GraphQL fetches are **60s revalidate**. |

## `author_profile`

| Item | Details |
| --- | --- |
| Query operation name | `AuthorData` (author + authored posts), optionally `Authors` for author directory contexts. |
| Required variables and types | `AuthorData`: `slug: String!`, `after: String`, `first: Int!`. |
| Expected return shape (UI fields only) | `user.{name,slug,description,avatar.url}` and `user.posts.nodes[]` summary fields (`title`, `slug`, `excerpt`, `date`, `featuredImage`, `categories`) with `user.posts.pageInfo.{hasNextPage,endCursor}`. |
| Owning route/component path | Route: `app/(public)/author/[slug]/page.tsx`.<br/>Data layer: `lib/wordpress/authors.ts` (`getAuthorBySlug`, `fetchAuthorData`).<br/>UI: `app/(public)/author/[slug]/AuthorContent.tsx`. |
| Data freshness target | **ISR 3600s** page-level; author GraphQL fetch currently uses **no cache** (`CACHE_DURATIONS.NONE`) to favor freshest profile/post lists. |

## `breaking_news_banner`

| Item | Details |
| --- | --- |
| Query operation name | `FpTaggedPosts` (tag-driven feed used for top/urgent headline candidates). |
| Required variables and types | `tagSlugs: [String!]!`, `first: Int!`. |
| Expected return shape (UI fields only) | `posts.nodes[]` mapped to compact headline items: `title`, `slug`, `date`, `excerpt`, optional `featuredImage.node.{sourceUrl,altText}`. |
| Owning route/component path | Data source currently comes from home aggregation flow in `app/(public)/(home)/home-data.ts` calling `lib/wordpress/frontpage.ts` (`getFpTaggedPostsForCountry`).
If rendered in home top modules, ownership is `components/client/HomeContentClient.tsx` under `app/(public)/(home)/page.tsx` and country variant route. |
| Data freshness target | Underlying GraphQL fetch target is **60s revalidate**; rendered home shells are ISR-cached at **300s**. |
