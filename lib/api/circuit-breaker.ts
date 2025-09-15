import OpossumCircuitBreaker from 'opossum'

type Operation<T> = () => Promise<T>
type Fallback<T> = () => Promise<T>

class CircuitBreakerManager {
  private breakers = new Map<string, OpossumCircuitBreaker<any>>()

  private options = {
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  }

  async execute<T>(key: string, operation: Operation<T>, fallback?: Fallback<T>): Promise<T> {
    let breaker = this.breakers.get(key)
    if (!breaker) {
      breaker = new OpossumCircuitBreaker(operation, this.options)
      breaker.on('open', () => console.log(`[v0] Circuit breaker ${key}: OPEN`))
      breaker.on('halfOpen', () => console.log(`[v0] Circuit breaker ${key}: HALF_OPEN`))
      breaker.on('close', () => console.log(`[v0] Circuit breaker ${key}: CLOSED`))
      this.breakers.set(key, breaker)
    } else {
      ;(breaker as any).action = operation
    }
    if (fallback) {
      breaker.fallback(fallback)
    }
    return breaker.fire()
  }
}

export const circuitBreaker = new CircuitBreakerManager()
