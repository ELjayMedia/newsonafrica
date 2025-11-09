import { fetchWithTimeout } from "./fetchWithTimeout"

type FetchWithTimeoutOptions = Parameters<typeof fetchWithTimeout>[1]

type NextFetchRequestConfig = FetchWithTimeoutOptions extends { next?: infer T }
  ? T
  : never

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number
  next?: NextFetchRequestConfig
  attempts?: number
  backoffMs?: number
  backoffFactor?: number
  retryOnError?: (error: unknown, attempt: number) => boolean
  retryOnResponse?: (response: Response, attempt: number) => boolean
}

const DEFAULT_ATTEMPTS = 3
const DEFAULT_BACKOFF_MS = 500
const DEFAULT_BACKOFF_FACTOR = 2
const DEFAULT_TIMEOUT = process.env.NODE_ENV === "production" ? 20000 : 10000

const defaultRetryOnError = () => true
const TRANSIENT_STATUS_CODES = new Set([408, 425, 429])

const defaultRetryOnResponse = (response: Response) =>
  response.status >= 500 || TRANSIENT_STATUS_CODES.has(response.status)

const getRetryAfterDelayMs = (response: Response): number | null => {
  const retryAfter = response.headers.get("Retry-After")
  if (!retryAfter) {
    return null
  }

  const seconds = Number(retryAfter)
  if (!Number.isNaN(seconds)) {
    return seconds > 0 ? seconds * 1000 : 0
  }

  const retryDate = Date.parse(retryAfter)
  if (!Number.isNaN(retryDate)) {
    const delayMs = retryDate - Date.now()
    return delayMs > 0 ? delayMs : 0
  }

  return null
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    attempts = DEFAULT_ATTEMPTS,
    backoffMs = DEFAULT_BACKOFF_MS,
    backoffFactor = DEFAULT_BACKOFF_FACTOR,
    retryOnError = defaultRetryOnError,
    retryOnResponse = defaultRetryOnResponse,
    timeout = DEFAULT_TIMEOUT,
    next,
    ...rest
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt++) {
    try {
      const response = await fetchWithTimeout(resource, {
        ...rest,
        next,
        timeout,
      })

      if (attempt < attempts && retryOnResponse(response, attempt)) {
        const baseDelay = backoffMs * Math.pow(backoffFactor, attempt - 1)
        const retryAfterDelay = getRetryAfterDelayMs(response)
        const delay =
          retryAfterDelay === null ? baseDelay : Math.max(baseDelay, retryAfterDelay)

        if (delay > 0) {
          await wait(delay)
        }
        continue
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !retryOnError(error, attempt)) {
        throw error
      }

      const delay = backoffMs * Math.pow(backoffFactor, attempt - 1)
      await wait(delay)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithRetry failed")
}
