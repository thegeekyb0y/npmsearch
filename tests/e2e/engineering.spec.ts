import { expect, test } from "@playwright/test";

const REPO_URL = "https://github.com/thegeekyb0y/npmsearch";

test("engineering page explains the architecture and links the project", async ({
  page,
}) => {
  await page.goto("/how-it-works");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Fast is a design decision/,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "read the source" }),
  ).toHaveAttribute("href", REPO_URL);

  const stack = page.locator("#stack");
  await expect(stack.getByText("Next.js", { exact: true })).toBeVisible();
  await expect(
    stack.getByText("Upstash Redis", { exact: true }),
  ).toBeVisible();
  await expect(stack.getByText("Playwright", { exact: true })).toBeVisible();
  await expect(stack.getByText("Shiki", { exact: true })).toBeVisible();

  const footer = page.locator("footer");
  await expect(
    footer.getByRole("link", { name: "how it works" }),
  ).toHaveAttribute("href", "/how-it-works");
  await expect(
    footer.getByRole("link", { name: /contribute to the project/ }),
  ).toHaveAttribute("href", REPO_URL);
});
