# SEO & Content Model

## WordPress to Article mapping

The WordPress REST and GraphQL clients normalise post data into the `Article` type defined in `src/features/articles/schema.ts`. HTML content is sanitised with a small allow‑list in `clean.ts` and validated via `constraints.ts`.

## JSON‑LD components

`src/lib/seo/jsonld.tsx` exports helpers for `Organization`, `Website`, `BreadcrumbList` and `NewsArticle` schemas. Use these components in pages to embed structured data.

## Sitemaps

The root `app/sitemap.ts` links to country sitemaps and Google News sitemaps. Country sitemaps live at `/{country}/sitemap.xml` and cache for one hour. News sitemaps include only articles from the last 48 hours.

## hreflang

`hreflangLinks` in `src/lib/seo/meta.ts` builds alternate URLs for all country editions plus `x-default`.
