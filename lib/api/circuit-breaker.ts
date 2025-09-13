import logger from '@/utils/logger'
interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: "CLOSED" | "OPEN" | "HALF_OPEN"
}

class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>()
  private readonly failureThreshold = 5
  private readonly recoveryTimeout = 30000 // 30 seconds
  private readonly halfOpenMaxCalls = 3

  private getState(key: string): CircuitBreakerState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: "CLOSED",
      })
    }
    return this.states.get(key)!
  }

  async execute<T>(key: string, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const state = this.getState(key)
    const now = Date.now()

    // Check if circuit should move from OPEN to HALF_OPEN
    if (state.state === "OPEN" && now - state.lastFailureTime > this.recoveryTimeout) {
      state.state = "HALF_OPEN"
      logger.debug(`[v0] Circuit breaker ${key}: Moving to HALF_OPEN state`)
    }

    // If circuit is OPEN, use fallback immediately
    if (state.state === "OPEN") {
      logger.debug(`[v0] Circuit breaker ${key}: OPEN - using fallback`)
      if (fallback) {
        return await fallback()
      }
      throw new Error(`Circuit breaker ${key} is OPEN`)
    }

    try {
      const result = await operation()

      // Success - reset failure count and close circuit
      if (state.state === "HALF_OPEN") {
        logger.debug(`[v0] Circuit breaker ${key}: Success in HALF_OPEN - closing circuit`)
      }
      state.failures = 0
      state.state = "CLOSED"

      return result
    } catch (error) {
      state.failures++
      state.lastFailureTime = now

      logger.debug(`[v0] Circuit breaker ${key}: Failure ${state.failures}/${this.failureThreshold}`)

      // Open circuit if failure threshold reached
      if (state.failures >= this.failureThreshold) {
        state.state = "OPEN"
        logger.debug(`[v0] Circuit breaker ${key}: Opening circuit due to failures`)
      }

      // Use fallback if available
      if (fallback) {
        logger.debug(`[v0] Circuit breaker ${key}: Using fallback due to error`)
        return await fallback()
      }

      throw error
    }
  }

  getStatus(key: string) {
    const state = this.getState(key)
    return {
      state: state.state,
      failures: state.failures,
      lastFailureTime: state.lastFailureTime,
    }
  }
}

export const circuitBreaker = new CircuitBreaker()
