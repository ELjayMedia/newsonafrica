import OpossumCircuitBreaker from "opossum"

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

interface CircuitBreakerMetrics {
  requests: number
  failures: number
  successes: number
  timeouts: number
  circuitOpened: number
  lastFailure?: Date
}

class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()
  private metrics = new Map<string, CircuitBreakerMetrics>()
  private semaphores = new Map<string, number>()
  private readonly maxConcurrency = 3

  private options = {
    errorThresholdPercentage: 60, // Allow more failures before opening
    resetTimeout: 20000, // Faster recovery - 20 seconds
    volumeThreshold: 3, // Lower threshold for faster detection
    timeout: 12000, // Shorter timeout - 12 seconds
    capacity: this.maxConcurrency,
    bucketSpan: 10000, // 10 second buckets
    bucketNum: 6, // Keep 6 buckets (60 seconds of history)
  }

  async execute<T>(key: string, operationName: string, operation: () => Promise<T>): Promise<T> {
    // Check semaphore to prevent too many concurrent requests
    const currentConcurrency = this.semaphores.get(key) || 0
    if (currentConcurrency >= this.maxConcurrency) {
      throw new Error(`Maximum concurrency reached for ${key}`)
    }

    // Increment semaphore
    this.semaphores.set(key, currentConcurrency + 1)

    try {
      let breaker = this.breakers.get(key)
      if (!breaker) {
        breaker = new OpossumCircuitBreaker(operation, this.options)

        breaker.on("open", () => {
          console.log(`[v0] Circuit breaker ${key}: OPEN - Too many failures`)
          this.updateMetrics(key, "circuitOpened")
        })

        breaker.on("halfOpen", () => {
          console.log(`[v0] Circuit breaker ${key}: HALF_OPEN - Testing recovery`)
        })

        breaker.on("close", () => {
          console.log(`[v0] Circuit breaker ${key}: CLOSED - Service recovered`)
        })

        breaker.on("success", () => {
          this.updateMetrics(key, "success")
        })

        breaker.on("failure", (error) => {
          console.warn(`[v0] Circuit breaker ${key}: FAILURE -`, error.message)
          this.updateMetrics(key, "failure", error)
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

      const result = await breaker.fire()
      return result
    } catch (error) {
      console.error(`[v0] Using fallback for ${key}:`, error instanceof Error ? error.message : String(error))
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
        break
      case "failure":
        metrics.failures++
        if (error) {
          metrics.lastFailure = new Date()
        }
        break
      case "timeout":
        metrics.timeouts++
        break
      case "circuitOpened":
        metrics.circuitOpened++
        break
    }
  }

  getStatus(key?: string) {
    if (key) {
      const breaker = this.breakers.get(key)
      const metrics = this.metrics.get(key)
      return {
        state: breaker?.opened ? "OPEN" : breaker?.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics || null,
      }
    }

    // Return status for all breakers
    const status: Record<string, any> = {}
    for (const [key, breaker] of this.breakers.entries()) {
      const metrics = this.metrics.get(key)
      status[key] = {
        state: breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED",
        metrics: metrics || null,
      }
    }
    return status
  }

  reset(key: string) {
    const breaker = this.breakers.get(key)
    if (breaker) {
      breaker.close()
      this.initializeMetrics(key)
      console.log(`[v0] Circuit breaker ${key}: RESET`)
    }
  }

  cleanup() {
    for (const [key, breaker] of this.breakers.entries()) {
      breaker.destroy()
    }
    this.breakers.clear()
    this.metrics.clear()
  }
}

export const circuitBreaker = new CircuitBreakerManager()

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason?.message?.includes("Circuit breaker")) {
      console.warn("[v0] Unhandled circuit breaker rejection:", event.reason.message)
      event.preventDefault() // Prevent the error from being logged as unhandled
    }
  })
}
