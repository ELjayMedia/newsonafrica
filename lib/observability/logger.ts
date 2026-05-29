import { randomUUID } from "crypto"

export type LogLevel = "debug" | "info" | "warn" | "error"
export type LogContext = Record<string, unknown>

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  userId?: string
  traceId?: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private requestId: string | null = null
  private traceId: string | null = null
  private userId: string | null = null

  setRequestContext(requestId: string, userId?: string, traceId?: string) {
    this.requestId = requestId
    this.userId = userId ?? null
    this.traceId = traceId || randomUUID()
  }

  clearRequestContext() {
    this.requestId = null
    this.userId = null
    this.traceId = null
  }

  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId || undefined,
      userId: this.userId || undefined,
      traceId: this.traceId || undefined,
    }

    if (contextOrError instanceof Error) {
      const rawCode = (contextOrError as { code?: unknown }).code
      entry.error = {
        name: contextOrError.name,
        message: contextOrError.message,
        stack: contextOrError.stack,
        ...(typeof rawCode === "string" ? { code: rawCode } : {}),
      }
    } else if (contextOrError) {
      entry.context = contextOrError
    }

    const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log

    logFn(JSON.stringify(entry))

    // Forward to external services in production
    if (process.env.NODE_ENV === "production") {
      this.forwardToExternalServices(entry)
    }
  }

  private forwardToExternalServices(_entry: LogEntry) {
    // Placeholder for Sentry, DataDog, etc.
    // Will be implemented when SENTRY_DSN is configured
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context)
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context)
  }

  warn(message: string, context?: LogContext | Error) {
    this.log("warn", message, context)
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (error) {
      this.log("error", message, error)
    } else {
      this.log("error", message, context)
    }
  }
}

export const logger = new Logger()
