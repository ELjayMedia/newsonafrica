# Caching Strategy

## Overview

News On Africa uses a unified caching strategy with Next.js ISR, request memoization, and systematic tag-based invalidation.

## Cache Layers

1. **Next.js Data Cache** - Primary cache with ISR and PPR
2. **Request Memoization** - De-duplicates identical in-flight requests
3. **Edge Cache** - CDN caching via headers

## Usage

### Basic Caching

\`\`\`typescript
import { cachedFetch, CACHE_TIMEOUTS } from '@/lib/server/unified-cache'

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

## Failure Strategy

1. Try Next.js cache/fetch path
2. On timeout/error, return a typed temporary failure
3. Let the UI show a retry/error state

## Webhook Integration

WordPress sends webhooks to `/api/revalidate`:

\`\`\`json
POST /api/revalidate?secret=xxx
{
"type": "post",
"editionCode": "sz",
"id": "post-123"
}
