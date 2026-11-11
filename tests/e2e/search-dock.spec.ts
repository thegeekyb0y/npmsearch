import { expect, test } from "@playwright/test";

test.describe("search dock", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("home aligns the dock with the headline and moves it into the header", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "search the registry." }),
    ).toBeVisible();

    const input = page.getByRole("searchbox", { name: "Search npm packages" });
    await expect(input).toHaveCount(1);

    const form = page.locator('header form[role="search"]');
    const headline = page.getByRole("heading", { name: "search the registry." });

    await expect
      .poll(async () => (await form.boundingBox())?.y ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(200);

    const formBox = await form.boundingBox();
    const headlineBox = await headline.boundingBox();
    expect(Math.abs((formBox?.x ?? 0) - (headlineBox?.x ?? 0))).toBeLessThan(2);

    await input.fill("react");
    await input.press("Enter");

    await expect(page).toHaveURL(/q=react/);
    await expect(form).toHaveAttribute("data-snap", "false");
    expect(
      await form.evaluate((element) => getComputedStyle(element).transitionDuration),
    ).toBe("0.38s");

    await expect
      .poll(async () => (await form.boundingBox())?.y ?? 999, { timeout: 5_000 })
      .toBeLessThan(100);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 45_000,
    });
    await expect(input).toBeFocused();
  });

  test("scrolling home moves the dock with the page and never overlaps popular", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto("/");

    const form = page.locator('header form[role="search"]');
    const popular = page.locator('section[aria-labelledby="popular-heading"]');
    await expect
      .poll(async () => (await form.boundingBox())?.y ?? 0, { timeout: 5_000 })
      .toBeGreaterThan(100);

    const before = {
      form: await form.boundingBox(),
      popular: await popular.boundingBox(),
    };

    await page.evaluate(() => window.scrollTo(0, 150));
    await page.waitForTimeout(200);

    const after = {
      form: await form.boundingBox(),
      popular: await popular.boundingBox(),
    };

    expect((after.form?.y ?? 0) - (before.form?.y ?? 0)).toBeLessThan(-50);
    expect((after.form?.y ?? 0) + (after.form?.height ?? 0)).toBeLessThanOrEqual(
      (after.popular?.y ?? 0) + 1,
    );
  });

  test("clicking a popular package snaps the dock into place", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "search the registry." }),
    ).toBeVisible();

    const form = page.locator('header form[role="search"]');
    await page.getByRole("link", { name: "react", exact: true }).click();

    await page.waitForURL(/package\/react/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(await form.getAttribute("data-home")).toBe("false");
    expect(await form.getAttribute("data-snap")).toBe("true");
    expect(
      await form.evaluate((element) => getComputedStyle(element).transitionDuration),
    ).toBe("0s");
    expect((await form.boundingBox())?.y ?? 999).toBeLessThan(100);
  });

  test("search and package headers stay sticky", async ({ page }) => {
    await page.goto("/search?q=react");
    await expect(page.locator(".site-header")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(200);

    const header = await page.locator(".site-header").boundingBox();
    expect(header?.y).toBe(0);
  });

  test("mobile keeps the dock in the header", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");

    const form = page.locator('header form[role="search"]');
    const box = await form.boundingBox();
    expect(box?.y ?? 999).toBeLessThan(100);
  });
});
