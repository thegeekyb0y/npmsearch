import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("package analytics show downloads, install size and dependency health", async ({
  page,
}) => {
  await page.goto("/package/debug", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const downloads = page.locator("#downloads");
  await expect(downloads).toContainText("weekly");
  await expect(
    downloads.getByRole("slider", { name: "Daily download trend" }),
  ).toBeVisible();

  const meta = page.locator("dl").first();
  await expect(meta).toContainText("unpacked");
  await expect(meta).toContainText("deps");

  const install = page.locator("#install-size");
  await expect(install).toBeVisible({ timeout: 30_000 });
  await expect(install).toContainText("Includes dependencies");

  const compatibility = page.locator("#compatibility");
  await expect(compatibility).toContainText("node");
  await expect(compatibility).toContainText("cjs");

  const dependencies = page.locator("#dependencies");
  await expect(dependencies).toBeVisible();
  await expect(
    dependencies.getByRole("link", { name: "ms", exact: true }),
  ).toBeVisible();
});
