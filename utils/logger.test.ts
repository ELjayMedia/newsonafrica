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

  it("logs in development mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "development"
    logger.log("hello")
    expect(spy).toHaveBeenCalledWith("hello")
  })

  it("does not log in production mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "production"
    logger.log("hello")
    expect(spy).not.toHaveBeenCalled()
  })

  it("redacts sensitive fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    process.env.NODE_ENV = "development"
    logger.log({ password: "123", nested: { token: "abc", ok: "yes" } })
    expect(spy).toHaveBeenCalledWith({
      password: "[REDACTED]",
      nested: { token: "[REDACTED]", ok: "yes" },
    })
  })
})
