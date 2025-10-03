import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 10))

const { CircuitBreakerManager } = await import("./circuit-breaker")
const log = await import("../log")

describe("CircuitBreakerManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("records metrics and emits structured logs on state changes", async () => {
    const manager = new CircuitBreakerManager({
      errorThresholdPercentage: 1,
      volumeThreshold: 2,
      resetTimeout: 1000,
      timeout: 5,
    })

    const key = "wordpress-rest-sz-test-endpoint"
    const meta = { country: "sz", endpoint: "rest:test-endpoint" }
    const error = new Error("test failure")
    const failingOperation = vi.fn().mockRejectedValue(error)

    await manager.execute(key, failingOperation, undefined, meta).catch(() => undefined)
    await manager.execute(key, failingOperation, undefined, meta).catch(() => undefined)

    await flushPromises()

    const warnMock = log.warn as unknown as ReturnType<typeof vi.fn>
    expect(warnMock).toHaveBeenCalledWith(
      "Circuit breaker state change",
      expect.objectContaining({
        key,
        state: "open",
        country: meta.country,
        endpoint: meta.endpoint,
        consecutiveFailures: 2,
      }),
    )

    const metrics = manager.getMetrics(key)
    expect(metrics).toEqual(
      expect.objectContaining({
        state: "open",
        consecutiveFailures: 2,
      }),
    )
    expect(metrics?.lastError).toMatchObject({ message: "test failure", name: "Error" })
    expect(typeof metrics?.lastFailureAt).toBe("number")
    expect(metrics?.lastSuccessAt ?? null).toBeNull()
  })

  it("keeps metrics scoped by country-specific keys", async () => {
    const manager = new CircuitBreakerManager({
      errorThresholdPercentage: 1,
      volumeThreshold: 2,
      resetTimeout: 1000,
      timeout: 5,
    })

    const failingOperation = vi.fn().mockRejectedValue(new Error("failure"))

    const keySz = "wordpress-rest-sz-sample"
    const keyZa = "wordpress-rest-za-sample"

    await manager.execute(keySz, failingOperation, undefined, {
      country: "sz",
      endpoint: "rest:sample",
    }).catch(() => undefined)
    await manager.execute(keySz, failingOperation, undefined, {
      country: "sz",
      endpoint: "rest:sample",
    }).catch(() => undefined)

    await manager.execute(keyZa, failingOperation, undefined, {
      country: "za",
      endpoint: "rest:sample",
    }).catch(() => undefined)
    await manager.execute(keyZa, failingOperation, undefined, {
      country: "za",
      endpoint: "rest:sample",
    }).catch(() => undefined)

    await flushPromises()

    const metricsSz = manager.getMetrics(keySz)!
    const metricsZa = manager.getMetrics(keyZa)!

    expect(metricsSz.consecutiveFailures).toBe(2)
    expect(metricsZa.consecutiveFailures).toBe(2)
    expect(metricsSz).not.toBe(metricsZa)

    const warnMock = log.warn as unknown as ReturnType<typeof vi.fn>
    expect(warnMock).toHaveBeenCalledWith(
      "Circuit breaker state change",
      expect.objectContaining({ key: keySz, country: "sz" }),
    )
    expect(warnMock).toHaveBeenCalledWith(
      "Circuit breaker state change",
      expect.objectContaining({ key: keyZa, country: "za" }),
    )
  })
})
