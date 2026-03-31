import { extractGraphQLOperationName } from "./schemas"

export type GraphQLClientErrorCategory = "network" | "graphql" | "validation" | "timeout"

export interface GraphQLClientErrorContext {
  endpoint: string
  operationName: string
  attempt: number
  maxAttempts: number
  durationMs: number
  statusCode?: number
}

export class GraphQLClientError extends Error {
  public readonly category: GraphQLClientErrorCategory
  public readonly context: GraphQLClientErrorContext
  public readonly graphQLErrors?: Array<{ message: string; [key: string]: unknown }>

  constructor(
    category: GraphQLClientErrorCategory,
    message: string,
    context: GraphQLClientErrorContext,
    options?: { cause?: unknown; graphQLErrors?: Array<{ message: string; [key: string]: unknown }> },
  ) {
    super(message, { cause: options?.cause })
    this.name = "GraphQLClientError"
    this.category = category
    this.context = context
    this.graphQLErrors = options?.graphQLErrors
  }
}

interface GraphQLRequestBody {
  query?: string
  variables?: Record<string, unknown>
  persistedQueryId?: string
}

interface GraphQLRequestLoggerMetadata {
  operationName: string
  endpoint: string
  attempt: number
  maxAttempts: number
  durationMs: number
  status: "success" | "retry" | "error"
  statusCode?: number
  category?: GraphQLClientErrorCategory
}

export interface GraphQLRequestOptions extends RequestInit {
  timeoutMs?: number
  maxAttempts?: number
  backoffMs?: number
  maxBackoffMs?: number
  operationName?: string
  logger?: (metadata: GraphQLRequestLoggerMetadata) => void
  body: GraphQLRequestBody
}

export interface GraphQLJSONResponse<TData> {
  data?: TData
  errors?: Array<{ message: string; [key: string]: unknown }>
}

const TRANSIENT_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

const sanitizeEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint)
    return `${url.origin}${url.pathname}`
  } catch {
    return endpoint.split("?")[0] ?? endpoint
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const asOperationName = (query: string | undefined, explicitName: string | undefined): string => {
  if (explicitName) {
    return explicitName
  }

  if (!query) {
    return "UnknownOperation"
  }

  return extractGraphQLOperationName(query)
}

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === "AbortError"
}

const isRetriableResponse = (response: Response): boolean => TRANSIENT_STATUS_CODES.has(response.status)

const createContext = (
  endpoint: string,
  operationName: string,
  attempt: number,
  maxAttempts: number,
  durationMs: number,
  statusCode?: number,
): GraphQLClientErrorContext => ({
  endpoint: sanitizeEndpoint(endpoint),
  operationName,
  attempt,
  maxAttempts,
  durationMs,
  ...(typeof statusCode === "number" ? { statusCode } : {}),
})

async function fetchWithTimeout(resource: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const timeoutController = new AbortController()
  const externalSignal = init.signal

  const forwardAbort = () => timeoutController.abort((externalSignal as AbortSignal).reason)
  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort(externalSignal.reason)
    } else {
      externalSignal.addEventListener("abort", forwardAbort, { once: true })
    }
  }

  const timeoutHandle =
    timeoutMs > 0
      ? setTimeout(() => {
          timeoutController.abort(new Error("Request timed out"))
        }, timeoutMs)
      : undefined

  try {
    return await fetch(resource, {
      ...init,
      signal: timeoutController.signal,
    })
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
    if (externalSignal) {
      externalSignal.removeEventListener("abort", forwardAbort)
    }
  }
}

export async function requestGraphQL<TData>(endpoint: string, options: GraphQLRequestOptions): Promise<GraphQLJSONResponse<TData>> {
  const {
    timeoutMs = 10_000,
    maxAttempts = 3,
    backoffMs = 300,
    maxBackoffMs = 2_000,
    operationName: explicitOperationName,
    logger,
    body,
    ...init
  } = options

  const requestBody = JSON.stringify(body)
  const operationName = asOperationName(body.query, explicitOperationName)
  const sanitizedEndpoint = sanitizeEndpoint(endpoint)

  let latestError: GraphQLClientError | undefined

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    const startedAt = Date.now()

    try {
      const response = await fetchWithTimeout(endpoint, {
        ...init,
        method: init.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        body: init.method === "GET" ? undefined : requestBody,
      }, timeoutMs)

      const durationMs = Date.now() - startedAt

      if (!response.ok) {
        const responseError = new GraphQLClientError(
          "network",
          `GraphQL request failed with status ${response.status}`,
          createContext(endpoint, operationName, attempt, maxAttempts, durationMs, response.status),
        )

        if (attempt < maxAttempts && isRetriableResponse(response)) {
          logger?.({
            operationName,
            endpoint: sanitizedEndpoint,
            attempt,
            maxAttempts,
            durationMs,
            status: "retry",
            statusCode: response.status,
            category: responseError.category,
          })
          const exponentialBackoff = Math.min(maxBackoffMs, backoffMs * 2 ** (attempt - 1))
          await wait(exponentialBackoff)
          continue
        }

        logger?.({
          operationName,
          endpoint: sanitizedEndpoint,
          attempt,
          maxAttempts,
          durationMs,
          status: "error",
          statusCode: response.status,
          category: responseError.category,
        })

        throw responseError
      }

      let json: unknown
      try {
        json = (await response.json()) as unknown
      } catch (error) {
        const validationError = new GraphQLClientError(
          "validation",
          "GraphQL response was not valid JSON",
          createContext(endpoint, operationName, attempt, maxAttempts, durationMs, response.status),
          { cause: error },
        )

        logger?.({
          operationName,
          endpoint: sanitizedEndpoint,
          attempt,
          maxAttempts,
          durationMs,
          status: "error",
          statusCode: response.status,
          category: validationError.category,
        })

        throw validationError
      }

      if (!json || typeof json !== "object" || Array.isArray(json)) {
        const validationError = new GraphQLClientError(
          "validation",
          "GraphQL response payload was not an object",
          createContext(endpoint, operationName, attempt, maxAttempts, durationMs, response.status),
        )

        logger?.({
          operationName,
          endpoint: sanitizedEndpoint,
          attempt,
          maxAttempts,
          durationMs,
          status: "error",
          statusCode: response.status,
          category: validationError.category,
        })

        throw validationError
      }

      const payload = json as GraphQLJSONResponse<TData>

      if (payload.errors?.length) {
        const graphQLError = new GraphQLClientError(
          "graphql",
          "GraphQL response contained errors",
          createContext(endpoint, operationName, attempt, maxAttempts, durationMs, response.status),
          { graphQLErrors: payload.errors },
        )

        logger?.({
          operationName,
          endpoint: sanitizedEndpoint,
          attempt,
          maxAttempts,
          durationMs,
          status: "error",
          statusCode: response.status,
          category: graphQLError.category,
        })

        throw graphQLError
      }

      logger?.({
        operationName,
        endpoint: sanitizedEndpoint,
        attempt,
        maxAttempts,
        durationMs,
        status: "success",
        statusCode: response.status,
      })

      return payload
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const isTimeout = isAbortError(error)

      const normalizedError =
        error instanceof GraphQLClientError
          ? error
          : new GraphQLClientError(
              isTimeout ? "timeout" : "network",
              isTimeout ? "GraphQL request timed out" : "GraphQL request failed",
              createContext(endpoint, operationName, attempt, maxAttempts, durationMs),
              { cause: error },
            )

      latestError = normalizedError

      if (attempt >= maxAttempts || normalizedError.category === "graphql" || normalizedError.category === "validation") {
        if (!(error instanceof GraphQLClientError)) {
          logger?.({
            operationName,
            endpoint: sanitizedEndpoint,
            attempt,
            maxAttempts,
            durationMs,
            status: "error",
            category: normalizedError.category,
          })
        }
        throw normalizedError
      }

      logger?.({
        operationName,
        endpoint: sanitizedEndpoint,
        attempt,
        maxAttempts,
        durationMs,
        status: "retry",
        category: normalizedError.category,
      })

      const exponentialBackoff = Math.min(maxBackoffMs, backoffMs * 2 ** (attempt - 1))
      await wait(exponentialBackoff)
    }
  }

  throw latestError ?? new GraphQLClientError("network", "GraphQL request failed", createContext(endpoint, "UnknownOperation", 1, 1, 0))
}
