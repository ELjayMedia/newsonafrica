/**
 * Resilient fetch primitives shared by the WordPress REST and GraphQL
 * clients (NOA-85).
 *
 * `fetchWithTimeout` aborts a request that takes too long.
 * `fetchWithRetry` layers retry-with-backoff on top, retrying transient
 * network errors and 408/425/429/5xx responses (honoring `Retry-After`).
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Abort the request after this many milliseconds. Set 0 to disable. */
  timeout?: number;
}

const DEFAULT_TIMEOUT_MS = process.env.NODE_ENV === "production" ? 20_000 : 10_000;

export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;

  const abortFromSignal = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromSignal, { once: true });
    }
  }

  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", abortFromSignal);
  }
}

export interface FetchWithRetryOptions extends FetchWithTimeoutOptions {
  /** Total number of attempts (including the first). Default: 4. */
  attempts?: number;
  /** Base backoff delay in ms, doubled (by default) on each retry. */
  backoffMs?: number;
  backoffFactor?: number;
  maxBackoffMs?: number;
  retryOnError?: (error: unknown, attempt: number) => boolean;
  retryOnResponse?: (response: Response, attempt: number) => boolean;
}

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BACKOFF_MS = 750;
const DEFAULT_BACKOFF_FACTOR = 2;
const DEFAULT_MAX_BACKOFF_MS = 5_000;

const TRANSIENT_STATUS_CODES = new Set([408, 425, 429]);

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") return code;

  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") return causeCode;
  }

  return undefined;
}

const defaultRetryOnError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return true;

  const code = getErrorCode(error);
  if (!code) return true;

  return [
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN",
  ].includes(code);
};

const defaultRetryOnResponse = (response: Response) =>
  response.status >= 500 || TRANSIENT_STATUS_CODES.has(response.status);

function getRetryAfterDelayMs(response: Response): number | null {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds)) {
    return seconds > 0 ? seconds * 1000 : 0;
  }

  const retryDate = Date.parse(retryAfter);
  if (!Number.isNaN(retryDate)) {
    const delayMs = retryDate - Date.now();
    return delayMs > 0 ? delayMs : 0;
  }

  return null;
}

function getBackoffDelayMs(attempt: number, backoffMs: number, backoffFactor: number, maxBackoffMs: number): number {
  const exponentialDelay = backoffMs * Math.pow(backoffFactor, attempt - 1);
  const jitter = exponentialDelay * 0.2 * Math.random();
  return Math.min(maxBackoffMs, Math.round(exponentialDelay + jitter));
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with a bounded timeout and retry/backoff for transient failures.
 * Network errors and 408/425/429/5xx responses are retried by default;
 * anything else (4xx client errors, successful responses) is returned as-is.
 */
export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    attempts = DEFAULT_ATTEMPTS,
    backoffMs = DEFAULT_BACKOFF_MS,
    backoffFactor = DEFAULT_BACKOFF_FACTOR,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    retryOnError = defaultRetryOnError,
    retryOnResponse = defaultRetryOnResponse,
    ...rest
  } = options;

  const maxAttempts = Math.max(1, attempts);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(resource, rest);

      if (attempt < maxAttempts && retryOnResponse(response, attempt)) {
        const baseDelay = getBackoffDelayMs(attempt, backoffMs, backoffFactor, maxBackoffMs);
        const retryAfterDelay = getRetryAfterDelayMs(response);
        const delay = retryAfterDelay === null ? baseDelay : Math.max(baseDelay, retryAfterDelay);
        if (delay > 0) await wait(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !retryOnError(error, attempt)) {
        throw error;
      }
      const delay = getBackoffDelayMs(attempt, backoffMs, backoffFactor, maxBackoffMs);
      await wait(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithRetry failed");
}
