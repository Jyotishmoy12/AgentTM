import { test, expect } from "@playwright/test";

test("collapsed sidebar uses consistent keyboard and pointer tooltips", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  for (const name of [
    "Project selector",
    "Search anything",
    "Overview",
    "Chat with Codex",
    "History",
    "Restored workspaces",
    "Storage & backups",
    "Settings",
  ]) {
    const button = page
      .locator(".app-sidebar")
      .getByRole("button", { name, exact: true });
    await button.focus();
    const hint = page.getByRole("tooltip");
    await expect(hint).toBeVisible();
    await expect(hint).toBeInViewport();
    if (name !== "Project selector") await expect(hint).toContainText(name);
    await expect(button).toHaveAttribute(
      "aria-describedby",
      (await hint.getAttribute("id")) as string,
    );
    await page.keyboard.press("Escape");
    await expect(hint).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Refresh history", exact: true })
    .focus();
  await page.getByRole("button", { name: "History", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toContainText("History");
  await page.screenshot({ path: "../.test-work/sidebar-tooltip-polish.png" });
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("card rename remains an independent action with an accessible close control", async ({
  page,
}) => {
  await page.goto("/");
  const tile = page.locator(".home-session-tile").first();
  await tile.locator(".home-session-card").hover();
  await expect(tile.locator(".home-view-session")).toBeVisible();
  const rename = tile.getByRole("button", { name: /^Rename session/ });
  await rename.focus();
  expect(
    await rename.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Name this session",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Session name", exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole("button", { name: "Close session name dialog", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
});

test("utility page typography and gutters agree at desktop widths", async ({
  page,
}) => {
  await page.goto("/");
  const headings = [];
  for (const name of [
    "Overview",
    "Restored workspaces",
    "Storage & backups",
    "Settings",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name, exact: true })
      .click();
    const heading = page.getByRole("heading", { name, exact: true });
    await expect(heading).toBeVisible();
    headings.push(
      await heading.evaluate((node) => ({
        size: getComputedStyle(node).fontSize,
        line: getComputedStyle(node).lineHeight,
      })),
    );
  }
  expect(new Set(headings.map((heading) => heading.size)).size).toBe(1);
  expect(new Set(headings.map((heading) => heading.line)).size).toBe(1);
});
