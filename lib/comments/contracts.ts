export type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
  meta?: Record<string, unknown>
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly meta?: Record<string, unknown>

  constructor(message: string, status: number, meta?: Record<string, unknown>) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.meta = meta
  }

  get retryAfterSeconds(): number | null {
    const maybeRateLimit = this.meta?.rateLimit
    if (!maybeRateLimit || typeof maybeRateLimit !== "object") return null

    const candidate = (maybeRateLimit as { retryAfterSeconds?: unknown }).retryAfterSeconds
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null
  }
}

export async function parseApiEnvelope<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null
  if (!response.ok) {
    const meta =
      json && typeof json === "object" && "meta" in json && json.meta && typeof json.meta === "object"
        ? (json.meta as Record<string, unknown>)
        : undefined
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Request failed (${response.status})`
    throw new ApiRequestError(message, response.status, meta)
  }

  if (json && typeof json === "object" && "success" in json) {
    const envelope = json as ApiEnvelope<T>
    if (!envelope.success || envelope.data === undefined) {
      throw new Error(envelope.error || "Request failed")
    }
    return envelope.data
  }

  return json as T
}
