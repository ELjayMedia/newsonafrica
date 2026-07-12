import { expect, test } from "@playwright/test";

test.describe("account deletion", () => {
  test("renders the public account deletion route", async ({ page }) => {
    await page.goto("/account-deletion");
    await expect(page.getByRole("heading", { level: 1, name: "Account deletion" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to delete account" })).toHaveAttribute(
      "href",
      "/login?next=%2Faccount%2Fprofile",
    );
  });
});
