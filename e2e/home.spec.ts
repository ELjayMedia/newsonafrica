import { expect, test } from "@playwright/test";

/**
 * Country home page smoke (NOA-117): the default edition (/sz) renders its
 * full shell — header chrome, featured hero, secondary stories and the news
 * grid — from the WordPress stub fixtures. The most-read rail degrades to
 * its empty state because Supabase is intentionally unreachable.
 */
test.describe("country home page", () => {
  test("renders header, hero and grid sections for the default country", async ({ page }) => {
    await page.goto("/sz");

    // Header chrome (brand + primary nav) renders on every page.
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: "NewsonAfrica" })).toBeVisible();

    // Featured hero: newest fixture post becomes the h1 headline.
    await expect(page.getByRole("heading", { level: 1, name: "Stub headline 1" })).toBeVisible();

    // Grid section: 13 fixture posts = 1 hero + 3 secondary + 9 grid cards,
    // all linking into the /sz/article/ tree.
    const articleLinks = page.locator('a[href^="/sz/article/"]');
    expect(await articleLinks.count()).toBeGreaterThanOrEqual(9);

    // Secondary story headlines render alongside the hero.
    await expect(page.getByText("Stub headline 2")).toBeVisible();
  });

  test("unknown country segment renders the 404 page", async ({ page }) => {
    const response = await page.goto("/zz");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
