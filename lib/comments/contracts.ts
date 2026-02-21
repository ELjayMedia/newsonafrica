export type ApiEnvelope<T> = {
  data: T | null
  error: string | null
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
  const json = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { success?: boolean; data?: T; error?: string; meta?: Record<string, unknown> }
    | T
    | null

  const meta =
    json && typeof json === "object" && "meta" in json && json.meta && typeof json.meta === "object"
      ? (json.meta as Record<string, unknown>)
      : undefined

  const messageFromJson =
    json && typeof json === "object" && "error" in json && typeof json.error === "string"
      ? json.error
      : undefined

  if (!response.ok) {
    throw new ApiRequestError(messageFromJson ?? `Request failed (${response.status})`, response.status, meta)
  }

  if (json && typeof json === "object" && "data" in json && "error" in json) {
    const envelope = json as ApiEnvelope<T>
    if (envelope.error) {
      throw new ApiRequestError(envelope.error, response.status, envelope.meta)
    }

    return envelope.data as T
  }

  if (json && typeof json === "object" && "success" in json) {
    const legacyEnvelope = json as { success?: boolean; data?: T; error?: string }
    if (!legacyEnvelope.success || legacyEnvelope.data === undefined) {
      throw new ApiRequestError(legacyEnvelope.error || "Request failed", response.status, meta)
    }
    return legacyEnvelope.data
  }

  return json as T
}
