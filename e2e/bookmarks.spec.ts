import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the bookmark entry point.
 *
 * `/bookmarks` is authenticated. An unauthenticated request should never
 * render the bookmark list — it should either redirect to the sign-in
 * flow or render the ProtectedRoute fallback. We assert the negative
 * (it does not 5xx and does not leak data), leaving signed-in coverage
 * to a fixture-backed suite.
 */
test.describe("smoke: bookmarks entry point", () => {
  test("/bookmarks redirects or renders auth gate for anonymous users", async ({ page }) => {
    const response = await page.goto("/bookmarks")
    const status = response?.status() ?? 0
    expect(status, `unexpected status ${status}`).toBeLessThan(500)

    // After navigation settles, the user should either be on an auth-like
    // page or be seeing the ProtectedRoute fallback. Either way, we should
    // not see a rendered list of bookmarks.
    await page.waitForLoadState("domcontentloaded")

    const finalUrl = page.url()
    const onAuthSurface = /\/auth|\/login/.test(finalUrl)

    if (!onAuthSurface) {
      // Still on /bookmarks → must be rendering the ProtectedRoute fallback,
      // not the bookmarks list heading.
      await expect(page.getByRole("heading", { name: /your bookmarks/i })).toHaveCount(0)
    }
  })

  test("/api/bookmarks GET requires authentication", async ({ request }) => {
    const response = await request.get("/api/bookmarks")
    // 401 or 403 are both acceptable; 200 would mean the endpoint leaked
    // data to an unauthenticated caller.
    expect([401, 403]).toContain(response.status())
  })
})
