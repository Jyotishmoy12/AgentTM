import { test, expect } from "@playwright/test";

test("command menu searches loaded sessions, supports keyboard navigation, and restores focus", async ({
  page,
  request,
}) => {
  const { items } = await (await request.get("/api/sessions")).json();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open command menu", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Search commands and sessions",
  });
  const search = dialog.getByRole("combobox");
  await expect(search).toBeFocused();
  await page.screenshot({ path: "../.test-work/desktop-refresh-commands.png" });
  await search.fill(items[0].id.slice(0, 8));
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await search.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The story of this session.",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await search.fill("no-matching-command-here");
  await expect(dialog.getByRole("status")).toHaveText(
    "No matching commands or loaded sessions.",
  );
  await search.fill("");
  await search.press("ArrowDown");
  await expect(dialog.getByRole("option", { selected: true })).toContainText(
    "Chat with Codex",
  );
  await search.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open command menu", exact: true }),
  ).toBeFocused();
});

test("sidebar and file divider respond to keyboard and pointer input", async ({
  page,
}) => {
  await page.goto("/");
  const wide = (await page.locator(".app-sidebar").boundingBox())!.width;
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  expect(
    (await page.locator(".app-sidebar").boundingBox())!.width,
  ).toBeLessThan(wide / 2);
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Inspect checkpoint / })
    .first()
    .click();
  const separator = page.getByRole("separator", { name: "Resize file panel" });
  await expect(separator).toBeVisible();
  await separator.focus();
  await separator.press("Home");
  await expect(separator).toHaveAttribute("aria-valuenow", "120");
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "136");
  const before = (await page.locator(".file-tree").boundingBox())!.width;
  const handle = (await separator.boundingBox())!;
  await page.mouse.move(handle.x + 2, handle.y + 30);
  await page.mouse.down();
  await page.mouse.move(handle.x + 90, handle.y + 30);
  await page.mouse.up();
  expect(
    (await page.locator(".file-tree").boundingBox())!.width,
  ).toBeGreaterThan(before + 50);
});

for (const size of [
  { width: 1240, height: 800 },
  { width: 1100, height: 740 },
  { width: 760, height: 550 },
]) {
  test(`desktop chat preserves usable conversation space at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.addInitScript(() => {
      localStorage.setItem("agenttm:onboarding:v1", "done");
      (window as any).go = {
        main: {
          Desktop: {
            CheckSetup: async () => ({ state: "ready" }),
            ChatStatus: async () => ({
              running: false,
              session_id: "",
              approvals: [],
              draft: "",
              error: "",
            }),
            StartChat: async () => "",
            CodexModels: async () => [
              {
                model: "fixture-model",
                displayName: "Test model",
                isDefault: true,
              },
            ],
          },
        },
      };
    });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Chat with Codex", exact: true })
      .click();
    await expect(page.getByLabel("Chat model", { exact: true })).toHaveValue(
      "fixture-model",
    );
    const transcript = await page.locator(".chat-transcript").boundingBox();
    expect(transcript!.height).toBeGreaterThan(
      size.height > 600 ? size.height * 0.5 : 200,
    );
    await expect(
      page.getByLabel("Your message", { exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.test-work/desktop-refresh-chat-${size.width}.png`,
    });
  });
}

test("sidebar button tracks compact layout and explicit choices survive navigation and resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 550 });
  await page.goto("/");
  const sidebar = page.locator(".app-sidebar");
  const label = sidebar
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "History", exact: true })
    .locator("strong");
  const expand = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await expect(expand).toBeVisible();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect((await sidebar.boundingBox())!.width).toBe(60);
  await expect(label).not.toBeVisible();
  await expand.click();
  const collapse = page.getByRole("button", {
    name: "Collapse sidebar",
    exact: true,
  });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  expect((await sidebar.boundingBox())!.width).toBe(210);
  await expect(label).toBeVisible();
  await sidebar.getByRole("button", { name: "History", exact: true }).click();
  await expect(collapse).toBeVisible();
  expect((await sidebar.boundingBox())!.width).toBe(210);
  await page.keyboard.press("Control+b");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  expect((await sidebar.boundingBox())!.width).toBe(60);
  await page.setViewportSize({ width: 1240, height: 800 });
  await expect(expand).toBeVisible();
  expect((await sidebar.boundingBox())!.width).toBe(60);
  await expand.click();
  await expect(label).toBeVisible();
  expect((await sidebar.boundingBox())!.width).toBe(210);
  await expect(collapse).toHaveAttribute("aria-controls", "app-sidebar");
});
