import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

test("renders the published README when the registry omits it", async ({
  page,
}) => {
  await page.goto("/react", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "react", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const readme = page.locator("#readme");
  await expect(
    readme.getByRole("heading", { name: "react", exact: true }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(readme).not.toContainText("No README available");
});
