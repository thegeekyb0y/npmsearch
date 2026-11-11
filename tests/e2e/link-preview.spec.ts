import { expect, test } from "@playwright/test";

test("package links show a headline preview on hover and focus", async ({
  page,
}) => {
  await page.route("**/api/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: 1,
        results: [
          {
            name: "react",
            version: "19.3.1",
            description:
              "React is a JavaScript library for building user interfaces.",
            links: {
              npm: "https://www.npmjs.com/package/react",
            },
            weeklyDownloads: 1_000_000,
            exact: true,
          },
        ],
        from: 0,
        size: 20,
      }),
    });
  });

  await page.goto("/search?q=react", { waitUntil: "domcontentloaded" });

  const link = page.locator('a[href="/package/react"]').first();
  await expect(link).toBeVisible({ timeout: 30_000 });

  const preview = page.locator("[data-link-preview]");
  await expect(preview).toHaveCount(0);

  await link.hover();
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("react");
  await expect(preview).toContainText("React is a JavaScript library");

  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);

  await link.focus();
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("react");
});
