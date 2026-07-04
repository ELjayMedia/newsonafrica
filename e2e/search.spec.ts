import { expect, test } from "@playwright/test";

/**
 * Search page smoke (NOA-117): /search renders its shell (heading + query
 * form) and the empty/prompt states without any live Supabase backend —
 * searchContent is resilient by design and returns no results on failure.
 */
test.describe("search page", () => {
  test("renders the search form with the empty-query prompt", async ({ page }) => {
    await page.goto("/search");

    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
    // Scope to main: the site header carries its own role="search" widget.
    await expect(page.getByRole("main").getByRole("search")).toBeVisible();
    await expect(page.getByLabel("Search query")).toBeVisible();
    await expect(page.getByText("Enter a search term to find stories")).toBeVisible();
  });

  test("submitting a query shows the no-results state when the backend is empty", async ({ page }) => {
    await page.goto("/search");

    await page.getByLabel("Search query").fill("economy");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search\?q=economy/);
    // Supabase is unreachable in the smoke environment; the page must still
    // render a graceful no-results state (never an error boundary).
    await expect(page.getByText(/No results for/)).toBeVisible();
    // Country filter pills appear once a query is present.
    await expect(page.getByRole("navigation", { name: "Filter results by country" })).toBeVisible();
  });
});
