import { expect, test } from "@playwright/test";

/**
 * Article 404 smoke (NOA-117): a valid country with an unknown article slug
 * must land on the not-found page (the WordPress stub returns an empty
 * collection for any ?slug= lookup, mirroring how a live WP responds for
 * missing slugs).
 *
 * Note on status codes: this route has a loading.tsx boundary, so Next.js
 * streams the shell (flushing 200 headers) before getPostBySlug resolves and
 * notFound() fires — the HTTP status is 200 by design even though the
 * not-found UI renders. The unknown-country case (see home.spec.ts) rejects
 * before streaming and does return a real 404 status.
 */
test("unknown article slug renders the 404 page", async ({ page }) => {
  await page.goto("/sz/article/this-article-does-not-exist");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
});
