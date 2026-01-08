# ISR and PPR Strategy

## Overview

News On Africa uses Next.js Incremental Static Regeneration (ISR) with Partial Prerendering (PPR) for optimal performance and freshness.

## PPR (Partial Prerendering)

PPR is enabled app-wide via `experimental.ppr = true` in next.config.js. This allows:

- **Instant static shell delivery** - Layout, navigation, and static content served immediately
- **Streaming dynamic content** - User-specific data (bookmarks, comments) loads separately
- **Suspense boundaries** - Fine-grained loading states for dynamic sections

### PPR-Enabled Pages

- **Articles** (`/[countryCode]/article/[slug]`)
  - Static: Article content, metadata, related posts
  - Dynamic: Comments, bookmark status, user reactions

- **Home Pages** (`/` and `/[countryCode]`)
  - Static: Featured posts, category grids
  - Dynamic: Personalized recommendations, bookmark indicators

- **Category Pages** (`/[countryCode]/category/[slug]`)
  - Static: Category header, initial post list
  - Dynamic: Load more pagination, user bookmarks

## ISR Configuration

### Revalidation Times

Defined in `/lib/cache/isr-config.ts`:

| Content Type | Revalidate | Rationale |
|-------------|-----------|-----------|
| Articles | 5 min | Balance freshness vs regeneration cost |
| Home Pages | 5 min | High traffic, frequent updates |
| Categories | 10 min | Moderate traffic, less frequent updates |
| Authors | 1 hour | Lower traffic, infrequent changes |
| Tags | 30 min | Medium traffic, occasional updates |
| OG Images | 24 hours | Rarely change after generation |

### Static Generation Strategy

#### Build-Time Generation (`generateStaticParams`)

- **Top 50 articles per edition** - Pre-generate most popular content
- **All category pages** - Usually < 20 per edition
- **Top 20 author pages** - Pre-generate high-traffic authors
- **Top 30 tag pages** - Pre-generate popular tags

#### On-Demand Generation

- `dynamicParams = true` on all dynamic routes
- New articles/categories generated on first request
- Cached for subsequent requests per revalidate time

## Cache Invalidation

### Tag-Based Invalidation

Systematic tags via `/lib/cache/unified-cache.ts`:

- `post:{country}:{slug}` - Individual articles
- `category:{country}:{slug}` - Category pages
- `edition:{country}` - Edition-wide content
- `user:{userId}` - User-specific data
- `search:{query}` - Search results

### Webhook-Triggered Revalidation

WordPress sends webhooks to `/api/revalidate` on content changes:

```json
POST /api/revalidate
{
  "secret": "xxx",
  "slug": "article-slug",
  "country": "sz",
  "categories": ["politics", "news"],
  "tags": ["elections", "government"]
}
```

Automatically invalidates:
- Article page cache
- Category page caches
- Edition home page cache
- Search index

### Scheduled Revalidation

Via `vercel.json` crons:

- **Daily at 5 AM** - Full cache refresh (`/api/revalidate?type=all`)
- **Daily at 6 AM** - WordPress content sync poll

## Performance Targets

- **TTFB (Time to First Byte)**: < 100ms (PPR static shell)
- **FCP (First Contentful Paint)**: < 500ms
- **LCP (Largest Contentful Paint)**: < 1.5s
- **CLS (Cumulative Layout Shift)**: < 0.1

## Monitoring

Track ISR effectiveness via:

- Vercel Analytics - ISR hit rates, cache misses
- Custom logs - Revalidation events, stale content served
- Edge logs - Cache headers, regeneration triggers

## Best Practices

1. **Use unified cache helpers** - Always use `cachedFetch` from `/lib/cache/unified-cache.ts`
2. **Tag everything** - Systematic tags enable surgical invalidation
3. **Set appropriate revalidate times** - Use `ISR_CONFIG` constants
4. **Wrap dynamic content in Suspense** - Enable PPR granularity
5. **Monitor regeneration costs** - Watch for excessive rebuilds
