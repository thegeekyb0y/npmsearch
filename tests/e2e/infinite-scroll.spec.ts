import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

function pagePayload(query: string, from: number, size: number, total: number) {
  const results = Array.from(
    { length: Math.max(0, Math.min(size, total - from)) },
    (_, index) => {
      const id = from + index;
      return {
        name: `${query}-${id}`,
        version: "1.0.0",
        description: `Result ${id} for ${query}`,
        links: {
          npm: `https://www.npmjs.com/package/${query}-${id}`,
        },
        weeklyDownloads: 1000 + id,
        exact: id === 0,
      };
    },
  );

  return { total, results, from, size };
}

test("virtualized results load more pages without rendering the whole list", async ({
  page,
}) => {
  const requests: URL[] = [];

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    const from = Number(url.searchParams.get("from") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 20);
    requests.push(url);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pagePayload(query, from, size, 200)),
    });
  });

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "Search the npm registry" }),
  ).toBeVisible();

  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.fill("react");

  await expect(
    page.getByRole("link", { name: /react-0/ }).first(),
  ).toBeVisible();
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expect
    .poll(() => requests.some((url) => url.searchParams.get("from") === "20"))
    .toBe(true);

  const renderedRows = await page.locator('[role="listitem"]').count();
  expect(renderedRows).toBeLessThan(35);

  await input.fill("vue");
  await expect(
    page.locator('a[href^="/package/vue-"]').first(),
  ).toBeVisible();
  await expect(page.locator('a[href^="/package/react-"]')).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("results for vue");
  expect(requests.some((url) => url.searchParams.get("q") === "vue" && url.searchParams.get("from") === null)).toBe(true);
});

test("shows the end state when the registry has no more pages", async ({
  page,
}) => {
  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const from = Number(url.searchParams.get("from") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 20);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pagePayload("react", from, size, 25)),
    });
  });

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "Search the npm registry" }),
  ).toBeVisible();

  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.fill("react");
  await expect(
    page.getByRole("link", { name: /react-0/ }).first(),
  ).toBeVisible();
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expect(
    page.getByRole("link", { name: /react-24/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/end of results/)).toBeVisible();
});
