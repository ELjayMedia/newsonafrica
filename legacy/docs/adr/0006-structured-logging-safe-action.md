# 0006. All server actions go through `safeAction` with structured logging

- Status: Accepted
- Date: 2026-04-16

## Context

Before this decision, server actions (`"use server"`) and one-off async
helpers caught errors with patterns like `.catch(() => [])` or
`console.error`, then swallowed or string-logged them. In production this
meant:

- Failed comments, bookmarks, and sitemap builds produced empty or stale
  responses with no trace of why.
- `Error` instances were not serializable by default — `JSON.stringify`
  dropped `name`, `message`, and `stack`, so even the logs that did
  survive were `"{}"`.
- Every caller reinvented error handling, with subtle differences.

## Decision

- Every server action / async boundary uses the `safeAction` or
  `safeActionWithFallback` wrapper from `lib/safe-action.ts`.
  - `safeAction(options, fn)` logs and rethrows.
  - `safeActionWithFallback(options, fn, fallback)` logs and returns
    `fallback`, replacing bare `.catch(() => ...)`.
- Structured logging goes through `lib/log.ts` (`info`, `warn`,
  `error`) which emits one JSON line per entry and recursively
  serializes `Error` instances (name, message, stack, optional `code`).
- Route-scoped context (request id, user id, trace id) goes through
  `lib/observability/logger.ts` which wraps the same emit path.
- Raw `console.error` in production code paths is a red flag in review.
  Tests and scripts may still use `console` freely.

## Consequences

- **Wins:** Silent catches are gone; production logs carry stack traces;
  one wrapper to swap in a Sentry/DataDog transport later.
- **Costs:** A thin layer to maintain. Tests that relied on a specific
  `console.error` call had to be updated to assert on the structured
  output.
- External transports (Sentry, DataDog) are not yet wired. The hook
  exists in `lib/observability/logger.ts#forwardToExternalServices`;
  adding `SENTRY_DSN` should be a one-file change.

## Alternatives considered

- **Wire Sentry directly in every handler:** Couples product code to a
  vendor SDK. The wrapper gives us one seam to swap vendors. Rejected.
- **Keep `console.error` + parse logs centrally:** Loses structure; hard
  to query by `requestId`. Rejected.
- **Throw-always (no fallback variant):** Would force every caller to
  decide how to recover, causing either more try/catch noise or user-
  visible 500s where a cached list was fine. Rejected.
