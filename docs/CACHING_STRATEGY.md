# Caching Strategy

## Overview

News On Africa uses a unified caching strategy with Next.js ISR, Vercel KV fallbacks, and systematic tag-based invalidation.

## Cache Layers

1. **Next.js Data Cache** - Primary cache with ISR and PPR
2. **Vercel KV** - Stale fallback when primary fails
3. **Edge Cache** - CDN caching via headers

## Usage

### Basic Caching

\`\`\`typescript
import { cachedFetch, CACHE_TIMEOUTS } from '@/lib/cache/unified-cache'

const data = await cachedFetch(
  'my-key',
  async () => fetchData(),
  {
    tags: ['my-tag'],
    revalidate: CACHE_TIMEOUTS.MEDIUM,
    timeout: 10000,
    fallback: defaultData,
  }
)
\`\`\`

### WordPress Content

\`\`\`typescript
import { fetchPostWithCache } from '@/lib/wordpress/cached-client'

const post = await fetchPostWithCache(
  'sz',
  POST_QUERY,
  { slug: 'my-article' },
  { revalidate: CACHE_TIMEOUTS.LONG }
)
\`\`\`

### Invalidation

\`\`\`typescript
import { invalidatePost } from '@/lib/cache/invalidation'

await invalidatePost('sz', 'post-123')
\`\`\`

## Cache Timeouts

- **SHORT (60s)**: Real-time data, user-specific
- **MEDIUM (5m)**: Frequently updated content
- **LONG (1h)**: Stable content, articles
- **VERY_LONG (24h)**: Rarely changing data

## Tag Prefixes

- `post:*` - Individual articles
- `category:*` - Category pages
- `edition:*` - Edition home pages
- `user:*` - User-specific data
- `search:*` - Search results

## Fallback Strategy

1. Try Next.js cache
2. On timeout/error, try KV fallback
3. If fallback provided, return it
4. Otherwise, throw error

## Webhook Integration

WordPress sends webhooks to `/api/revalidate`:

\`\`\`json
POST /api/revalidate?secret=xxx
{
  "type": "post",
  "editionCode": "sz",
  "id": "post-123"
}
