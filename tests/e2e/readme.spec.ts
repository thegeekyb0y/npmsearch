import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("README renders sanitized markdown with TOC, shiki and copy", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/package/zod", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "zod", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const readme = page.locator("#readme");
  await expect(readme.locator(".readme-code").first()).toBeVisible();
  await expect(readme.locator("pre.shiki").first()).toBeVisible();
  await expect(readme.locator("button.readme-copy").first()).toBeVisible();
  await expect(readme.locator("script")).toHaveCount(0);

  const summary = readme.locator("summary");
  await summary.click();
  const installation = readme.getByRole("link", { name: "Installation" });
  await expect(installation).toBeVisible();
  await installation.click();
  await expect(page).toHaveURL(/#installation$/);
  await expect(readme.locator("#installation")).toBeVisible();

  const copy = readme.locator("button.readme-copy").first();
  await copy.click();
  await expect(copy).toHaveText("copied");
});
