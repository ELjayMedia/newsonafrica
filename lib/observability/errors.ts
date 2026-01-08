import { logger } from "./logger"

export interface ErrorContext {
  userId?: string
  requestId?: string
  path?: string
  method?: string
  statusCode?: number
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

class ErrorTracker {
  captureException(error: Error, context?: ErrorContext) {
    logger.error("Exception caught", error, context as any)

    // Forward to Sentry/error tracking service
    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      this.sendToSentry(error, context)
    }
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "error", context?: ErrorContext) {
    logger.error(message, undefined, context as any)

    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      this.sendMessageToSentry(message, level, context)
    }
  }

  private sendToSentry(error: Error, context?: ErrorContext) {
    // Placeholder for Sentry SDK integration
    // Will implement when @sentry/nextjs is added
    console.log("[Sentry] Would send error:", error.message, context)
  }

  private sendMessageToSentry(message: string, level: string, context?: ErrorContext) {
    // Placeholder for Sentry SDK integration
    console.log("[Sentry] Would send message:", message, level, context)
  }
}

export const errorTracker = new ErrorTracker()
