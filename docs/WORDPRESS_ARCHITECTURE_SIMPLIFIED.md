# Simplified WordPress Architecture: WPGraphQL Only

## Overview

The News On Africa platform now uses **WPGraphQL as the single, authoritative content source**. There is no REST API fallback in production. This eliminates complexity, error handling duplication, and maintenance burden.

## Design Principles

1. **One Source of Truth**: WPGraphQL is the primary and only production content source
2. **Graceful Degradation**: When WPGraphQL fails, serve stale cached content with a "retry later" message
3. **Dev-Only Fallback**: REST API fallback is feature-flagged (`WP_REST_FALLBACK=1`) for dev/emergency use only
4. **No Mid-Flight Switching**: Never switch between GraphQL and REST during a request

## Architecture

### Request Flow

\`\`\`
Client Request
    ↓
GraphQL Query (via fetchWordPressGraphQL)
    ↓
    ├─ Success → Return fresh data + cache
    │
    └─ Failure (5xx)
        ├─ KV Cache Hit → Serve stale data with "retry later" banner
        └─ No Cache → Show error boundary ("content unavailable")
\`\`\`

### Key Components

- **`lib/wordpress/client.ts`**: WPGraphQL client with memoization and ISR tag caching
- **`fetchWordPressGraphQL()`**: Primary GraphQL fetcher with error handling
- **`fetchWordPressGraphQLWithFallback()`**: Adds stale-cache serving on 5xx errors
- **`WordPressErrorBoundary`**: Client-side error boundary for graceful failures
- **`WP_REST_FALLBACK`**: Feature flag (0 = disabled in prod, 1 = enabled for dev)

## Configuration

### Environment Variables

\`\`\`bash
# Production (default - REST fallback disabled)
WP_REST_FALLBACK=0

# Development (REST fallback enabled for emergency debugging)
WP_REST_FALLBACK=1
\`\`\`

### Feature Flag Usage

The REST fallback is currently feature-flagged but NOT implemented. If needed in production:

1. Set `WP_REST_FALLBACK=1` in Vercel environment
2. Uncomment REST fallback code in `lib/wordpress/client.ts`
3. Restart deployment

## Error Handling

### GraphQL Failures

| Scenario | Behavior |
|----------|----------|
| Network timeout | Return cached data with retry banner |
| 5xx server error | Attempt KV cache, show error boundary if no cache |
| GraphQL validation error | Return error, DO NOT retry via REST |
| Invalid endpoint | Fail fast with clear error message |

### User Experience

- **Fresh Data Available**: Show content normally
- **Stale Data Available**: Show content + "We're updating..." banner
- **No Cache**: Show error boundary with "Retry" button

## Monitoring

When GraphQL fails, logs include:

\`\`\`json
{
  "level": "error",
  "message": "GraphQL request failed",
  "country": "sz",
  "endpoint": "https://...",
  "status": 500,
  "kind": "http_error"
}
\`\`\`

Alert on:
- Sustained 5xx errors from WordPress (indicates server issues)
- Spike in requests hitting error boundary (indicates cache misses)

## Migration Path (If REST Needed)

If REST fallback becomes necessary in production:

1. Create `lib/wordpress/rest-client.ts` with REST adapter
2. Implement in `fetchWordPressGraphQLWithFallback()` as secondary attempt
3. Add integration tests for fallback paths
4. Update monitoring to track fallback usage
5. Document in this file when/why fallback was enabled
