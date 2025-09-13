import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import logger from "./logger"

const ORIGINAL_ENV = process.env.NODE_ENV

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = ORIGINAL_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV
  })

  it("logs debug in development mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "development"
    logger.debug("hello")
    expect(spy).toHaveBeenCalledWith("hello")
  })

  it("does not log debug in production mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "production"
    logger.debug("hello")
    expect(spy).not.toHaveBeenCalled()
  })

  it("always logs errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    process.env.NODE_ENV = "production"
    logger.error("fail")
    expect(spy).toHaveBeenCalledWith("fail")
  })

  it("redacts sensitive fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "development"
    logger.debug({ password: "123", nested: { token: "abc", ok: "yes" } })
    expect(spy).toHaveBeenCalledWith({
      password: "[REDACTED]",
      nested: { token: "[REDACTED]", ok: "yes" },
    })
  })
})
