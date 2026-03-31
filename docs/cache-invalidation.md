# Cache invalidation tags

`lib/cache/cacheTags.ts` is the canonical source for cache tag naming and normalization rules. This document defines the **tag format and vocabulary** used across the app. See `docs/graphql/cache-strategy.md` for **per-surface TTL, rendering mode, and ownership**.

## Canonical format

- Edition-scoped tags: `edition:{edition}:{scope}` (or `edition:{edition}:{scope}:{id}` for entity tags).
- Home tags: `home:{edition}`.
- Bookmark user/collection tags are global (not edition-scoped): `bm:user:{userId}`, `bm:collection:{collectionId}`.
- Inputs are normalized by `cacheTags`:
  - `edition` is trimmed + lowercased, with fallback to African edition code when absent.
  - Identifiers are trimmed + lowercased strings, finite numbers converted to strings, and fallback to `unknown` when empty.

## Tag vocabulary (current)

- `edition:{edition}`: shared edition-level content.
- `home:{edition}`: home feeds for a specific edition.
- `home:all`: aggregate/all-editions home feed (intentionally supported via `cacheTags.home("all")`).
- `edition:{edition}:posts`: edition post-list surfaces.
- `edition:{edition}:post:{id}`: article detail keyed by post id.
- `edition:{edition}:post-slug:{slug}`: article detail keyed by slug.
- `edition:{edition}:categories`: category list surfaces.
- `edition:{edition}:category:{slug}`: category feed/page.
- `edition:{edition}:author:{slug}`: author feed/profile surfaces.
- `edition:{edition}:tags`: tag list surfaces.
- `edition:{edition}:tag:{slug}`: tag feed/page and tag-filtered lists.
- `edition:{edition}:comments:{postId}`: comments for a post.
- `edition:{edition}:bookmarks`: edition bookmark surfaces.
- `bm:user:{userId}`: user-specific bookmark state.
- `bm:collection:{collectionId}`: bookmark collection-specific state.

## Revalidation guidance

- On post publish/update/delete: revalidate `edition`, `home`, `post`, `post-slug`, and related `category`/`tag` tags for affected edition(s); include `home:all` when aggregate home content is impacted.
- On category updates: revalidate relevant `categories` and `category` tags for affected edition(s).
- On tag updates: revalidate relevant `tags` and `tag` tags for affected edition(s).
- On bookmark mutations: revalidate `edition:{edition}:bookmarks`, plus `bm:user:{userId}` and any affected `bm:collection:{collectionId}` tags.
