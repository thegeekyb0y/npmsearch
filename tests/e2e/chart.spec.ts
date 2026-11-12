import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("download chart supports pointer and keyboard inspection", async ({
  page,
}) => {
  await page.goto("/debug", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "debug", exact: true }),
  ).toBeVisible({ timeout: 45_000 });

  const chart = page.getByRole("slider", { name: "Daily download trend" });
  await expect(chart).toBeVisible();

  await chart.focus();
  const before = await chart.getAttribute("aria-valuetext");
  expect(before).toBeTruthy();

  await page.keyboard.press("ArrowLeft");
  await expect(chart).not.toHaveAttribute("aria-valuetext", before ?? "");

  const box = await chart.boundingBox();
  expect(box).not.toBeNull();

  if (box) {
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await expect(chart).toHaveAttribute("aria-valuetext", /downloads$/);
  }
});
