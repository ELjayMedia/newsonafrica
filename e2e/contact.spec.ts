import { expect, test } from "@playwright/test";

test.describe("contact page", () => {
  test("renders public contact details", async ({ page }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { level: 1, name: "Contact News on Africa" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "info@newsonafrica.com" })).toHaveAttribute(
      "href",
      "mailto:info@newsonafrica.com",
    );
    await expect(page.getByRole("link", { name: "+268 7696 7131" })).toHaveAttribute(
      "href",
      "tel:+26876967131",
    );
    await expect(page.getByRole("link", { name: "+27 83 942 793" })).toHaveAttribute(
      "href",
      "tel:+2783942793",
    );
  });

  test("is reachable from the footer link", async ({ page }) => {
    await page.goto("/sz");

    const link = page.locator("footer").getByRole("link", { name: "Contact" });
    await link.scrollIntoViewIfNeeded();
    await link.click();

    await expect(page).toHaveURL(/\/contact$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Contact News on Africa" }),
    ).toBeVisible();
  });
});
