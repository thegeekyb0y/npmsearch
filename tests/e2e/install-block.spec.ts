import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("package manager menu selects with pointer and keyboard", async ({
  page,
}) => {
  await page.goto("/debug", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const trigger = page.locator('button[aria-haspopup="listbox"]');
  await expect(trigger).toHaveText(/npm/);
  await trigger.click();

  const listbox = page.getByRole("listbox", { name: "Package manager" });
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "pnpm" }).click();

  await expect(
    page.getByText("pnpm add debug", { exact: true }),
  ).toBeVisible();
  await expect(trigger).toHaveText(/pnpm/);

  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(listbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
