import { expect, test } from "@playwright/test";

/**
 * Infinite story feed: the category page server-renders 12 stories, then
 * /api/feed continues from the cursor as the reader scrolls. The WP stub has
 * 13 posts, so exactly one more story arrives and the feed reports the end.
 */
test.describe("infinite feed", () => {
  test("category page loads the next stories on scroll", async ({ page }) => {
    await page.goto("/sz/category/news");

    await expect(page.getByRole("link", { name: "Stub headline 12" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Stub headline 13" })).toHaveCount(0);

    await page.mouse.wheel(0, 20_000);

    await expect(page.getByRole("link", { name: "Stub headline 13" }).first()).toBeVisible();
    await expect(page.getByText("You’re all caught up.")).toBeVisible();
  });

  test("feed API rejects malformed requests", async ({ request }) => {
    const badScope = await request.get("/api/feed?scope=planet&cursor=x");
    expect(badScope.status()).toBe(400);

    const badCursor = await request.get("/api/feed?scope=edition&country=sz&cursor=not-a-cursor");
    expect(badCursor.status()).toBe(400);
  });
});
