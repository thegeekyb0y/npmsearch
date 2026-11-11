import { expect, test } from "@playwright/test";

test.describe("search dock", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("one dock moves from the hero into the header", async ({ page }) => {
    await page.goto("/");

    const input = page.getByRole("searchbox", { name: "Search npm packages" });
    await expect(input).toHaveCount(1);

    const form = page.locator('header form[role="search"]');
    const transitionProperty = await form.evaluate(
      (element) => getComputedStyle(element).transitionProperty,
    );
    expect(transitionProperty).toContain("translate");

    await expect
      .poll(async () => (await form.boundingBox())?.y ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(200);

    await input.fill("react");
    await input.press("Enter");

    await expect(page).toHaveURL(/q=react/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await expect(input).toBeFocused();

    await expect
      .poll(async () => (await form.boundingBox())?.y ?? 999, { timeout: 5_000 })
      .toBeLessThan(100);
  });

  test("mobile keeps the dock in the header", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");

    const form = page.locator('header form[role="search"]');
    const box = await form.boundingBox();
    expect(box?.y ?? 999).toBeLessThan(100);
  });
});
