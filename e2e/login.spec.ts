import { expect, test } from "@playwright/test";

/**
 * Login page smoke (NOA-117): /login renders the sign-in form shell —
 * email/password fields, submit, forgot-password and register links —
 * with no live Supabase (getUser() returns null, so no redirect fires).
 */
test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create one" })).toBeVisible();
});
