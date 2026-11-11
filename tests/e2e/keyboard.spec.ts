import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function pagePayload(query: string, from: number, size: number, total: number) {
  const results = Array.from(
    { length: Math.max(0, Math.min(size, total - from)) },
    (_, index) => {
      const id = from + index;
      return {
        name: `${query}-${id}`,
        version: "1.0.0",
        description: `Result ${id} for ${query}`,
        links: { npm: `https://www.npmjs.com/package/${query}-${id}` },
        weeklyDownloads: 1000 + id,
        exact: id === 0,
      };
    },
  );

  return { total, results, from, size };
}

async function activeText(page: Page) {
  return page.evaluate(() =>
    document.activeElement instanceof HTMLAnchorElement
      ? (document.activeElement.textContent ?? "")
      : "",
  );
}

test("slash focuses the global search", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await page.keyboard.press("/");
  await expect(input).toBeFocused();

  await page.goto("/package/react");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 45_000,
  });
  await page.keyboard.press("/");
  await expect(input).toBeFocused();
});

test("slash still types inside an input", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.focus();
  await page.keyboard.type("a/b");
  await expect(input).toHaveValue("a/b");
});

test("command palette opens, closes and restores focus", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.focus();

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "jump to" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Search commands and packages" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "jump to" })).not.toBeVisible();
  await expect(input).toBeFocused();
});

test("command palette searches and navigates", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");

  const paletteInput = page.getByRole("combobox", {
    name: "Search commands and packages",
  });
  await paletteInput.fill("react");
  await expect(paletteInput).toBeFocused();
  await expect(
    page.getByRole("option", { name: /Search for "react"/ }),
  ).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/search\?q=react/);
});

test("palette trigger opens the dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open command palette" }).click();
  await expect(page.getByRole("dialog", { name: "jump to" })).toBeVisible();
});

test("arrow keys move through virtualized results", async ({ page }) => {
  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    const from = Number(url.searchParams.get("from") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 20);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pagePayload(query, from, size, 20)),
    });
  });

  await page.goto("/search");
  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.fill("kb");
  await expect(page.locator('[role="listitem"] a').first()).toBeVisible();

  await input.focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => activeText(page)).toContain("kb-0");

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => activeText(page)).toContain("kb-1");

  await page.keyboard.press("End");
  await expect.poll(() => activeText(page)).toContain("kb-19");

  await page.keyboard.press("Home");
  await expect.poll(() => activeText(page)).toContain("kb-0");

  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => activeText(page)).toContain("kb-0");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/package\/kb-0/, { timeout: 20_000 });
});

test("palette has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "jump to" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    serious.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
