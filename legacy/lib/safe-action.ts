import { error as logError } from "./log"

export interface SafeActionOptions {
  /**
   * Operation name used as the log message and metric key.
   * Should be stable (e.g. "fetchCategoryPostsAction") so logs/alerts can group on it.
   */
  name: string
  /**
   * Extra structured metadata merged into the log payload. Do NOT include secrets or PII.
   */
  meta?: Record<string, unknown>
}

function toErrorDetails(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      // Stack is useful in prod logs; drop it in tests where it adds noise.
      ...(process.env.NODE_ENV !== "test" ? { errorStack: err.stack } : {}),
    }
  }
  return { error: err }
}

/**
 * Wrap an async operation so every failure is logged as structured JSON
 * before being re-thrown. Use this for server actions / data fetchers whose
 * errors should surface to the caller but MUST be observable.
 *
 * @example
 *   export const fetchFoo = (input: Input) =>
 *     safeAction({ name: "fetchFoo", meta: { slug: input.slug } }, () => doWork(input))
 */
export async function safeAction<T>(
  options: SafeActionOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  try {
    return await fn()
  } catch (err) {
    logError(options.name, {
      ...(options.meta ?? {}),
      durationMs: Date.now() - startedAt,
      ...toErrorDetails(err),
    })
    throw err
  }
}

/**
 * Variant of {@link safeAction} that swallows the error after logging and
 * returns `fallback` instead. Use this to replace silent `.catch(() => [])`
 * patterns where the caller cannot meaningfully handle a failure (e.g. sitemaps,
 * feed hydration), but we still want the failure to be visible in logs.
 */
export async function safeActionWithFallback<T>(
  options: SafeActionOptions,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await safeAction(options, fn)
  } catch {
    return fallback
  }
}
