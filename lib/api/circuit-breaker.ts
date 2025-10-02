import OpossumCircuitBreaker from "opossum"

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

interface CircuitBreakerContext {
  country?: string
  endpoint?: string
}

class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()

  private options = {
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  }

  private contexts = new Map<string, CircuitBreakerContext>()
  private failureCounts = new Map<string, number>()
  private lastErrors = new Map<string, Error>()

  private buildKey(key: string, context?: CircuitBreakerContext): string {
    if (context?.country) {
      return `${key}:${context.country.toLowerCase()}`
    }
    return key
  }

  private logState(state: string, key: string): void {
    const context = this.contexts.get(key)
    const consecutiveFailures = this.failureCounts.get(key) ?? 0
    const lastError = this.lastErrors.get(key)

    console.log(`[v0] Circuit breaker ${key}: ${state}`, {
      country: context?.country,
      endpoint: context?.endpoint,
      consecutiveFailures,
      lastError: lastError?.message,
    })
  }

  private logFailure(key: string, error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    const context = this.contexts.get(key)
    const consecutiveFailures = (this.failureCounts.get(key) ?? 0) + 1
    this.failureCounts.set(key, consecutiveFailures)
    this.lastErrors.set(key, normalizedError)

    console.warn(`[v0] Circuit breaker ${key}: FAILURE`, {
      country: context?.country,
      endpoint: context?.endpoint,
      consecutiveFailures,
      lastError: normalizedError.message,
    })
  }

  private registerBreakerEvents(breaker: OpossumCircuitBreaker<any>, key: string): void {
    breaker.on("open", () => this.logState("OPEN", key))
    breaker.on("halfOpen", () => this.logState("HALF_OPEN", key))
    breaker.on("close", () => {
      this.failureCounts.set(key, 0)
      this.logState("CLOSED", key)
    })
    breaker.on("failure", (error) => this.logFailure(key, error))
  }

  async execute<T>(
    key: string,
    operation: Operation<T>,
    fallback?: Fallback<T>,
    options: { context?: CircuitBreakerContext } = {},
  ): Promise<T> {
    const breakerKey = this.buildKey(key, options.context)
    let breaker = this.breakers.get(breakerKey)
    if (!breaker) {
      breaker = new OpossumCircuitBreaker(operation, this.options)
      this.registerBreakerEvents(breaker, breakerKey)
      this.breakers.set(breakerKey, breaker)
    } else {
      ;(breaker as any).action = operation
    }

    if (options.context) {
      this.contexts.set(breakerKey, options.context)
    }

    if (fallback) {
      breaker.fallback(fallback)
    }

    return breaker.fire()
  }
}

export const circuitBreaker = new CircuitBreakerManager()
