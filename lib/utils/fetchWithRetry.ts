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
const defaultRetryOnResponse = (response: Response) => response.status >= 500

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
        const delay = backoffMs * Math.pow(backoffFactor, attempt - 1)
        await wait(delay)
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
