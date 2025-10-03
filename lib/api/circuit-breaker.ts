import OpossumCircuitBreaker from "opossum"

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

export class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()
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

    let breaker = this.breakers.get(key)
    if (!breaker) {
      breaker = new OpossumCircuitBreaker(operation, {
        errorThresholdPercentage: this.options.errorThresholdPercentage,
        resetTimeout: this.options.resetTimeout,
        volumeThreshold: this.options.volumeThreshold,
        timeout: this.options.timeout,
      })
      this.registerListeners(key, breaker)
      this.breakers.set(key, breaker)
    } else {
      ;(breaker as any).action = operation
    }

    if (fallback) {
      breaker.fallback(fallback)
    }

    return breaker.fire()
  }

  private registerListeners(key: string, breaker: OpossumCircuitBreaker<any>) {
    breaker.on("open", () => this.handleStateChange(key, "open"))
    breaker.on("halfOpen", () => this.handleStateChange(key, "halfOpen"))
    breaker.on("close", () => this.handleStateChange(key, "closed"))
    breaker.on("success", () => this.recordSuccess(key))
    breaker.on("failure", (error: unknown) => this.recordFailure(key, error))
    breaker.on("timeout", () => this.recordFailure(key, new Error("Circuit breaker timeout")))
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
