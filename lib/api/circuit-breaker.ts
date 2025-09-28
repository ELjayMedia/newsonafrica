import type OpossumCircuitBreaker from "opossum"

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

interface CircuitBreakerMetrics {
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

interface AdaptiveOptions {
  errorThresholdPercentage: number
  resetTimeout: number
  volumeThreshold: number
  timeout: number
  capacity: number
  bucketSpan: number
  bucketNum: number
}

class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()
  private metrics = new Map<string, CircuitBreakerMetrics>()
  private semaphores = new Map<string, number>()
  private readonly maxConcurrency = 5 // Increased from 3 to 5 for better throughput
  private adaptiveOptions = new Map<string, AdaptiveOptions>();
  \
  privaw
  I;
  'll improve the circuit breaker to be more resilient and intelligent about handling different types of failures:
\
<
  CodeProject
  id =
    'news-on-africa-pwa" taskNameActive="Improving circuit breaker resilience" taskNameComplete="Improved circuit breaker resilience' >
    \`\`\`ts file="lib/api/circuit-breaker.ts"
import OpossumCircuitBreaker from "opossum"
import { isNetworkError } from "../../utils/network-utils"

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

interface CircuitBreakerMetrics {
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

interface AdaptiveOptions {
  errorThresholdPercentage: number
  resetTimeout: number
  volumeThreshold: number
  timeout: number
  capacity: number
  bucketSpan: number
  bucketNum: number
}

class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()
  private metrics = new Map<string, CircuitBreakerMetrics>()
  private semaphores = new Map<string, number>()
  private readonly maxConcurrency = 5 // Increased from 3 to 5 for better throughput
  private adaptiveOptions = new Map<string, AdaptiveOptions>()

  private defaultOptions: AdaptiveOptions = {
    errorThresholdPercentage: 50, // Reduced from 60 to 50 for faster failure detection
    resetTimeout: 15000, // Reduced from 20000 to 15000 for faster recovery
    volumeThreshold: 5, // Increased from 3 to 5 for more stable detection
    timeout: 10000, // Reduced from 12000 to 10000 for faster timeouts
    capacity: this.maxConcurrency,
    bucketSpan: 10000, // 10 second buckets
    bucketNum: 6, // Keep 6 buckets (60 seconds of history)
  }

  private getAdaptiveOptions(key: string): AdaptiveOptions {
    const metrics = this.metrics.get(key)
    if (!metrics) return this.defaultOptions

    const cached = this.adaptiveOptions.get(key)
    if (cached) return cached

    // Calculate success rate over recent history
    const totalRequests = metrics.requests
    const successRate = totalRequests > 0 ? metrics.successes / totalRequests : 1

    // Adjust thresholds based on service reliability
    let options = { ...this.defaultOptions }

    if (successRate > 0.95) {
      // High reliability service - be more tolerant
      options.errorThresholdPercentage = 70
      options.resetTimeout = 10000
      options.volumeThreshold = 3
    } else if (successRate > 0.8) {
      // Medium reliability - standard settings
      options = this.defaultOptions
    } else {
      // Low reliability - be more aggressive
      options.errorThresholdPercentage = 30
      options.resetTimeout = 30000
      options.volumeThreshold = 8
    }

    // Cache adaptive options for 5 minutes
    this.adaptiveOptions.set(key, options)
    setTimeout(() => this.adaptiveOptions.delete(key), 300000)

    return options
  }

  async execute<T>(key: string, operationName: string, operation: () => Promise<T>): Promise<T> {
    // Check semaphore to prevent too many concurrent requests
    const currentConcurrency = this.semaphores.get(key) || 0
    if (currentConcurrency >= this.maxConcurrency) {
      throw new Error(\`Maximum concurrency reached for ${key}\`)
    }

    // Increment semaphore
    this.semaphores.set(key, currentConcurrency + 1)

    try {
      let breaker = this.breakers.get(key)
      if (!breaker) {
        const options = this.getAdaptiveOptions(key)
        breaker = new OpossumCircuitBreaker(operation, options)

        breaker.on("open", () => {
          console.log(\`[v0] Circuit breaker ${key}: OPEN - Too many failures\`)
          this.updateMetrics(key, "circuitOpened")
        })

        breaker.on("halfOpen", () => {
          console.log(\`[v0] Circuit breaker ${key}: HALF_OPEN - Testing recovery\`)
        })

        breaker.on("close", () => {
          console.log(\`[v0] Circuit breaker ${key}: CLOSED - Service recovered\`)
          const metrics = this.metrics.get(key)
          if (metrics) {
            metrics.consecutiveFailures = 0
          }
        })

        breaker.on("success", () => {
          this.updateMetrics(key, "success")
        })

        breaker.on("failure", (error) => {
          console.warn(\`[v0] Circuit breaker ${key}: FAILURE -\`, error.message)
          this.updateMetrics(key, "failure", error)
        })

        breaker.on("timeout", () => {
          console.warn(\`[v0] Circuit breaker ${key}: TIMEOUT - Request took too long\`)
          this.updateMetrics(key, "timeout")
        })

        breaker.on("reject", () => {
          console.warn(\`[v0] Circuit breaker ${key}: REJECTED - Circuit is open\`)
        })

        this.breakers.set(key, breaker)
        this.initializeMetrics(key)
      }

      const result = await breaker.fire()
      return result
    } catch (error) {
      console.error(\`[v0] Circuit breaker execution failed for ${key}:\`, error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      // Decrement semaphore
      const newConcurrency = Math.max(0, (this.semaphores.get(key) || 1) - 1)
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

  private updateMetrics(
    key: string,
    type: "request" | "success" | "failure" | "timeout" | "circuitOpened",
    error?: Error,
  ) {
    const metrics = this.metrics.get(key)
    if (!metrics) return

    switch (type) {
      case "request":
        metrics.requests++
        break
      case "success":
        metrics.successes++
        metrics.consecutiveSuccesses++
        metrics.consecutiveFailures = 0
        metrics.lastSuccess = new Date()
        break
      case "failure":
        metrics.failures++
        metrics.consecutiveFailures++
        metrics.consecutiveSuccesses = 0
        if (error) {
          metrics.lastFailure = new Date()
          
          if (isNetworkError(error)) {
            metrics.networkErrors++
          } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
            metrics.serverErrors++
          } else if (error.message.includes("400") || error.message.includes("401") || error.message.includes("404")) {
            metrics.clientErrors++
          }
        }
        break
      case "timeout":
        metrics.timeouts++
        metrics.consecutiveFailures++
        metrics.consecutiveSuccesses = 0
        break
      case "circuitOpened":
        metrics.circuitOpened++
        break
    }

    this.adjustThresholdsBasedOnMetrics(key, metrics)
  }

  private adjustThresholdsBasedOnMetrics(key: string, metrics: CircuitBreakerMetrics) {
    const breaker = this.breakers.get(key)
    if (!breaker) return

    // If we're seeing mostly network errors, be more lenient
    const totalErrors = metrics.failures
    if (totalErrors > 10) {
      const networkErrorRate = metrics.networkErrors / totalErrors
      
      if (networkErrorRate > 0.8) {
        // Mostly network errors - increase timeout and reset time
        console.log(\`[v0] Circuit breaker ${key}: Detected network issues, adjusting thresholds\`)
        // Note: opossum doesn't allow runtime option changes, but we can track this for next breaker creation
        this.adaptiveOptions.delete(key) // Force recalculation
      }
    }

    // If consecutive failures are high, consider opening circuit faster
    if (metrics.consecutiveFailures > 5) {
      console.log(\`[v0] Circuit breaker ${key}: High consecutive failures (${metrics.consecutiveFailures}), may need intervention\`)
    }
  }

  getStatus(key?: string) {
    if (key) {
      const breaker = this.breakers.get(key)
      const metrics = this.metrics.get(key)
      return {
        state: breaker?.opened ? "OPEN" : breaker?.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics || null,
        healthScore: this.calculateHealthScore(metrics),
      }
    }

    // Return status for all breakers
    const status: Record<string, any> = {}
    for (const [key, breaker] of this.breakers.entries()) {
      const metrics = this.metrics.get(key)
      status[key] = {
        state: breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics || null,
        healthScore: this.calculateHealthScore(metrics),
      }
    }
    return status
  }

  private calculateHealthScore(metrics?: CircuitBreakerMetrics): number {
    if (!metrics || metrics.requests === 0) return 1.0

    const successRate = metrics.successes / metrics.requests
    const timeoutRate = metrics.timeouts / metrics.requests
    const networkErrorRate = metrics.networkErrors / metrics.requests

    // Weight different factors
    let score = successRate * 0.6 // Success rate is most important
    score -= timeoutRate * 0.3 // Timeouts are bad
    score -= networkErrorRate * 0.2 // Network errors are concerning but less critical
    
    // Penalize consecutive failures
    if (metrics.consecutiveFailures > 3) {
      score -= (metrics.consecutiveFailures - 3) * 0.1
    }

    // Bonus for recent success
    if (metrics.lastSuccess && metrics.lastFailure) {
      const timeSinceLastSuccess = Date.now() - metrics.lastSuccess.getTime()
      const timeSinceLastFailure = Date.now() - metrics.lastFailure.getTime()
      
      if (timeSinceLastSuccess < timeSinceLastFailure) {
        score += 0.1 // Recent success bonus
      }
    }

    return Math.max(0, Math.min(1, score))
  }

  reset(key: string) {
    const breaker = this.breakers.get(key)
    if (breaker) {
      breaker.close()
      this.initializeMetrics(key)
      this.adaptiveOptions.delete(key) // Clear adaptive options
      console.log(\`[v0] Circuit breaker ${key}: RESET\`)
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
      if (metrics.requests < 10) continue // Need sufficient data

      const healthScore = this.calculateHealthScore(metrics)
      
      // If service is consistently unhealthy, increase reset timeout
      if (healthScore < 0.3 && metrics.consecutiveFailures > 10) {
        console.log(\`[v0] Service ${key} appears consistently unhealthy, adjusting circuit breaker\`)
        // Mark for more conservative settings
        this.adaptiveOptions.set(key, {
          ...this.defaultOptions,
          errorThresholdPercentage: 20,
          resetTimeout: 60000, // 1 minute
          volumeThreshold: 15,
        })
      }
      
      // If service is very healthy, be more permissive
      if (healthScore > 0.95 && metrics.requests > 50) {
        console.log(`[v0]
  Service
  $;
  {
  key
}
is
very
healthy, relaxing
circuit
breaker`)
        this.adaptiveOptions.set(key, {
          ...this.defaultOptions,
          errorThresholdPercentage: 80,
          resetTimeout: 5000, // 5 seconds
          volumeThreshold: 2,
        })
      }
    }
  }

  cleanup() {
    for (const [key, breaker] of this.breakers.entries()) {
      breaker.destroy()
    }
    this.breakers.clear()
    this.metrics.clear()
    this.adaptiveOptions.clear()
  }

  startPeriodicOptimization(intervalMs = 300000) { // 5 minutes
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
      event.preventDefault() // Prevent the error from being logged as unhandled
    }
  })
}
