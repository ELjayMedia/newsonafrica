import { fetchWithTimeout } from "./fetchWithTimeout"

type FetchWithTimeoutOptions = Parameters<typeof fetchWithTimeout>[1]

type NextFetchRequestConfig = FetchWithTimeoutOptions extends { next?: infer T }
  ? T
  : never

type AgentResolver = (resource: RequestInfo | URL) => unknown | Promise<unknown>

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number
  next?: NextFetchRequestConfig
  attempts?: number
  backoffMs?: number
  backoffFactor?: number
  jitter?: boolean | number
  random?: () => number
  retryOnError?: (error: unknown, attempt: number) => boolean
  retryOnResponse?: (response: Response, attempt: number) => boolean
  agent?: unknown
  getAgent?: AgentResolver
}

const DEFAULT_ATTEMPTS = 3
const DEFAULT_BACKOFF_MS = 500
const DEFAULT_BACKOFF_FACTOR = 2
const DEFAULT_TIMEOUT = process.env.NODE_ENV === "production" ? 20000 : 10000
const DEFAULT_JITTER: boolean | number = true

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const applyJitter = (
  baseDelay: number,
  random: () => number,
  jitter: boolean | number,
): number => {
  if (baseDelay <= 0 || !jitter) {
    return baseDelay
  }

  const randomValue = clamp(random(), 0, 1)

  if (typeof jitter === "number") {
    const ratio = clamp(Math.abs(jitter), 0, 1)
    if (ratio === 0) {
      return baseDelay
    }

    const min = baseDelay * (1 - ratio)
    const max = baseDelay * (1 + ratio)
    const span = max - min
    const value = min + randomValue * span
    return Math.max(1, Math.round(value))
  }

  return Math.max(1, Math.round(randomValue * baseDelay))
}

const isNodeServer = () =>
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process?.release?.name === "node" &&
  process.env.NEXT_RUNTIME !== "edge"

const getRequestProtocol = (resource: RequestInfo | URL): string | null => {
  if (resource instanceof URL) {
    return resource.protocol
  }

  if (typeof Request !== "undefined" && resource instanceof Request) {
    try {
      return new URL(resource.url).protocol
    } catch {
      return null
    }
  }

  if (typeof resource === "string") {
    try {
      return new URL(resource).protocol
    } catch {
      return null
    }
  }

  return null
}

type HttpModule = typeof import("http")
type HttpsModule = typeof import("https")

let httpModulePromise: Promise<HttpModule> | null = null
let httpsModulePromise: Promise<HttpsModule> | null = null
let sharedHttpAgent: import("http").Agent | undefined
let sharedHttpsAgent: import("https").Agent | undefined

const resolveDefaultAgent: AgentResolver = async (resource) => {
  if (!isNodeServer()) {
    return undefined
  }

  const protocol = getRequestProtocol(resource) ?? "https:"

  if (protocol === "http:") {
    if (!sharedHttpAgent) {
      const httpLib = await (httpModulePromise ??= import("http"))
      sharedHttpAgent = new httpLib.Agent({ keepAlive: true })
    }
    return sharedHttpAgent
  }

  if (!sharedHttpsAgent) {
    const httpsLib = await (httpsModulePromise ??= import("https"))
    sharedHttpsAgent = new httpsLib.Agent({ keepAlive: true })
  }
  return sharedHttpsAgent
}

const resolveAgent = async (
  resource: RequestInfo | URL,
  providedAgent: unknown,
  resolver?: AgentResolver,
): Promise<unknown> => {
  if (providedAgent !== undefined) {
    return providedAgent
  }

  if (resolver) {
    return await resolver(resource)
  }

  return await resolveDefaultAgent(resource)
}

export async function fetchWithRetry(
  resource: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    attempts = DEFAULT_ATTEMPTS,
    backoffMs = DEFAULT_BACKOFF_MS,
    backoffFactor = DEFAULT_BACKOFF_FACTOR,
    jitter = DEFAULT_JITTER,
    random = Math.random,
    retryOnError = defaultRetryOnError,
    retryOnResponse = defaultRetryOnResponse,
    timeout = DEFAULT_TIMEOUT,
    next,
    agent: providedAgent,
    getAgent,
    ...rest
  } = options

  const agent = await resolveAgent(resource, providedAgent, getAgent)

  let lastError: unknown

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt++) {
    try {
      const response = await fetchWithTimeout(resource, {
        ...rest,
        next,
        timeout,
        ...(agent ? { agent } : {}),
      })

      if (attempt < attempts && retryOnResponse(response, attempt)) {
        const baseDelay = backoffMs * Math.pow(backoffFactor, attempt - 1)
        const jitteredDelay = applyJitter(baseDelay, random, jitter)
        const retryAfterDelay = getRetryAfterDelayMs(response)
        const delay =
          retryAfterDelay === null ? jitteredDelay : Math.max(jitteredDelay, retryAfterDelay)

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

      const baseDelay = backoffMs * Math.pow(backoffFactor, attempt - 1)
      const delay = applyJitter(baseDelay, random, jitter)
      if (delay > 0) {
        await wait(delay)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithRetry failed")
}
