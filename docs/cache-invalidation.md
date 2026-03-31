# Cache invalidation: canonical tag schema and triggers

`lib/cache/cacheTags.ts` is the implementation source of truth. This document is the **canonical documentation** for:

1. Tag schema (format + vocabulary)
2. Invalidation triggers/events and the tags they must revalidate

`docs/graphql/cache-strategy.md` must only reference canonical tags from here for per-surface strategy choices (TTL/rendering/ownership).

## Canonical tag schema

### Format rules

- Edition-scoped tags: `edition:{edition}:{scope}` (or `edition:{edition}:{scope}:{id}` for entity tags)
- Home tags: `home:{edition}`
- Global bookmark tags (not edition-scoped): `bm:user:{userId}`, `bm:collection:{collectionId}`

### Normalization rules (`cacheTags`)

- `edition`: trim + lowercase, fallback to African edition code when absent
- identifiers/slugs/ids: trim + lowercase strings; finite numbers converted to strings; fallback to `unknown` when empty

### Canonical vocabulary

#### Edition + home domain

- `edition:{edition}` — shared edition-level content
- `home:{edition}` — edition-specific home feeds
- `home:all` — aggregate/all-editions home feed (supported via `cacheTags.home("all")`)

#### Post domain

- `edition:{edition}:posts` — edition post-list surfaces
- `edition:{edition}:post:{id}` — article detail keyed by post id
- `edition:{edition}:post-slug:{slug}` — article detail keyed by slug

#### Taxonomy domain

- `edition:{edition}:categories` — category list surfaces
- `edition:{edition}:category:{slug}` — category feed/page
- `edition:{edition}:tags` — tag list surfaces
- `edition:{edition}:tag:{slug}` — tag feed/page and tag-filtered lists

#### Author + comments domain

- `edition:{edition}:author:{slug}` — author feed/profile surfaces
- `edition:{edition}:comments:{postId}` — comments for a post

#### Bookmark domain

- `edition:{edition}:bookmarks` — edition bookmark surfaces
- `bm:user:{userId}` — user-specific bookmark state
- `bm:collection:{collectionId}` — bookmark collection-specific state

## Canonical invalidation triggers/events

These are event-to-tag requirements. Surface-specific cache ownership stays in `docs/graphql/cache-strategy.md`.

| Event / trigger | Required tag families to revalidate | Notes |
| --- | --- | --- |
| Post published/updated/deleted | `edition:{edition}`, `home:{edition}`, post identity tags (`post:{id}`, `post-slug:{slug}`), related taxonomy tags (`category:{slug}`, `tag:{slug}`), related `author:{slug}` | Add `home:all` when aggregate home is impacted. |
| Post taxonomy reassignment | impacted `category:{slug}` and/or `tag:{slug}`, plus `edition:{edition}` and `home:{edition}` | Include both removed and added taxonomy slugs when available. |
| Category metadata change | `edition:{edition}:categories` and impacted `edition:{edition}:category:{slug}` | Apply per affected edition. |
| Tag metadata change | `edition:{edition}:tags` and impacted `edition:{edition}:tag:{slug}` | Apply per affected edition. |
| Author profile/content ownership change | impacted `edition:{edition}:author:{slug}` plus related edition/home tags where surfaced | Use when author pages or bylines are cached independently. |
| Bookmark mutation | `edition:{edition}:bookmarks`, `bm:user:{userId}`, impacted `bm:collection:{collectionId}` | Bookmark tags remain global for user/collection scope. |

> Implementation note: when resolving concrete tags for an event, always emit full canonical strings defined in this document (for example `edition:ghana:post-slug:my-story`), not shorthand fragments.
