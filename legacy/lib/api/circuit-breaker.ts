import * as log from "../log"

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

type CircuitBreakerState = "closed" | "open" | "halfOpen"

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  consecutiveFailures: number
  lastError?: Record<string, unknown>
  lastFailureAt?: number
  lastSuccessAt?: number
  lastStateChangeAt?: number
}

export interface CircuitBreakerMetadata {
  country?: string
  endpoint?: string
}

type CircuitBreakerOptions = {
  errorThresholdPercentage?: number
  resetTimeout?: number
  volumeThreshold?: number
  timeout?: number
}

interface BreakerControlState {
  nextAttemptAt: number
  probeInProgress: boolean
}

const CIRCUIT_OPEN_ERROR = new Error("Circuit breaker is open")

export class CircuitBreakerManager {
  private breakerStates = new Map<string, BreakerControlState>()
  private metrics = new Map<string, CircuitBreakerMetrics>()
  private metadata = new Map<string, CircuitBreakerMetadata>()
  private readonly options: Required<CircuitBreakerOptions>

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 5,
      timeout: 10000,
      ...options,
    }
  }

  getMetrics(key: string): CircuitBreakerMetrics | undefined {
    const data = this.metrics.get(key)
    if (!data) {
      return undefined
    }

    return {
      ...data,
      lastError: data.lastError ? { ...data.lastError } : undefined,
    }
  }

  async execute<T>(
    key: string,
    operation: Operation<T>,
    fallback?: Fallback<T>,
    metadata: CircuitBreakerMetadata = {},
  ): Promise<T> {
    this.metadata.set(key, { ...this.metadata.get(key), ...metadata })
    const { controlState, metrics } = this.ensureState(key)
    const now = Date.now()

    if (metrics.state === "open") {
      if (now < controlState.nextAttemptAt) {
        return this.executeFallback(key, fallback)
      }

      controlState.probeInProgress = false
      this.handleStateChange(key, "halfOpen")
    }

    if (metrics.state === "halfOpen") {
      if (controlState.probeInProgress) {
        return this.executeFallback(key, fallback)
      }
    }

    controlState.probeInProgress = true

    try {
      const result = await this.runWithTimeout(operation)
      this.recordSuccess(key)
      controlState.probeInProgress = false
      controlState.nextAttemptAt = 0

      if (metrics.state !== "closed") {
        this.handleStateChange(key, "closed")
      }

      return result
    } catch (error) {
      controlState.probeInProgress = false
      this.recordFailure(key, error)

      const shouldOpen =
        metrics.state === "halfOpen" || metrics.consecutiveFailures >= this.options.volumeThreshold

      if (shouldOpen) {
        controlState.nextAttemptAt = Date.now() + this.options.resetTimeout
        this.handleStateChange(key, "open")
      }

      if (fallback) {
        return fallback()
      }

      if (error instanceof Error) {
        throw error
      }

      throw new Error("Circuit breaker operation failed")
    }
  }

  private ensureState(key: string) {
    let controlState = this.breakerStates.get(key)
    if (!controlState) {
      controlState = { nextAttemptAt: 0, probeInProgress: false }
      this.breakerStates.set(key, controlState)
    }

    const metrics = this.ensureMetrics(key)
    return { controlState, metrics }
  }

  private async runWithTimeout<T>(operation: Operation<T>): Promise<T> {
    if (!this.options.timeout || this.options.timeout <= 0) {
      return operation()
    }

    return new Promise<T>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error("Circuit breaker timeout"))
      }, this.options.timeout)

      operation()
        .then((value) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(value)
        })
        .catch((error) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  private executeFallback<T>(key: string, fallback?: Fallback<T>): Promise<T> {
    if (fallback) {
      return fallback()
    }

    return Promise.reject(CIRCUIT_OPEN_ERROR)
  }

  private ensureMetrics(key: string): CircuitBreakerMetrics {
    const existing = this.metrics.get(key)
    if (existing) {
      return existing
    }

    const initial: CircuitBreakerMetrics = {
      state: "closed",
      consecutiveFailures: 0,
    }

    this.metrics.set(key, initial)
    return initial
  }

  private recordFailure(key: string, error: unknown) {
    const metrics = this.ensureMetrics(key)
    metrics.consecutiveFailures += 1
    metrics.lastFailureAt = Date.now()
    metrics.lastError = this.normalizeError(error)
  }

  private recordSuccess(key: string) {
    const metrics = this.ensureMetrics(key)
    metrics.consecutiveFailures = 0
    metrics.lastSuccessAt = Date.now()
  }

  private handleStateChange(key: string, state: CircuitBreakerState) {
    const metrics = this.ensureMetrics(key)
    const previousState = metrics.state

    if (previousState === state) {
      return
    }

    metrics.state = state
    metrics.lastStateChangeAt = Date.now()

    if (state === "closed") {
      metrics.consecutiveFailures = 0
    }

    const meta = this.metadata.get(key) ?? {}
    const logPayload = {
      key,
      state,
      country: meta.country,
      endpoint: meta.endpoint,
      consecutiveFailures: metrics.consecutiveFailures,
      lastError: metrics.lastError,
      lastFailureAt: metrics.lastFailureAt,
      lastSuccessAt: metrics.lastSuccessAt,
      lastStateChangeAt: metrics.lastStateChangeAt,
    }

    if (state === "open") {
      log.warn("Circuit breaker state change", logPayload)
    } else {
      log.info("Circuit breaker state change", logPayload)
    }
  }

  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const { name, message, stack } = error
      return {
        name,
        message,
        stack,
      }
    }

    if (typeof error === "string") {
      return { message: error }
    }

    if (typeof error === "object" && error !== null) {
      return { ...error }
    }

    return { message: "Unknown error", value: error }
  }
}

export const circuitBreaker = new CircuitBreakerManager()
