import { expect, test } from "@playwright/test"

/**
 * Minimal smoke tests covering the critical user journeys that should never
 * regress on main:
 *   1. The public home page renders without a server error.
 *   2. The global navigation header is present (indicates layout boots).
 *   3. Subscribing / auth entry points are reachable.
 *
 * These tests are intentionally resilient to copy changes — they assert on
 * structural elements (status codes, landmarks, <main>) rather than specific
 * strings. Expand per-country and per-feature coverage in dedicated specs.
 */

test.describe("smoke: critical user journeys", () => {
  test("home page responds 200 and renders main landmark", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.ok(), `home page responded ${response?.status()}`).toBe(true)
    await expect(page.locator("main")).toBeVisible()
  })

  test("global header is visible on home", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("header")).toBeVisible()
  })

  test("subscribe page reachable from navigation", async ({ page }) => {
    const response = await page.goto("/subscribe")
    // /subscribe may be gated behind auth in some builds; accept 2xx or a
    // redirect, but not a 5xx server error.
    const status = response?.status() ?? 0
    expect(status, `unexpected status ${status}`).toBeLessThan(500)
    await expect(page.locator("main")).toBeVisible()
  })
})
