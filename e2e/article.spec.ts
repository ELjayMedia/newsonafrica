import { expect, test } from "@playwright/test";

/**
 * Article revision line smoke (NOA-139): the visible "Updated" timestamp shows
 * only when a post's modified time meaningfully post-dates its publish time.
 * The WP stub publishes post 2 with a modified date two days later; every other
 * post keeps modified == date.
 */
test.describe("article page", () => {
  test("renders the article and a visible Updated line for an updated post", async ({ page }) => {
    await page.goto("/sz/article/stub-headline-2");

    await expect(page.getByRole("heading", { level: 1, name: "Stub headline 2" })).toBeVisible();
    // The line renders in both the mobile and desktop article trees (one hidden
    // per breakpoint); the desktop tree is rendered last and is visible here.
    const updated = page.getByText(/^Updated/);
    await expect(updated).toHaveCount(2);
    await expect(updated.last()).toBeVisible();
  });

  test("omits the Updated line when the post was never meaningfully updated", async ({ page }) => {
    await page.goto("/sz/article/stub-headline-3");

    await expect(page.getByRole("heading", { level: 1, name: "Stub headline 3" })).toBeVisible();
    await expect(page.getByText(/^Updated/)).toHaveCount(0);
  });
});
