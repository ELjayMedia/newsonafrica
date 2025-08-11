export type AuthErrorInfo = {
  code?: string
  message: string
  status?: number
  cause?: unknown
  raw?: unknown
}

export enum AuthErrorCategory {
  Network = "network",
  Credentials = "credentials",
  Authorization = "authorization",
  Validation = "validation",
  RateLimit = "rate_limit",
  Server = "server",
  Unknown = "unknown",
}

export class AuthError extends Error {
  public readonly code?: string
  public readonly status?: number
  public readonly category: AuthErrorCategory
  public readonly cause?: unknown
  public readonly raw?: unknown

  constructor(info: AuthErrorInfo, category?: AuthErrorCategory) {
    super(info.message)
    this.name = "AuthError"
    this.code = info.code
    this.status = info.status
    this.category = category || getAuthErrorCategory(info)
    this.cause = info.cause
    this.raw = info.raw
  }

  static fromUnknown(error: unknown, context?: { action?: string; metadata?: Record<string, unknown> }): AuthError {
    const info = parseAuthError(error)
    const category = getAuthErrorCategory(error)

    // Log the error
    logAuthError(error, context)

    return new AuthError(info, category)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      category: this.category,
    }
  }
}

/**
 * Normalize various auth-related errors (fetch, Next.js, Supabase, OAuth, generic Error)
 * into a simple, serializable shape for UI and logging.
 */
export function parseAuthError(error: unknown): AuthErrorInfo {
  // Supabase-style errors
  if (isObject(error) && ("status" in error || "code" in error) && "message" in error) {
    const e = error as { status?: number; code?: string; message?: string; cause?: unknown }
    return {
      code: toStringOrUndefined(e.code),
      message: e.message || "Authentication error",
      status: toNumberOrUndefined(e.status),
      cause: e.cause,
      raw: error,
    }
  }

  // Fetch Response errors (when thrown manually with Response or similar)
  if (isResponseLike(error)) {
    return {
      code: httpStatusToCode(error.status),
      message: `Request failed with status ${error.status}`,
      status: error.status,
      raw: error,
    }
  }

  // Error with cause (Node/JS native)
  if (error instanceof Error) {
    const anyErr = error as Error & { code?: string; status?: number }
    return {
      code: toStringOrUndefined(anyErr.code),
      message: anyErr.message || "Authentication error",
      status: toNumberOrUndefined(anyErr.status),
      cause: anyErr.cause,
      raw: error,
    }
  }

  // String or unknown
  if (typeof error === "string") {
    return { message: error, raw: error }
  }

  // Fallback
  return { message: "Authentication error", raw: error }
}

/**
 * Log auth-related errors consistently on server and client.
 * Returns the normalized error info so callers can display a message.
 */
export function logAuthError(
  error: unknown,
  context?: {
    action?: string
    metadata?: Record<string, unknown>
  },
): AuthErrorInfo {
  const info = parseAuthError(error)
  const category = getAuthErrorCategory(error)

  const payload = {
    level: "error" as const,
    area: "auth" as const,
    env: process.env.NODE_ENV,
    action: context?.action,
    message: info.message,
    code: info.code,
    status: info.status,
    metadata: safeJson(context?.metadata),
    category, // added
  }

  // Server vs Client logging
  if (typeof window === "undefined") {
    // Server
    console.error("[AuthError][Server]", payload, { cause: info.cause })
  } else {
    // Client
    // Avoid leaking raw objects in production logs
    if (process.env.NODE_ENV === "development") {
      // More verbose in dev
      // eslint-disable-next-line no-console
      console.error("[AuthError][Client]", payload, info.raw)
    } else {
      // eslint-disable-next-line no-console
      console.error("[AuthError][Client]", {
        ...payload,
        raw: undefined,
      })
    }
  }

  return info
}

/* ------------------------ helpers ------------------------ */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function toStringOrUndefined(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined
}

function toNumberOrUndefined(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined
}

function isResponseLike(v: unknown): v is { status: number } {
  return isObject(v) && typeof (v as any).status === "number"
}

function categorizeByStatus(status?: number): AuthErrorCategory {
  if (!status) return AuthErrorCategory.Unknown
  if (status === 401) return AuthErrorCategory.Authorization
  if (status === 403) return AuthErrorCategory.Authorization
  if (status === 404) return AuthErrorCategory.Validation
  if (status === 409) return AuthErrorCategory.Validation
  if (status === 422) return AuthErrorCategory.Validation
  if (status === 429) return AuthErrorCategory.RateLimit
  if (status >= 500) return AuthErrorCategory.Server
  if (status >= 400) return AuthErrorCategory.Validation
  return AuthErrorCategory.Unknown
}

function categorizeByCode(code?: string): AuthErrorCategory {
  if (!code) return AuthErrorCategory.Unknown
  const c = code.toUpperCase()
  // Common Node/HTTP/network-ish error codes:
  if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "NETWORK_ERROR"].includes(c)) {
    return AuthErrorCategory.Network
  }
  if (c === "UNAUTHORIZED" || c === "HTTP_401") return AuthErrorCategory.Authorization
  if (c === "FORBIDDEN" || c === "HTTP_403") return AuthErrorCategory.Authorization
  if (
    c === "BAD_REQUEST" ||
    c === "UNPROCESSABLE_ENTITY" ||
    c === "NOT_FOUND" ||
    c === "CONFLICT" ||
    c.startsWith("HTTP_4")
  ) {
    return AuthErrorCategory.Validation
  }
  if (c === "SERVICE_UNAVAILABLE" || c === "BAD_GATEWAY" || c === "SERVER_ERROR" || c.startsWith("HTTP_5")) {
    return AuthErrorCategory.Server
  }
  if (c === "RATE_LIMITED" || c === "TOO_MANY_REQUESTS" || c === "HTTP_429") {
    return AuthErrorCategory.RateLimit
  }
  return AuthErrorCategory.Unknown
}

export function getAuthErrorCategory(error: unknown): AuthErrorCategory {
  const info = parseAuthError(error)
  // Prefer status; then code
  const byStatus = categorizeByStatus(info.status)
  if (byStatus !== AuthErrorCategory.Unknown) return byStatus
  return categorizeByCode(info.code)
}

function httpStatusToCode(status?: number): string | undefined {
  if (!status) return undefined
  // Map a few common statuses to readable codes (extend as needed)
  switch (status) {
    case 400:
      return "BAD_REQUEST"
    case 401:
      return "UNAUTHORIZED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 409:
      return "CONFLICT"
    case 422:
      return "UNPROCESSABLE_ENTITY"
    case 500:
      return "SERVER_ERROR"
    case 502:
      return "BAD_GATEWAY"
    case 503:
      return "SERVICE_UNAVAILABLE"
    default:
      return `HTTP_${status}`
  }
}

function safeJson(value: unknown): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined
  try {
    // Ensure the object is serializable
    JSON.stringify(value)
    return value
  } catch {
    return undefined
  }
}
