import { expect, test, type Page } from "@playwright/test";

const paths = ["/", "/search?q=react", "/package/react"];

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const width of [360, 768, 1280]) {
  test(`layout has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const path of paths) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
      await expectNoHorizontalScroll(page);
    }
  });
}

test("header controls meet the 44px touch target", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const button = page.locator('header form[role="search"] button').first();
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
});
