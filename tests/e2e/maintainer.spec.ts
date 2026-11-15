import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test("maintainer profile renders signal, telemetry, reach and packages", async ({
  page,
}) => {
  await page.goto("/maintainer/sindresorhus", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { level: 1, name: "@sindresorhus" }),
  ).toBeVisible({ timeout: 60_000 });

  const telemetry = page.getByRole("region", { name: "Maintainer telemetry" });
  await expect(telemetry).toContainText("packages");
  await expect(telemetry).toContainText("weekly · top 50");
  await expect(telemetry).toContainText("top package");

  const constellation = page.getByRole("group", {
    name: "Package constellation for sindresorhus",
  });
  await expect(constellation).toBeVisible();
  await expect(constellation.getByRole("link").first()).toHaveAttribute(
    "href",
    /^\/package\//,
  );

  await expect(
    page.locator('a[data-preview-title="ansi-styles"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Aggregate download trend" }),
  ).toBeVisible({ timeout: 60_000 });

  await expect(
    page.getByRole("link", { name: /See all [\d,]+ packages/ }),
  ).toHaveAttribute("href", "/search?q=maintainer%3Asindresorhus");
});

test("package maintainers link to their profile", async ({ page }) => {
  await page.goto("/package/chalk", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "chalk", exact: true }),
  ).toBeVisible({ timeout: 60_000 });

  const link = page
    .locator("#maintainers")
    .getByRole("link", { name: /sindresorhus/i })
    .first();

  await expect(link).toHaveAttribute("href", "/maintainer/sindresorhus");
  await Promise.all([
    page.waitForURL(/\/maintainer\/sindresorhus$/, { timeout: 60_000 }),
    link.click(),
  ]);

  await expect(
    page.getByRole("heading", { level: 1, name: "@sindresorhus" }),
  ).toBeVisible({ timeout: 60_000 });
});

test("invalid maintainer handles show a not found panel", async ({ page }) => {
  await page.goto("/maintainer/not%20a%20name");

  await expect(page.getByText("Maintainer not found")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("link", { name: "browse packages" }),
  ).toBeVisible();
});
