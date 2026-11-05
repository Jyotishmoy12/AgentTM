import { test, expect } from "@playwright/test";

test("mobile docs sidebar closes with controls, Escape, and backdrop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/docs.html");
  const open = page.getByRole("button", {
    name: "Open documentation navigation",
  });
  const drawer = page.getByRole("dialog", {
    name: "Documentation",
    exact: true,
  });
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await open.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("searchbox")).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.screenshot({ path: test.info().outputPath("mobile-sidebar.png") });
  await drawer
    .getByRole("button", { name: "Close documentation navigation" })
    .click();
  await expect(drawer).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await open.click();
  await page.mouse.click(365, 400);
  await expect(drawer).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("mobile sidebar searches and selects a guide, and resets on desktop resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/docs.html");
  const open = page.getByRole("button", {
    name: "Open documentation navigation",
  });
  const drawer = page.getByRole("dialog", {
    name: "Documentation",
    exact: true,
  });
  await open.click();
  await drawer.getByRole("searchbox").fill("no matching words");
  await expect(drawer.getByRole("status")).toContainText("No matching guides");
  await drawer.getByRole("searchbox").fill("Install the desktop");
  await drawer
    .getByRole("link", { name: "Install the desktop app", exact: true })
    .click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/#desktop-install$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Install the desktop app",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await open.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(drawer).not.toBeVisible();
  await expect(open).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".docs-guide-sidebar")).toBeVisible();
});

test("CLI instructions require a platform and an actual matching Unix filename", async ({
  page,
}) => {
  await page.goto("/docs.html#cli-install");
  const main = page.getByRole("main");
  await expect(main.locator(".code-block")).toHaveCount(0);
  await page.getByRole("button", { name: "macOS", exact: true }).click();
  const filename = page.getByLabel(
    "Enter the exact archive filename shown by ls",
  );
  await filename.fill("agenttm_VERSION_darwin_arm64.tar.gz");
  await expect(
    main.locator("pre").filter({ hasText: "sh install.sh" }),
  ).toHaveCount(0);
  await filename.fill("agenttm_0.3.4_darwin_arm64.tar.gz");
  await expect(
    main.locator("pre").filter({ hasText: "sh install.sh" }),
  ).toContainText("sh install.sh 'agenttm_0.3.4_darwin_arm64.tar.gz'");
  await page.getByRole("button", { name: "Linux", exact: true }).click();
  await expect(filename).toHaveValue("");
  await filename.fill("agenttm_0.3.4_linux_amd64.tar.gz");
  await expect(
    main.locator("pre").filter({ hasText: "sh install.sh" }),
  ).toHaveCount(1);
});

for (const width of [375, 768, 1440]) {
  test(`docs guides fit ${width}px and deep links reload`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const topic of [
      "start",
      "desktop-install",
      "desktop-record",
      "desktop-storage",
      "cli-record",
      "cli-commands",
      "history",
      "restore",
      "privacy",
      "troubleshooting",
    ]) {
      await page.goto(`/docs.html#${topic}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("docs.png") });
  });
}
