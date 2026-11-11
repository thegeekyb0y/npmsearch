import { expect, test } from "@playwright/test";

test("unknown route shows a clean not-found page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "back to search" })).toBeVisible();
});

test("unknown package shows the package-specific not-found page", async ({
  page,
}) => {
  await page.goto("/package/this-package-does-not-exist-npmsearch-123", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Package not found" }),
  ).toBeVisible({ timeout: 45_000 });
});
