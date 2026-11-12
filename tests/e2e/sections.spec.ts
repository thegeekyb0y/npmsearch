import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test("versions and dependencies hide extra rows behind a disclosure", async ({
  page,
}) => {
  await page.goto("/next", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "next", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const versions = page.locator("#versions");
  await expect(versions).toBeVisible({ timeout: 60_000 });

  const otherVersions = versions
    .locator("summary")
    .filter({ hasText: /Other \d+ versions/ });
  await expect(otherVersions).toBeVisible();
  await otherVersions.click();
  await expect(otherVersions.locator("xpath=..")).toHaveAttribute("open", "");

  const dependencies = page.locator("#dependencies");
  await expect(dependencies).toBeVisible();

  const moreDependencies = dependencies
    .locator("summary")
    .filter({ hasText: /Show \d+ more/ });
  await expect(moreDependencies).toBeVisible();
  await moreDependencies.click();
  await expect(moreDependencies.locator("xpath=..")).toHaveAttribute(
    "open",
    "",
  );
});

test("section link copies a deep link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/debug", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const copy = page.getByRole("button", { name: "Copy link to downloads" });
  await expect(copy).toBeVisible();
  await copy.click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("#downloads");
});
