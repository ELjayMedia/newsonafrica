import { expect, test } from "@playwright/test";

/**
 * Newsletter capture smoke (NOA-129): the footer sign-up renders on every page
 * and validates the email client-side before hitting the server action (so this
 * runs without a live Supabase backend).
 */
test.describe("newsletter footer capture", () => {
  test("renders the sign-up and rejects an invalid email client-side", async ({ page }) => {
    await page.goto("/sz");

    const footer = page.locator("footer");
    const email = footer.getByPlaceholder("you@example.com");
    await email.scrollIntoViewIfNeeded();
    await expect(email).toBeVisible();

    await email.fill("not-an-email");
    await footer.getByRole("button", { name: "Subscribe" }).click();

    await expect(footer.getByText("Enter a valid email address.")).toBeVisible();
  });
});
