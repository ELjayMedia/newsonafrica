import { describe, expect, it, vi } from "vitest"

import { error, info, warn } from "./log"

describe("log", () => {
  it("logs info messages with metadata", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})

    info("test message", { foo: "bar" })

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload).toEqual({ level: "info", message: "test message", foo: "bar" })

    spy.mockRestore()
  })

  it("logs warnings with metadata", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})

    warn("warning", { value: 123 })

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload).toEqual({ level: "warn", message: "warning", value: 123 })

    spy.mockRestore()
  })

  it("logs errors with metadata and serializes Error instances", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error("boom")

    error("failed", { err })

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload).toMatchObject({
      level: "error",
      message: "failed",
      err: {
        name: "Error",
        message: "boom",
      },
    })
    // Stack trace should survive JSON.stringify (bare Errors serialize to {}).
    expect(typeof payload.err.stack).toBe("string")
    expect(payload.err.stack).toContain("boom")

    spy.mockRestore()
  })

  it("serializes Errors nested in arrays and preserves non-Error meta", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const first = new Error("first")
    const second = new Error("second")

    error("batch failed", { errors: [first, second], attempt: 3 })

    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload.attempt).toBe(3)
    expect(payload.errors).toHaveLength(2)
    expect(payload.errors[0]).toMatchObject({ name: "Error", message: "first" })
    expect(payload.errors[1]).toMatchObject({ name: "Error", message: "second" })

    spy.mockRestore()
  })

  it("handles circular references in meta without throwing", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})
    const circular: Record<string, unknown> = { name: "root" }
    circular.self = circular

    expect(() => info("looped", { circular })).not.toThrow()
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload.circular.name).toBe("root")
    expect(payload.circular.self).toBe("[Circular]")

    spy.mockRestore()
  })
})
