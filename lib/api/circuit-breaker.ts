import CircuitBreaker from "opossum"
import type { Options } from "opossum"

import { isNetworkError } from "@/utils/network-utils"

type Operation<T> = () => Promise<T>

type CircuitBreakerEvent = "request" | "success" | "failure" | "timeout" | "circuitOpened"

type CircuitBreakerMetrics = {
  requests: number
  failures: number
  successes: number
  timeouts: number
  circuitOpened: number
  networkErrors: number
  serverErrors: number
  clientErrors: number
  lastFailure?: Date
  lastSuccess?: Date
  consecutiveFailures: number
  consecutiveSuccesses: number
}

type AdaptiveOptions = Required<
  Pick<
    Options,
    | "errorThresholdPercentage"
    | "resetTimeout"
    | "volumeThreshold"
    | "timeout"
    | "capacity"
    | "bucketSpan"
    | "bucketNum"
  >
>

class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker<any>>()

  private metrics = new Map<string, CircuitBreakerMetrics>()

  private semaphores = new Map<string, number>()

  private readonly maxConcurrency = 5

  private adaptiveOptions = new Map<string, AdaptiveOptions>()

  private readonly defaultOptions: AdaptiveOptions = {
    errorThresholdPercentage: 50,
    resetTimeout: 15_000,
    volumeThreshold: 5,
    timeout: 10_000,
    capacity: this.maxConcurrency,
    bucketSpan: 10_000,
    bucketNum: 6,
  }

  private getAdaptiveOptions(key: string): AdaptiveOptions {
    const metrics = this.metrics.get(key)
    if (!metrics) return this.defaultOptions

    const cached = this.adaptiveOptions.get(key)
    if (cached) return cached

    const totalRequests = metrics.requests
    const successRate = totalRequests > 0 ? metrics.successes / totalRequests : 1

    let options = { ...this.defaultOptions }

    if (successRate > 0.95) {
      options.errorThresholdPercentage = 70
      options.resetTimeout = 10_000
      options.volumeThreshold = 3
    } else if (successRate <= 0.8) {
      options.errorThresholdPercentage = 30
      options.resetTimeout = 30_000
      options.volumeThreshold = 8
    }

    this.adaptiveOptions.set(key, options)
    setTimeout(() => this.adaptiveOptions.delete(key), 300_000)

    return options
  }

  async execute<T>(key: string, operationName: string, operation: Operation<T>): Promise<T> {
    const currentConcurrency = this.semaphores.get(key) ?? 0
    if (currentConcurrency >= this.maxConcurrency) {
      throw new Error(`Maximum concurrency reached for ${key}`)
    }

    this.semaphores.set(key, currentConcurrency + 1)

    try {
      let breaker = this.breakers.get(key)

      if (!breaker) {
        const options = this.getAdaptiveOptions(key)
        breaker = new CircuitBreaker(operation, options)

        breaker.on("open", () => {
          console.log(`[v0] Circuit breaker ${key}: OPEN - Too many failures`)
          this.updateMetrics(key, "circuitOpened")
        })

        breaker.on("halfOpen", () => {
          console.log(`[v0] Circuit breaker ${key}: HALF_OPEN - Testing recovery`)
        })

        breaker.on("close", () => {
          console.log(`[v0] Circuit breaker ${key}: CLOSED - Service recovered`)
          const metrics = this.metrics.get(key)
          if (metrics) {
            metrics.consecutiveFailures = 0
          }
        })

        breaker.on("success", () => {
          this.updateMetrics(key, "success")
        })

        breaker.on("failure", (error) => {
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[v0] Circuit breaker ${key}: FAILURE in ${operationName} -`, message)
          this.updateMetrics(key, "failure", error instanceof Error ? error : new Error(message))
        })

        breaker.on("timeout", () => {
          console.warn(`[v0] Circuit breaker ${key}: TIMEOUT - Request took too long`)
          this.updateMetrics(key, "timeout")
        })

        breaker.on("reject", () => {
          console.warn(`[v0] Circuit breaker ${key}: REJECTED - Circuit is open`)
        })

        this.breakers.set(key, breaker)
        this.initializeMetrics(key)
      }

      this.updateMetrics(key, "request")

      const result = await breaker.fire()
      return result as T
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[v0] Circuit breaker execution failed for ${key}:`, message)
      throw error
    } finally {
      const newConcurrency = Math.max(0, (this.semaphores.get(key) ?? 1) - 1)
      this.semaphores.set(key, newConcurrency)
    }
  }

  private initializeMetrics(key: string) {
    this.metrics.set(key, {
      requests: 0,
      failures: 0,
      successes: 0,
      timeouts: 0,
      circuitOpened: 0,
      networkErrors: 0,
      serverErrors: 0,
      clientErrors: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    })
  }

  private updateMetrics(key: string, type: CircuitBreakerEvent, error?: Error) {
    const metrics = this.metrics.get(key)
    if (!metrics) return

    switch (type) {
      case "request":
        metrics.requests += 1
        break
      case "success":
        metrics.successes += 1
        metrics.consecutiveSuccesses += 1
        metrics.consecutiveFailures = 0
        metrics.lastSuccess = new Date()
        break
      case "failure":
        metrics.failures += 1
        metrics.consecutiveFailures += 1
        metrics.consecutiveSuccesses = 0
        metrics.lastFailure = new Date()
        if (error) {
          if (isNetworkError(error)) {
            metrics.networkErrors += 1
          } else if (/(500|502|503)/.test(error.message)) {
            metrics.serverErrors += 1
          } else if (/(400|401|404)/.test(error.message)) {
            metrics.clientErrors += 1
          }
        }
        break
      case "timeout":
        metrics.timeouts += 1
        metrics.consecutiveFailures += 1
        metrics.consecutiveSuccesses = 0
        break
      case "circuitOpened":
        metrics.circuitOpened += 1
        break
    }

    this.adjustThresholdsBasedOnMetrics(key, metrics)
  }

  private adjustThresholdsBasedOnMetrics(key: string, metrics: CircuitBreakerMetrics) {
    const breaker = this.breakers.get(key)
    if (!breaker) return

    const totalErrors = metrics.failures
    if (totalErrors > 10) {
      const networkErrorRate = metrics.networkErrors / totalErrors
      if (networkErrorRate > 0.8) {
        console.log(`[v0] Circuit breaker ${key}: Detected network issues, adjusting thresholds`)
        this.adaptiveOptions.delete(key)
      }
    }

    if (metrics.consecutiveFailures > 5) {
      console.log(
        `[v0] Circuit breaker ${key}: High consecutive failures (${metrics.consecutiveFailures}), may need intervention`,
      )
    }
  }

  getStatus(key?: string) {
    if (key) {
      const breaker = this.breakers.get(key)
      const metrics = this.metrics.get(key)
      return {
        state: breaker?.opened ? "OPEN" : breaker?.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics ?? null,
        healthScore: this.calculateHealthScore(metrics),
      }
    }

    const status: Record<string, any> = {}
    for (const [breakerKey, breaker] of this.breakers.entries()) {
      const metrics = this.metrics.get(breakerKey)
      status[breakerKey] = {
        state: breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics ?? null,
        healthScore: this.calculateHealthScore(metrics),
      }
    }

    return status
  }

  private calculateHealthScore(metrics?: CircuitBreakerMetrics): number {
    if (!metrics || metrics.requests === 0) return 1

    const successRate = metrics.successes / metrics.requests
    const timeoutRate = metrics.timeouts / metrics.requests
    const networkErrorRate = metrics.networkErrors / metrics.requests

    let score = successRate * 0.6
    score -= timeoutRate * 0.3
    score -= networkErrorRate * 0.2

    if (metrics.consecutiveFailures > 3) {
      score -= (metrics.consecutiveFailures - 3) * 0.1
    }

    if (metrics.lastSuccess && metrics.lastFailure) {
      const timeSinceLastSuccess = Date.now() - metrics.lastSuccess.getTime()
      const timeSinceLastFailure = Date.now() - metrics.lastFailure.getTime()
      if (timeSinceLastSuccess < timeSinceLastFailure) {
        score += 0.1
      }
    }

    return Math.max(0, Math.min(1, score))
  }

  reset(key: string) {
    const breaker = this.breakers.get(key)
    if (breaker) {
      breaker.close()
      this.initializeMetrics(key)
      this.adaptiveOptions.delete(key)
      console.log(`[v0] Circuit breaker ${key}: RESET`)
    }
  }

  getHealthSummary(): { healthy: string[]; degraded: string[]; unhealthy: string[] } {
    const healthy: string[] = []
    const degraded: string[] = []
    const unhealthy: string[] = []

    for (const [key, metrics] of this.metrics.entries()) {
      const healthScore = this.calculateHealthScore(metrics)
      if (healthScore >= 0.8) {
        healthy.push(key)
      } else if (healthScore >= 0.5) {
        degraded.push(key)
      } else {
        unhealthy.push(key)
      }
    }

    return { healthy, degraded, unhealthy }
  }

  optimizeBasedOnPatterns() {
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.requests < 10) continue

      const healthScore = this.calculateHealthScore(metrics)

      if (healthScore < 0.3 && metrics.consecutiveFailures > 10) {
        console.log(`[v0] Service ${key} appears consistently unhealthy, adjusting circuit breaker`)
        this.adaptiveOptions.set(key, {
          ...this.defaultOptions,
          errorThresholdPercentage: 20,
          resetTimeout: 60_000,
          volumeThreshold: 15,
        })
      }

      if (healthScore > 0.95 && metrics.requests > 50) {
        console.log(`[v0] Service ${key} is very healthy, relaxing circuit breaker`)
        this.adaptiveOptions.set(key, {
          ...this.defaultOptions,
          errorThresholdPercentage: 80,
          resetTimeout: 5_000,
          volumeThreshold: 2,
        })
      }
    }
  }

  cleanup() {
    for (const [, breaker] of this.breakers.entries()) {
      breaker.destroy()
    }
    this.breakers.clear()
    this.metrics.clear()
    this.adaptiveOptions.clear()
  }

  startPeriodicOptimization(intervalMs = 300_000) {
    const interval = setInterval(() => {
      this.optimizeBasedOnPatterns()
    }, intervalMs)

    return () => clearInterval(interval)
  }
}

export const circuitBreaker = new CircuitBreakerManager()

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  circuitBreaker.startPeriodicOptimization()
}

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason?.message?.includes("Circuit breaker")) {
      console.warn("[v0] Unhandled circuit breaker rejection:", event.reason.message)
      event.preventDefault()
    }
  })
}
