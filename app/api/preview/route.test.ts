import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/config/env", () => ({
  ENV: {
    WORDPRESS_PREVIEW_SECRET: "secret-token",
    NEXT_PUBLIC_DEFAULT_SITE: "sz",
  },
}))

const enableDraftMode = vi.fn()

vi.mock("next/headers", () => ({
  draftMode: vi.fn(() => ({ isEnabled: false, enable: enableDraftMode, disable: vi.fn() })),
}))

import { draftMode } from "next/headers"
import { GET } from "./route"

describe("/api/preview", () => {
  beforeEach(() => {
    enableDraftMode.mockClear()
    vi.mocked(draftMode).mockReturnValue({ isEnabled: false, enable: enableDraftMode, disable: vi.fn() } as any)
  })

  it("enables draft mode and redirects to the requested article", async () => {
    const request = new NextRequest(
      "https://example.com/api/preview?secret=secret-token&slug=My-Article&country=za",
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://example.com/za/article/my-article")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(enableDraftMode).toHaveBeenCalledTimes(1)
  })

  it("returns 401 when the preview secret is invalid", async () => {
    const request = new NextRequest("https://example.com/api/preview?secret=invalid")

    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(enableDraftMode).not.toHaveBeenCalled()
  })

  it("redirects to the fallback path when no slug is provided", async () => {
    const request = new NextRequest(
      "https://example.com/api/preview?secret=secret-token&path=/custom",
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://example.com/custom")
    expect(enableDraftMode).toHaveBeenCalledTimes(1)
  })
})
