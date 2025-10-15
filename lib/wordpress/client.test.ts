import { Buffer } from "node:buffer"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

describe("buildRequestHeaders", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.assign(process.env, originalEnv)
  })

  afterEach(() => {
    vi.resetModules()
    const currentKeys = new Set(Object.keys(process.env))
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
      currentKeys.delete(key)
    })
    currentKeys.forEach((key) => {
      delete process.env[key]
    })
  })

  it("returns JSON + Basic auth headers when requested", async () => {
    process.env.WP_APP_USER = "app"
    process.env.WP_APP_PASS = "secret"

    const { buildRequestHeaders } = await import("./client")

    const headers = buildRequestHeaders({ auth: true, json: true })
    expect(headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("app:secret", "utf8").toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    })
  })

  it("normalizes JWT tokens by ensuring the Bearer prefix", async () => {
    process.env.WP_APP_JWT_TOKEN = "token-123"

    const { buildRequestHeaders } = await import("./client")

    const headers = buildRequestHeaders({ auth: true })
    expect(headers).toMatchObject({ Authorization: "Bearer token-123" })
  })
})
