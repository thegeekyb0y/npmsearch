import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders the search entry point", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("textbox").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /npm/i }).first()).toBeVisible();
  });

  test("search route renders results or a readable error state", async ({ page }) => {
    await page.goto("/search?q=react", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("package route renders a package or a readable not-found state", async ({ page }) => {
    await page.goto("/package/react", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
