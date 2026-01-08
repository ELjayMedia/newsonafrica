# Observability & Monitoring

## Overview

News On Africa uses a comprehensive observability stack for structured logging, error tracking, performance monitoring, and alerting.

## Components

### 1. Structured Logging

**Module**: `/lib/observability/logger.ts`

**Features**:
- Request ID and trace ID tracking across all logs
- User ID correlation for user-specific issues
- JSON-formatted logs for easy parsing
- Automatic error serialization with stack traces
- Context-aware logging with metadata

**Usage**:
```typescript
import { logger } from '@/lib/observability/logger'

// Set request context (done automatically in middleware)
logger.setRequestContext(requestId, userId, traceId)

// Log messages with context
logger.info('User logged in', { email: user.email })
logger.warn('Cache miss', { key: cacheKey })
logger.error('Database query failed', error, { query, params })
```

**Log Format**:
```json
{
  "timestamp": "2025-01-06T12:00:00.000Z",
  "level": "error",
  "message": "Database query failed",
  "requestId": "uuid-1234",
  "userId": "user-5678",
  "traceId": "trace-9012",
  "error": {
    "name": "QueryError",
    "message": "Connection timeout",
    "stack": "...",
    "code": "ETIMEDOUT"
  },
  "context": {
    "query": "SELECT * FROM posts",
    "params": { "limit": 10 }
  }
}
```

### 2. Performance Monitoring

**Module**: `/lib/observability/performance.ts`

**Features**:
- Function execution time tracking
- Automatic metric collection and forwarding
- Tag-based metric organization
- Success/failure tracking

**Usage**:
```typescript
import { performanceMonitor } from '@/lib/observability/performance'

// Manual timing
performanceMonitor.start('wordpress-query')
const posts = await fetchPosts()
performanceMonitor.end('wordpress-query', { endpoint: 'posts', country: 'sz' })

// Automatic timing with measure
const posts = await performanceMonitor.measure(
  'wordpress-query',
  () => fetchPosts(),
  { endpoint: 'posts', country: 'sz' }
)
```

### 3. Error Tracking

**Module**: `/lib/observability/errors.ts`

**Features**:
- Exception capture with context
- Sentry integration (when configured)
- Error grouping and deduplication
- User impact tracking

**Usage**:
```typescript
import { errorTracker } from '@/lib/observability/errors'

try {
  await riskyOperation()
} catch (error) {
  errorTracker.captureException(error as Error, {
    userId: user.id,
    path: request.url,
    tags: { feature: 'bookmarks', action: 'create' },
    extra: { postId: '123' }
  })
}

// Capture warning messages
errorTracker.captureMessage('High memory usage detected', 'warning', {
  tags: { component: 'home-feed' },
  extra: { memoryMB: 512 }
})
```

### 4. Alerting

**Module**: `/lib/observability/alerts.ts`

**Features**:
- Severity-based alerts (low/medium/high/critical)
- Throttled alerting to prevent alert storms
- Webhook integration for Slack/PagerDuty
- Tag-based alert routing

**Usage**:
```typescript
import { alertManager } from '@/lib/observability/alerts'

// Trigger immediate alert
alertManager.trigger({
  title: 'Database Connection Failed',
  message: 'Unable to connect to primary database',
  severity: 'critical',
  tags: { service: 'database', environment: 'production' }
})

// Throttled alert (only fires after threshold)
alertManager.triggerThrottled(
  'high-error-rate',
  {
    title: 'High Error Rate',
    message: 'Error rate exceeded 5%',
    severity: 'high',
    tags: { metric: 'error-rate' }
  },
  10, // trigger after 10 occurrences
  60000 // within 60 second window
)
```

### 5. Observability Middleware

**Module**: `/middleware/observability.ts`

**Features**:
- Automatic request ID generation
- Trace ID propagation
- Request/response logging
- Request duration tracking
- Observability headers injection

**Configuration**:
Middleware is automatically applied to all routes. Headers added:
- `x-request-id` - Unique request identifier
- `x-trace-id` - Distributed trace identifier

## Environment Variables

### Required
- `NODE_ENV` - Environment (development/production)

### Optional (Production)
- `SENTRY_DSN` - Sentry error tracking DSN
- `METRICS_FORWARD_URL` - Metrics aggregation endpoint
- `ALERT_WEBHOOK_URL` - Alert notification webhook

## Integrations

### Sentry (Error Tracking)

**Setup**:
1. Install `@sentry/nextjs`
2. Add `SENTRY_DSN` to environment variables
3. Errors automatically forwarded via `errorTracker`

**Features**:
- Automatic error grouping
- Release tracking
- Source map support
- Session replay
- Performance monitoring (APM)

### DataDog / New Relic (APM)

**Setup**:
1. Install respective SDK
2. Configure in `lib/observability/logger.ts`
3. Logs and metrics automatically forwarded

### Vercel Analytics

**Built-in**:
- Web Vitals collection via `/app/reportWebVitals.ts`
- Automatic performance tracking
- Real user monitoring (RUM)

## Best Practices

### 1. Always Use Structured Logging
```typescript
// ❌ Don't
console.log("User logged in:", user.email)

// ✅ Do
logger.info("User logged in", { email: user.email, userId: user.id })
```

### 2. Add Context to Errors
```typescript
// ❌ Don't
catch (error) {
  logger.error("Failed", error)
}

// ✅ Do
catch (error) {
  errorTracker.captureException(error, {
    path: request.url,
    tags: { feature: 'bookmarks' },
    extra: { userId, postId }
  })
}
```

### 3. Measure Critical Operations
```typescript
// ❌ Don't
const posts = await fetchPosts()

// ✅ Do
const posts = await performanceMonitor.measure(
  'wordpress-fetch-posts',
  () => fetchPosts(),
  { country: 'sz', category: 'news' }
)
```

### 4. Use Throttled Alerts for High-Frequency Events
```typescript
// ❌ Don't (alert storm!)
if (errorRate > 0.05) {
  alertManager.trigger({ ... })
}

// ✅ Do
if (errorRate > 0.05) {
  alertManager.triggerThrottled('high-error-rate', { ... }, 10, 60000)
}
```

## Monitoring Dashboards

### Key Metrics to Track

**Performance**:
- P50, P95, P99 response times
- WordPress GraphQL query duration
- Cache hit/miss ratios
- ISR regeneration frequency

**Errors**:
- Error rate (errors per minute)
- Error types and frequency
- User-impacting errors
- Circuit breaker state changes

**Business Metrics**:
- Active users
- Page views per session
- Article engagement (reads, bookmarks, comments)
- Subscription conversions

## Alerts Configuration

### Critical Alerts
- Database connection failures
- Authentication service outages
- Error rate > 5%
- Response time P95 > 5s

### High Priority Alerts
- Cache service degradation
- WordPress API errors
- Subscription payment failures

### Medium Priority Alerts
- High memory usage
- Slow queries (> 2s)
- High cache miss rate

## Troubleshooting

### Missing Request IDs in Logs
- Check middleware is applied
- Verify `logger.setRequestContext()` is called

### Metrics Not Forwarding
- Verify `METRICS_FORWARD_URL` is set
- Check network connectivity
- Review endpoint logs

### Sentry Not Receiving Errors
- Verify `SENTRY_DSN` is configured
- Check error tracker integration
- Review Sentry project settings
```

```plaintext file=".env.local"
... existing code ...

# Observability
SENTRY_DSN=
METRICS_FORWARD_URL=
ALERT_WEBHOOK_URL=
