import { expect, test } from "@playwright/test";

function payloadFor(query: string) {
  return {
    total: 1,
    results: [
      {
        name: query,
        version: "1.0.0",
        description: `Results for ${query}`,
        links: {
          npm: `https://www.npmjs.com/package/${encodeURIComponent(query)}`,
        },
        weeklyDownloads: 1234,
        exact: true,
      },
    ],
    from: 0,
    size: 20,
  };
}

test("instant search updates the URL and results without a full reload", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    requests.push(query);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payloadFor(query)),
    });
  });

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "Search the npm registry" }),
  ).toBeVisible();

  const input = page.getByRole("searchbox", { name: "Search npm packages" });
  await input.fill("typescript");

  await expect(page).toHaveURL(/q=typescript/);
  await expect(
    page.getByRole("link", { name: /typescript/ }).first(),
  ).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
});

test("a burst of typing is debounced to a small number of requests", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.searchParams.get("q") ?? "");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payloadFor("debounce")),
    });
  });

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "Search the npm registry" }),
  ).toBeVisible();

  const input = page.getByRole("searchbox", { name: "Search npm packages" });

  // Dispatch the whole burst in one task so machine speed cannot turn each
  // keystroke into its own leading edge.
  await input.evaluate((element) => {
    const target = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    const values = ["d", "de", "deb", "debo", "debou", "deboun", "debounc", "debounce"];

    for (const value of values) {
      setter?.call(target, value);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  await page.waitForTimeout(200);

  expect(requests.length).toBeGreaterThan(0);
  expect(requests.length).toBeLessThanOrEqual(3);
  expect(requests.at(-1)).toBe("debounce");
});

test("repeating a recent query is served from the client cache", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    requests.push(query);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payloadFor(query)),
    });
  });

  await page.goto("/search");
  await expect(
    page.getByRole("heading", { name: "Search the npm registry" }),
  ).toBeVisible();

  const input = page.getByRole("searchbox", { name: "Search npm packages" });

  await input.fill("typescript");
  await expect(
    page.getByRole("link", { name: /typescript/ }).first(),
  ).toBeVisible();

  await input.fill("react");
  await expect(page.getByRole("link", { name: /react/ }).first()).toBeVisible();

  const beforeRepeat = requests.length;
  await page.waitForTimeout(150);

  await input.fill("typescript");
  await expect(
    page.getByRole("link", { name: /typescript/ }).first(),
  ).toBeVisible();
  await page.waitForTimeout(150);

  expect(requests.length).toBe(beforeRepeat);
});
