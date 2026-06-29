import { expect, test } from "@playwright/test"

/**
 * Smoke tests for the auth entry point.
 *
 * Signed-in user flows need fixture accounts and secrets, so they live in a
 * separate (gated) suite. These tests verify only that the unauthenticated
 * entry point renders and exposes the sign-in controls, and that the
 * callback route does not 5xx when hit without OAuth state.
 */
test.describe("smoke: auth entry point", () => {
  test("/auth responds 200 and renders sign-in form", async ({ page }) => {
    const response = await page.goto("/auth")
    expect(response?.ok(), `/auth responded ${response?.status()}`).toBe(true)
    await expect(page.locator("main")).toBeVisible()

    // Form should expose an email field. We check for an input of type email
    // instead of a specific placeholder to survive copy changes.
    await expect(page.locator("input[type=email]").first()).toBeVisible()
  })

  test("/auth exposes both sign-in and sign-up affordances", async ({ page }) => {
    await page.goto("/auth")

    // Scope to tab triggers only so the global navigation Sign In link does
    // not collide with the auth form controls in Playwright strict mode.
    const signIn = page.getByRole("tab", { name: /^sign in$/i })
    const signUp = page.getByRole("tab", { name: /^sign up$/i })

    await expect(signIn).toBeVisible()
    await expect(signUp).toBeVisible()
  })

  test("/auth/callback never 5xxs when hit without a valid code", async ({ page }) => {
    const response = await page.goto("/auth/callback")
    const status = response?.status() ?? 0
    // May redirect (3xx), may render an error state (4xx) — but must not 5xx.
    expect(status, `unexpected status ${status}`).toBeLessThan(500)
  })
})
