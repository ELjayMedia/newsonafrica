/* @vitest-environment node */

import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

const WEBHOOK_URL = "https://example.com/api/webhooks/wordpress"
const WEBHOOK_BODY = JSON.stringify({ action: "post_updated" })

async function loadPostHandler() {
  vi.resetModules()
  process.env.WORDPRESS_WEBHOOK_SECRET = "test-secret"
  const module = await import("./route")
  return module.POST
}

describe("WordPress webhook signature validation", () => {
  it("returns 401 when the provided signature length does not match", async () => {
    const POST = await loadPostHandler()

    const response = await POST(
      new NextRequest(WEBHOOK_URL, {
        method: "POST",
        body: WEBHOOK_BODY,
        headers: {
          "content-type": "application/json",
          "x-wp-signature": "sha256=00",
        },
      }),
    )

    expect(response.status).toBe(401)
  })

  it("returns 401 when the provided signature is not valid hex", async () => {
    const POST = await loadPostHandler()

    const invalidSignature = "zz".repeat(32)
    const response = await POST(
      new NextRequest(WEBHOOK_URL, {
        method: "POST",
        body: WEBHOOK_BODY,
        headers: {
          "content-type": "application/json",
          "x-wp-signature": `sha256=${invalidSignature}`,
        },
      }),
    )

    expect(response.status).toBe(401)
  })
})
