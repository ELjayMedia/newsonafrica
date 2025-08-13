# WordPress Data Layer

This project uses both the WordPress REST API v2 and the WordPress GraphQL
endpoint. Each request is scoped by country so pages can render content from
the correct site. The base domain is configured via `WP_BASE_URL`.

## REST vs GraphQL

* **REST v2** is used for fast list queries. `_embed=true` is applied so
  featured images and authors are included in a single round trip. Use
  `WPR.list`, `WPR.latest` or `WPR.related` when rendering lists.
* **GraphQL** is used for rich article detail or when complex filters are
  required. Use `GQL.article` for full posts and `GQL.list` for paginated
  queries.

## Country resolution

A request can include the country in the first path segment or via the
`x-noa-country` header. `normalizeCountry` normalizes these values and defaults
to `sz` (Eswatini) when an unknown value is provided.

## Category memoization

`WPR.list` accepts a `categorySlug` which is translated to a numeric category ID.
The slug→ID mapping is memoized in process memory and tagged with
`tag.categories(country)`. When the CMS sends a webhook, invalidate this tag to
refresh the mapping.

## Revalidation tags

* `tag.list(country, category?)` – used for country or category lists.
* `tag.article(slug)` – used for individual article pages.
* `tag.search(q, country?)` – used for search results.
* `tag.categories(country)` – memoized category lookups.

The `jfetch`/`jpost` helpers attach these tags so pages can be revalidated when
content changes.
