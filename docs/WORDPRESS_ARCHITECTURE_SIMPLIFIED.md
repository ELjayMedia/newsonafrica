# Simplified WordPress Architecture: WPGraphQL Only

## Overview

The News On Africa platform now uses **WPGraphQL as the single, authoritative content source**. There is no active REST API fallback path. This eliminates complexity, error handling duplication, and maintenance burden.

## Design Principles

1. **One Source of Truth**: WPGraphQL is the primary and only production content source
2. **Graceful Failure**: When WPGraphQL fails, return a structured failure and let the UI handle stale/empty states
3. **No Mid-Flight Switching**: Never switch between GraphQL and another backend during a request

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
- **`fetchWordPressGraphQL()`**: Primary GraphQL fetcher returning typed success/failure results
- **`WordPressErrorBoundary`**: Client-side error boundary for graceful failures

## Configuration

### Environment Variables

Only GraphQL endpoint and cache-related settings are required for this architecture.

```bash
# Example GraphQL endpoint override
NEXT_PUBLIC_WP_SZ_GRAPHQL=https://cms.example.com/sz/graphql
```

No REST fallback feature flag is used.

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
2. Introduce a dedicated adapter function (for example `fetchWordPressWithSecondarySource()`) as a secondary attempt
3. Add integration tests for fallback paths
4. Update monitoring to track fallback usage
5. Document in this file when/why fallback was enabled
