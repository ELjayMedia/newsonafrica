# Cache invalidation tags

Canonical cache tags are built with `cacheTags` from `lib/cache/cacheTags.ts`.

## Tags

- `edition:{edition}`: country/edition-wide content (navigation, shared queries).
- `home:{edition}`: home feeds for a specific edition.
- `edition:{edition}:post:{id}`: article detail and related-post lookups keyed by post id.
- `edition:{edition}:post-slug:{slug}`: article detail lookups keyed by slug.
- `edition:{edition}:category:{slug}`: category feeds/pages.
- `edition:{edition}:tag:{slug}`: tag feeds/pages and tag-filtered post lists.
- `edition:{edition}:author:{slug}`: author pages.
- `edition:{edition}:comments:{postId}`: article comments.

## Revalidation guidance

- On post publish/update/delete: revalidate `edition`, `home`, `post`, `post-slug`, and related `category`/`tag` tags for the affected edition.
- On category updates: revalidate `category` for affected edition(s).
- On homepage composition changes: revalidate `home:{edition}` and, if needed, `home:all` aggregate.
