import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders the search entry point", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("searchbox").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /npm/i }).first()).toBeVisible();
  });

  test("search route renders results or a readable error state", async ({ page }) => {
    await page.goto("/search?q=react", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).toContainText("packages for");
    await expect(page.locator("body")).toContainText("/ wk");
  });

  test("home exposes social metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og\.png$/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("package route renders a package or a readable not-found state", async ({ page }) => {
    await page.goto("/package/react", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });
});
