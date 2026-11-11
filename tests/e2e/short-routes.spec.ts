import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("short route renders a package", async ({ page }) => {
  await page.goto("/debug", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText("npm install debug", { exact: true }),
  ).toBeVisible();
});

test("short route renders a specific version", async ({ page }) => {
  await page.goto("/debug@4.3.4", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("v4.3.4", { exact: true })).toBeVisible();
  await expect(
    page.getByText("npm install debug@4.3.4", { exact: true }),
  ).toBeVisible();
});

test("short route renders a scoped package", async ({ page }) => {
  await page.goto("/@types/node", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "@types/node",
      exact: true,
    }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText("npm install @types/node", { exact: true }),
  ).toBeVisible();
});
