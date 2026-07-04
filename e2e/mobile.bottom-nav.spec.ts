import { expect, test } from "@playwright/test";

/**
 * Mobile bottom navigation smoke (NOA-117/NOA-111): on a phone viewport
 * (the `mobile-chromium` project) the fixed bottom nav is visible with its
 * four destinations; Search navigates to /search.
 */
test.describe("bottom navigation (mobile viewport)", () => {
  test("is visible with Home, Search, Saved and Profile items", async ({ page }) => {
    await page.goto("/sz");

    const nav = page.getByRole("navigation", { name: "Bottom navigation" });
    await expect(nav).toBeVisible();

    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Saved" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible();

    // Home resolves to the current edition.
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/sz");
  });

  test("navigates to the search page", async ({ page }) => {
    await page.goto("/sz");

    await page.getByRole("navigation", { name: "Bottom navigation" }).getByRole("link", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
  });
});
