import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const welcome = readFileSync(
  new URL("../../internal/desktop/welcome.html", import.meta.url),
  "utf8",
);
const launcher = readFileSync(
  new URL("../../internal/desktop/launcher.js", import.meta.url),
  "utf8",
);

test("overview uses balanced available width and sidebar starts with project and search", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  const sidebar = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  const locations = await Promise.all(
    [
      sidebar.getByRole("button", { name: "Project selector", exact: true }),
      sidebar.getByRole("button", { name: "Search anything" }),
      sidebar.getByRole("button", { name: "Overview", exact: true }),
      sidebar.getByRole("button", { name: "Chat with Codex", exact: true }),
      sidebar.getByRole("button", { name: "History", exact: true }),
    ].map((node) => node.boundingBox()),
  );
  for (let i = 1; i < locations.length; i++)
    expect(locations[i]!.y).toBeGreaterThan(locations[i - 1]!.y);
  for (const collapsed of [false, true]) {
    if (collapsed)
      await page
        .getByRole("button", { name: "Collapse sidebar", exact: true })
        .click();
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      const gutters = await page
        .locator(".home-session-grid")
        .evaluate((node) => {
          const grid = node.getBoundingClientRect();
          const container = node.parentElement!.getBoundingClientRect();
          return {
            left: grid.left - container.left,
            right: container.right - grid.right,
            width: grid.width,
          };
        });
      expect(Math.abs(gutters.left - gutters.right)).toBeLessThan(18); // Includes the reserved vertical scrollbar gutter.
      expect(gutters.width).toBeGreaterThan(1000);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `../.test-work/overview-distributed-${size.width}-${collapsed ? "rail" : "sidebar"}.png`,
      });
    }
  }
});

test("command palette keeps search, results and footer visible at desktop sizes", async ({
  page,
}) => {
  await page.goto("/");
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 760, height: 550 },
  ]) {
    await page.setViewportSize(size);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", {
      name: "Search commands and sessions",
    });
    await expect(dialog.getByRole("combobox")).toBeFocused();
    await expect(dialog.locator(".command-footer")).toBeInViewport();
    await expect(dialog.getByRole("option").first()).toBeInViewport();
    await dialog.getByRole("combobox").fill("Storage & backups");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await dialog.getByRole("combobox").fill("");
    await page.screenshot({
      path: `../.test-work/command-editorial-${size.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  }
});

test("first-launch welcome matches desktop styling and preserves cancellation and retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).welcomeFixture = { error: "", calls: 0 };
    (window as any).go = {
      main: {
        Desktop: {
          ChooseProject: async () => {
            const state = (window as any).welcomeFixture;
            state.calls++;
            if (state.error) throw new Error(state.error);
            return false;
          },
        },
      },
    };
  });
  await page.route("**/welcome-preview", (route) =>
    route.fulfill({ contentType: "text/html", body: welcome }),
  );
  await page.route("**/launcher.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: launcher }),
  );
  await page.goto("/welcome-preview");
  const button = page.getByRole("button", {
    name: "Open a Git project",
    exact: true,
  });
  await expect(
    page.getByRole("heading", { name: "Open your workspace." }),
  ).toBeVisible();
  for (const size of [
    { width: 1240, height: 800 },
    { width: 760, height: 550 },
  ]) {
    await page.setViewportSize(size);
    await expect(button).toBeInViewport();
    await expect(page.locator(".hint")).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.test-work/welcome-editorial-${size.width}.png`,
    });
  }
  await button.click();
  await expect(page.getByRole("status")).toContainText("No project opened");
  await page.evaluate(() => {
    (window as any).welcomeFixture.error =
      "Choose an existing Git working tree";
  });
  await button.click();
  await expect(page.getByRole("status")).toContainText(
    "existing Git working tree",
  );
  await expect(button).toBeEnabled();
  expect(await page.evaluate(() => (window as any).welcomeFixture.calls)).toBe(
    2,
  );
});
