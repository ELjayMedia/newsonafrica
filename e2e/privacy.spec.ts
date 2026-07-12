import { expect, test } from "@playwright/test";

/**
 * Privacy policy route smoke (NOA-135): the policy must be live and reachable
 * for PWA/TWA readiness and Google Play submission, including from the footer
 * link that ships on every page.
 */
test.describe("privacy policy", () => {
  test("renders at /privacy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText(/Last updated:/)).toBeVisible();
    await expect(page.getByRole("link", { name: "the account deletion page" })).toHaveAttribute(
      "href",
      "/account-deletion",
    );
  });

  test("is reachable from the footer link", async ({ page }) => {
    await page.goto("/sz");
    const link = page.locator("footer").getByRole("link", { name: "Privacy Policy" });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  });
});
