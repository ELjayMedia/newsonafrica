# GraphQL telemetry SLOs and weekly review

This document defines the service-level objectives (SLOs) for GraphQL operations and how to operationalize the telemetry emitted by `src/lib/graphql/metrics.ts`.

See also: [GraphQL architecture](./architecture.md) for telemetry layer boundaries and cross-layer sync expectations.

## Telemetry model

The telemetry layer is operation-name keyed and captures the following metrics:

- **Latency** (`durationMs`) with p95 and average rollups.
- **Error rate** (`totalErrors / totalExecutions`) for terminal outcomes.
- **Payload size estimate** (`payloadSizeEstimateBytes`) for successful/error responses.
- **Retry counts** (`totalRetries`, `avgRetriesPerExecution`) including pre-success retries.

Recommended event dimensions:

- `operationName` (primary dashboard/alert key)
- `operationClass` (feed/detail/taxonomy/search/mutation/other)
- `status` (success/retry/error)
- `category` (network/graphql/validation/timeout)
- `statusCode` (for HTTP-backed failures)

## SLO targets by operation class

Use a rolling 7-day window and enforce minimum volume of 200 executions/class before applying a strict SLO judgment.

| Operation class | p95 latency target | Error rate target | Retry budget target | Payload size guidance |
| --- | --- | --- | --- | --- |
| `feed` | <= 800 ms | <= 1.5% | <= 0.12 retries/execution | p95 <= 350 KB |
| `detail` | <= 600 ms | <= 1.0% | <= 0.08 retries/execution | p95 <= 250 KB |
| `taxonomy` | <= 450 ms | <= 0.8% | <= 0.05 retries/execution | p95 <= 120 KB |
| `search` | <= 950 ms | <= 2.0% | <= 0.20 retries/execution | p95 <= 300 KB |
| `mutation` | <= 700 ms | <= 0.7% | <= 0.05 retries/execution | p95 <= 80 KB |
| `other` | <= 700 ms | <= 1.0% | <= 0.10 retries/execution | p95 <= 180 KB |

> If a class misses its SLO for two consecutive weekly reviews, open a reliability incident and assign an owner for remediation.

## Dashboard and alerts integration notes

If external observability tooling is available (Datadog, Grafana, New Relic, Honeycomb, etc.), ship one metric series per operation name and class.

### Suggested metric names

- `graphql.operation.latency_ms` (histogram)
- `graphql.operation.errors` (counter; `status:error`)
- `graphql.operation.executions` (counter; terminal success/error)
- `graphql.operation.retries` (counter)
- `graphql.operation.payload_estimate_bytes` (histogram)

### Required tags/labels

- `operation_name`
- `operation_class`
- `endpoint`
- `status`
- `error_category`
- `status_code`

### Alert recommendations (operation-name keyed)

1. **High error rate alert**
   - Query: `sum(errors{operation_name=X}) / sum(executions{operation_name=X})`
   - Threshold: > 2% for 15 minutes (or > class SLO + 0.5%).
2. **Latency regression alert**
   - Query: `p95(latency_ms{operation_name=X})`
   - Threshold: > class SLO for 30 minutes.
3. **Retry surge alert**
   - Query: `sum(retries{operation_name=X}) / sum(executions{operation_name=X})`
   - Threshold: > 0.25 for 15 minutes.
4. **Payload growth alert**
   - Query: `p95(payload_estimate_bytes{operation_name=X})`
   - Threshold: > 1.5x 30-day baseline.

## Weekly review checklist

Run this checklist once per week (suggested every Monday UTC):

1. Export top 10 operations by `errorRate`.
2. Export top 10 operations by `p95LatencyMs`.
3. Identify operations over SLO for latency, errors, or retries.
4. For each failing operation, classify root cause:
   - Upstream availability/network instability
   - Query complexity / oversized selection set
   - Cache miss strategy or stale revalidation settings
   - Input cardinality spikes (e.g., broad search)
5. Required optimization actions (at least one per failing operation):
   - Reduce fields or fragment breadth in the operation document.
   - Add/adjust caching (`revalidate`, CDN, persisted query usage).
   - Introduce pagination or stricter query constraints.
   - Add index/back-end resolver optimization request.
   - Tighten retry policy for non-transient failure categories.
6. Create or update tickets with:
   - impacted operation name
   - current p95/error/retry values
   - target SLO values
   - owner and due date
7. Re-check previously opened tickets and close only after two consecutive in-SLO weeks.

## Implementation note

Use `createGraphQLTelemetryRecorder()` in request call-sites to keep an in-memory snapshot for local analysis and forward each event to your external metrics pipeline when available.
