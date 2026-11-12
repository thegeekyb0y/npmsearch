import { expect, test } from "@playwright/test";

test("header links to the repository and drops the duplicate search link", async ({
  page,
}) => {
  await page.goto("/");

  const nav = page.locator('nav[aria-label="Primary"]');

  await expect(
    nav.locator('a[href="https://github.com/thegeekyb0y/npmsearch"]'),
  ).toHaveCount(1);
  await expect(nav.locator('a[href="/search"]')).toHaveCount(0);
});
