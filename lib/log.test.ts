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

  it("logs errors with metadata", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error("boom")

    error("failed", { err })

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload).toEqual({ level: "error", message: "failed", err })

    spy.mockRestore()
  })
})
