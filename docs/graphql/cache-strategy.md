# GraphQL Cache Strategy Map

This document defines the single cache strategy entry for every GraphQL query surface listed in `docs/graphql/query-map.md`, including App Router cache tags and webhook-driven invalidation behavior.

Canonical tag formats and event-level invalidation requirements live in `docs/cache-invalidation.md`:

- [Canonical tag schema](../cache-invalidation.md#canonical-tag-schema)
- [Canonical invalidation triggers/events](../cache-invalidation.md#canonical-invalidation-triggersevents)

## Namespace alignment requirement

Cache strategy rows are keyed by query-map surfaces, which must remain aligned with both GraphQL namespaces:

- Source operation docs/files in `src/lib/graphql/operations/**` (for example `Posts_BySlug`)
- Runtime/query constants in `lib/wordpress/queries.ts` (for example `PostBySlug` / `POST_BY_SLUG_QUERY`)

If either namespace changes for a surface, update `docs/graphql/query-map.md` mapping and this strategy map in the **same PR**.

## Strategy entries

| Strategy ID | Query-map surface | Operations covered | Rendering mode | Revalidation interval | App Router cache ownership (canonical tags) |
| --- | --- | --- | --- | --- | --- |
| `cs_home_feed` | `home_feed` | `FrontPageSlices`, `LatestPosts`, `FpTaggedPosts` | ISR | `300s` | home + edition domain tags (add aggregate `home:all` only when needed) |
| `cs_article_detail` | `article_detail` | `PostBySlug` | ISR | `300s` + on-demand | post identity tags + related taxonomy/author tags |
| `cs_category_feed` | `category_feed` | `PostsByCategory`, `CategoryPosts` | ISR | `300s` + on-demand | category feed tag + edition tag (+ categories list tag when category index is rendered) |
| `cs_tag_feed` | `tag_feed` | `TaggedPosts`, `TagBySlug` | ISR | `300s` + on-demand | tag feed tag + edition tag (+ tags list tag when tag index is rendered) |
| `cs_search_results` | `search_results` | `Posts` (`POSTS_QUERY` search flow) | SSR | `0s` (`no-store`) | No long-lived tags (`no-store`) |
| `cs_related_articles` | `related_articles` | `RelatedPostsWithCategories`, `RelatedPosts`, `RelatedPostsByTags` | SSR (cached fetch) | `60s` | post identity + taxonomy tags for the current context |
| `cs_author_profile` | `author_profile` | `AuthorData` | ISR | `3600s` + on-demand | author tag + edition tag |
| `cs_breaking_news_banner` | `breaking_news_banner` | `FeaturedPosts` | ISR | `60s` | featured-tag feed tag + edition tag |

## Tag reference policy (no redefinition here)

- Do not redefine tag formats or duplicate the full tag list in this file.
- When adding/updating strategy rows, reference canonical tag names from `docs/cache-invalidation.md`.
- Keep entries here focused on surface-level decisions: rendering mode, TTL, and which canonical tag families each surface owns.

## Legacy/alias tags

- No legacy string aliases are intentionally revalidated in the current webhook/tagging flow.
- Older examples such as `post:{slug}`, `country:{countryCode}`, and `frontpage` should be treated as historical and replaced with `cacheTags` outputs.

## Webhook-triggered invalidation flow (WordPress → Next.js)

### 1) WordPress event emits webhook

On `publish_post`, `post_updated`, `future_to_publish`, taxonomy assignment changes, and unpublish/delete events, WordPress sends a signed webhook payload to Next.js with:

- Event type (`published`, `updated`, `deleted`)
- Post identifiers (`databaseId`, `slug`, `uri`)
- Taxonomy slugs (`categories[]`, `tags[]`)
- Author slug
- Edition/site scope

### 2) Next.js verifies webhook and resolves impacted tags

`app/api/revalidate/route.ts` (or equivalent handler) should:

1. Verify HMAC signature and timestamp replay window.
2. Parse payload.
3. Build a deterministic set of **canonical tags** based on event type using `docs/cache-invalidation.md#canonical-invalidation-triggersevents`.

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
