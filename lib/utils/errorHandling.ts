import logger from '@/utils/logger'
/**
 * Error handling utilities for the application
 */

export interface AppError {
  message: string
  code?: string
  details?: any
  timestamp: Date
}

export class ContentError extends Error {
  code: string
  details?: any
  timestamp: Date

  constructor(message: string, code = "CONTENT_ERROR", details?: any) {
    super(message)
    this.name = "ContentError"
    this.code = code
    this.details = details
    this.timestamp = new Date()
  }
}

export class APIError extends Error {
  code: string
  status?: number
  details?: any
  timestamp: Date

  constructor(message: string, code = "API_ERROR", status?: number, details?: any) {
    super(message)
    this.name = "APIError"
    this.code = code
    this.status = status
    this.details = details
    this.timestamp = new Date()
  }
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: string): void {
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  }

  logger.error("Application Error:", errorInfo)

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === "production") {
    // Send to error tracking service (e.g., Sentry, LogRocket, etc.)
  }
}

/**
 * Handle API errors with retry logic
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw new APIError(
          `Failed after ${maxRetries} attempts: ${lastError.message}`,
          "MAX_RETRIES_EXCEEDED",
          undefined,
          { originalError: lastError, attempts: attempt },
        )
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}

/**
 * Safe async function wrapper
 */
export async function safeAsync<T>(fn: () => Promise<T>, fallback: T, context?: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    logError(error as Error, context)
    return fallback
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  if (error instanceof ContentError) {
    switch (error.code) {
      case "NO_FEATURED_POSTS":
        return "No featured content available at the moment."
      case "INVALID_POST_DATA":
        return "Some content could not be loaded properly."
      default:
        return "There was an issue loading the content."
    }
  }

  if (error instanceof APIError) {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Please check your internet connection and try again."
      case "SERVER_ERROR":
        return "Our servers are experiencing issues. Please try again later."
      case "MAX_RETRIES_EXCEEDED":
        return "Unable to connect to our servers. Please try again later."
      default:
        return "There was a problem connecting to our services."
    }
  }

  return "An unexpected error occurred. Please try again."
}
