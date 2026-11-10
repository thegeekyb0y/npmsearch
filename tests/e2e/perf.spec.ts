import { expect, test } from "@playwright/test";

async function measureCls(page: import("@playwright/test").Page, path: string) {
  await page.addInitScript(() => {
    const store = window as unknown as { __cls: number };
    store.__cls = 0;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };
        if (!shift.hadRecentInput && typeof shift.value === "number") {
          store.__cls += shift.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(1500);

  return page.evaluate(() => (window as unknown as { __cls: number }).__cls ?? 0);
}

test("home has no meaningful layout shift", async ({ page }) => {
  const cls = await measureCls(page, "/");
  expect(cls).toBeLessThan(0.01);
});

test("search results have no meaningful layout shift", async ({ page }) => {
  const cls = await measureCls(page, "/search?q=react");
  expect(cls).toBeLessThan(0.01);
});
