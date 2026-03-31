# GraphQL Cache Strategy Map

This document defines the single cache strategy entry for every GraphQL query surface listed in `docs/graphql/query-map.md`, including App Router cache tags and webhook-driven invalidation behavior.

See also: [GraphQL architecture](./architecture.md) for source-vs-runtime ownership and contract sync requirements.

## Namespace alignment requirement

Cache strategy rows are keyed by query-map surfaces, which must remain aligned with both GraphQL namespaces:

- Source operation docs/files in `src/lib/graphql/operations/**` (for example `Posts_BySlug`)
- Runtime/query constants in `lib/wordpress/queries.ts` (for example `PostBySlug` / `POST_BY_SLUG_QUERY`)

If either namespace changes for a surface, update `docs/graphql/query-map.md` mapping and this strategy map in the **same PR**.

## Strategy entries

| Strategy ID | Query-map surface | Operations covered | Rendering mode | Revalidation interval | App Router cache tags |
| --- | --- | --- | --- | --- | --- |
| `cs_home_feed` | `home_feed` | `FrontPageSlices`, `LatestPosts`, `FpTaggedPosts` | ISR | `300s` | `home`, `frontpage`, `country:{countryCode}`, `post:list:latest` |
| `cs_article_detail` | `article_detail` | `PostBySlug` | ISR | `300s` + on-demand | `post:{slug}`, `post:id:{databaseId}`, `category:{slug}`, `author:{slug}` |
| `cs_category_feed` | `category_feed` | `PostsByCategory`, `CategoryPosts` | ISR | `300s` + on-demand | `category:{slug}`, `post:list:category:{slug}` |
| `cs_tag_feed` | `tag_feed` | `TaggedPosts`, `TagBySlug` | ISR | `300s` + on-demand | `tag:{slug}`, `post:list:tag:{slug}` |
| `cs_search_results` | `search_results` | `Posts` (`POSTS_QUERY` search flow) | SSR | `0s` (`no-store`) | No long-lived tags (`search:{normalizedQuery}` optional request-scoped key only) |
| `cs_related_articles` | `related_articles` | `RelatedPostsWithCategories`, `RelatedPosts`, `RelatedPostsByTags` | SSR (cached fetch) | `60s` | `post:{slug}`, `post:id:{databaseId}`, `category:{slug}`, `tag:{slug}` |
| `cs_author_profile` | `author_profile` | `AuthorData` | ISR | `3600s` + on-demand | `author:{slug}`, `post:list:author:{slug}` |
| `cs_breaking_news_banner` | `breaking_news_banner` | `FeaturedPosts` | ISR | `60s` | `breaking`, `tag:{slug}`, `post:list:featured` |

## Cache tag taxonomy (App Router)

Use these tags consistently in server-side `fetch` wrappers (`next: { tags: [...] }`) and in route-level invalidation handlers.

- **Post domain**
  - `post:{slug}` (canonical per-article tag)
  - `post:id:{databaseId}` (stable ID fallback)
  - `post:list:latest`
  - `post:list:category:{slug}`
  - `post:list:tag:{slug}`
  - `post:list:author:{slug}`
  - `post:list:featured`
- **Taxonomy domain**
  - `category:{slug}`
  - `tag:{slug}`
- **Author domain**
  - `author:{slug}`
- **Home/frontpage domain**
  - `home`
  - `frontpage`
  - `country:{countryCode}`
- **Breaking domain**
  - `breaking`

## Webhook-triggered invalidation flow (WordPress → Next.js)

### 1) WordPress event emits webhook

On `publish_post`, `post_updated`, `future_to_publish`, taxonomy assignment changes, and unpublish/delete events, WordPress sends a signed webhook payload to Next.js with:

- Event type (`published`, `updated`, `deleted`)
- Post identifiers (`databaseId`, `slug`, `uri`)
- Taxonomy slugs (`categories[]`, `tags[]`)
- Author slug
- Country/site scope (if multi-country content segmentation is enabled)

### 2) Next.js verifies webhook and resolves impacted tags

`app/api/revalidate/route.ts` (or equivalent handler) should:

1. Verify HMAC signature and timestamp replay window.
2. Parse payload.
3. Build a deterministic tag set, for example:
   - `post:{slug}`
   - `post:id:{databaseId}`
   - `category:{categorySlug}` for each category
   - `tag:{tagSlug}` for each tag
   - `author:{authorSlug}`
   - `home`, `frontpage`, `country:{countryCode}`, `breaking` where relevant

### 3) Next.js triggers invalidation

Invoke:

- `revalidateTag(tag)` for every resolved tag.
- `revalidatePath(path)` only for route-level edge cases where tag ownership is incomplete (for example specialized static paths).

### 4) Subsequent requests repopulate caches

After invalidation:

- ISR routes regenerate on next request.
- Short-lived SSR cached fetches refresh when their TTL expires or when tags were revalidated.
- `no-store` surfaces (search) are always fresh and are unaffected by tag invalidation.

## Operational guardrails

- Every query-map surface must reference exactly one `Strategy ID` from this file.
- If a new query surface is added to `query-map.md`, add one new strategy row first, then link it from the query map.
- If a new query is added, update both the source operation documentation (`src/lib/graphql/operations/**`) and the runtime mapping entry (`lib/wordpress/queries.ts`) in the same PR.
- Revalidation intervals are upper bounds; webhook-triggered tag invalidation always takes precedence over passive TTL expiry.
