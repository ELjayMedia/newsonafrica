import { logger } from "./logger"

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: string
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private timers = new Map<string, number>()

  start(name: string) {
    this.timers.set(name, performance.now())
  }

  end(name: string, tags?: Record<string, string>, metadata?: Record<string, unknown>) {
    const startTime = this.timers.get(name)
    if (!startTime) {
      logger.warn(`Performance timer not found: ${name}`)
      return
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      tags,
      metadata,
    }

    logger.info("Performance metric", { ...metric })

    // Send to metrics endpoint
    if (typeof window === "undefined") {
      // Server-side - use fetch
      this.sendMetric(metric).catch((err) => logger.error("Failed to send performance metric", err))
    }
  }

  async measure<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    this.start(name)
    try {
      const result = await fn()
      this.end(name, tags, { success: true })
      return result
    } catch (error) {
      this.end(name, tags, { success: false, error: (error as Error).message })
      throw error
    }
  }

  private async sendMetric(metric: PerformanceMetric) {
    if (!process.env.METRICS_FORWARD_URL) return

    await fetch(process.env.METRICS_FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "performance",
        ...metric,
      }),
    })
  }
}

export const performanceMonitor = new PerformanceMonitor()
