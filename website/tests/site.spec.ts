import { test, expect } from "@playwright/test";

for (const width of [375, 768, 1024, 1440]) {
  test(`layout and showcase at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Know what happened.",
    );
    await page
      .locator(".hero-preview img")
      .evaluate(async (image: HTMLImageElement) => {
        await image.decode();
      });
    await expect(page.locator(".hero-preview img")).toHaveJSProperty(
      "naturalWidth",
      3200,
    );
    await expect(page.locator(".hero h1")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero-preview .product-frame")).toHaveCSS(
      "opacity",
      "1",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: test.info().outputPath("hero.png") });
    await page.getByRole("tab", { name: "File history & diffs" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "File history & diffs" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("tabpanel", { name: "File history & diffs" })
        .getByRole("img"),
    ).toHaveAttribute("src", /explorer-detail.png$/);
    await page.getByRole("tab", { name: "Safe restoration" }).click();
    await expect(
      page.getByRole("heading", {
        name: "A separate workspace. A fresh starting point.",
      }),
    ).toBeVisible();
    await page.locator("#features").scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("showcase.png") });
    await page.getByRole("tab", { name: "Requirements" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "Requirements" }),
    ).toContainText("Git 2.42+");
    await page.getByRole("radio", { name: "macOS", exact: true }).check();
    await expect(
      page.getByRole("link", { name: "macOS install guide" }),
    ).toHaveAttribute("href", /install\/macos\/README.md$/);
    await page.getByRole("radio", { name: "Linux", exact: true }).check();
    await expect(
      page.getByRole("link", { name: "Linux install guide" }),
    ).toHaveAttribute("href", /install\/linux\/README.md$/);
    await page.getByRole("tab", { name: "Quick start" }).click();
    await page.locator("#install").scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("installation.png") });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("keyboard tabs, mobile navigation, and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const menu = page.locator(".menu-button");
  await menu.click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Features" })
    .click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await menu.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  const timeline = page.getByRole("tab", { name: "Session timeline" });
  await timeline.focus();
  await timeline.press("ArrowRight");
  const diffs = page.getByRole("tab", { name: "File history & diffs" });
  await expect(diffs).toBeFocused();
  await expect(diffs).toHaveAttribute("aria-selected", "true");
  await diffs.press("End");
  await expect(
    page.getByRole("tab", { name: "Safe restoration" }),
  ).toBeFocused();
  const quick = page.getByRole("tab", { name: "Quick start" });
  await quick.focus();
  await quick.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Requirements" })).toBeFocused();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("copy feedback and accessible video playback controls", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("tab", { name: "Quick start", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy agenttm init", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "agenttm init",
  );
  const trigger = page.getByRole("button", {
    name: "Watch the 30-second demo",
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "AgentTM in 30 seconds" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("video")).toHaveJSProperty("controls", true);
  await expect(page.locator("video")).toHaveJSProperty("autoplay", false);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("download choices distinguish desktop from CLI and keep the matching guide in sync", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("radio", { name: "Windows", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Desktop app", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("tab", { name: "Desktop", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("link", { name: /Get AgentTM for Windows/ }),
  ).toHaveAttribute(
    "href",
    "https://github.com/Jyotishmoy12/AgentTM/releases/latest",
  );
  await expect(page.locator(".install-journey li")).toHaveCount(3);
  await page.getByRole("radio", { name: "macOS", exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Desktop app", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "CLI and browser dashboard",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("tab", { name: "Quick start", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("link", { name: /Get AgentTM for macOS/ }),
  ).toBeVisible();
  await expect(page.locator(".download-main-button")).toContainText(
    "Apple silicon & Intel",
  );
  await page.getByRole("radio", { name: "Windows", exact: true }).check();
  await page.getByRole("button", { name: "Desktop app", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Desktop", exact: true }),
  ).toContainText("WebView2");
  await page.screenshot({
    path: test.info().outputPath("download-desktop.png"),
  });
});

test("production page has no missing local resources or placeholder links", async ({
  page,
}) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (
      response.url().startsWith("http://127.0.0.1:4178") &&
      response.status() >= 400
    )
      failed.push(response.url());
  });
  await page.goto("/");
  for (const name of ["File history & diffs", "Safe restoration"])
    await page.getByRole("tab", { name }).click();
  await page.getByRole("button", { name: "Watch the 30-second demo" }).click();
  await page.locator("video").evaluate(
    (video) =>
      new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) resolve();
        else {
          video.addEventListener("loadedmetadata", () => resolve(), {
            once: true,
          });
          video.addEventListener(
            "error",
            () => reject(new Error("Video metadata failed")),
            { once: true },
          );
        }
      }),
  );
  expect(
    await page.locator("video").evaluate((video) => Math.round(video.duration)),
  ).toBe(30);
  expect(await page.locator('a[href="#"]').count()).toBe(0);
  expect(failed).toEqual([]);
});

test("global motion control stops decoration and reveals all content", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".marketing-site")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await page
    .getByRole("button", { name: "Pause animations", exact: true })
    .click();
  await expect(page.locator(".marketing-site")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".light-trail")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".reveal").last()).toHaveCSS("opacity", "1");
  await page
    .getByRole("button", { name: "Resume animations", exact: true })
    .click();
  await expect(page.locator(".marketing-site")).toHaveAttribute(
    "data-motion",
    "running",
  );
  await expect(page.locator(".light-trail")).toHaveCSS(
    "animation-name",
    "trace-light",
  );
});

test("walkthrough starts automatically, advances faster, and supports pause and manual selection", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Pause walkthrough", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".showcase-tabs")).not.toHaveClass(/is-advancing/);
  await page.locator("#features").scrollIntoViewIfNeeded();
  await expect(page.locator(".showcase-tabs")).toHaveClass(/is-advancing/);
  await page.clock.fastForward(3100);
  const diffs = page.getByRole("tab", {
    name: "File history & diffs",
    exact: true,
  });
  await expect(diffs).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Pause walkthrough", exact: true })
    .click();
  await page.clock.fastForward(6500);
  await expect(diffs).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Play walkthrough", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause animations", exact: true })
    .click();
  await expect(page.locator(".showcase-tabs")).not.toHaveClass(/is-advancing/);
  await page.clock.fastForward(6500);
  await expect(diffs).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Resume animations", exact: true })
    .click();
  await page.locator("#features").scrollIntoViewIfNeeded();
  await expect(page.locator(".showcase-tabs")).toHaveClass(/is-advancing/);
  await page.clock.fastForward(3100);
  await expect(
    page.getByRole("tab", { name: "Safe restoration", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("tab", { name: "Session timeline", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play walkthrough", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(6500);
  await expect(
    page.getByRole("tab", { name: "Session timeline", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("system reduced motion disables automatic motion and keeps the feature grid readable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "System reduced motion enabled" }),
  ).toBeDisabled();
  await expect(page.locator(".marketing-site")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".reveal").last()).toHaveCSS("opacity", "1");
  await page.locator(".feature-grid").scrollIntoViewIfNeeded();
  await expect(page.locator(".feature-card")).toHaveCount(6);
  await expect(page.locator(".mini-terminal")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".data-packet")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.locator(".feature-grid").screenshot({
    path: test.info().outputPath("feature-grid.png"),
    animations: "disabled",
  });
});

test("focused captures can be enlarged without leaving the page or losing keyboard focus", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of [
    "Session timeline",
    "File history & diffs",
    "Safe restoration",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    const enlarge = page.getByRole("button", {
      name: "Enlarge capture",
      exact: true,
    });
    await enlarge.click();
    const dialog = page.getByRole("dialog", {
      name: "Enlarged AgentTM capture",
    });
    await expect(dialog).toBeVisible();
    const image = dialog.getByRole("img");
    await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode();
    });
    expect(
      await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(1000);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(enlarge).toBeFocused();
  }
  await expect(page.locator(".focus-shot-restore img")).toHaveAttribute(
    "src",
    /workspaces-detail.png$/,
  );
});

test("feature navigation leaves a compact header offset and brings the product into view", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Features", exact: true })
    .click();
  const section = await page.locator("#features").boundingBox();
  const header = await page.locator(".site-header").boundingBox();
  const viewer = await page
    .locator(".focus-panel-stack > .is-active .focus-viewer")
    .boundingBox();
  expect(section!.y).toBeGreaterThanOrEqual(header!.height);
  expect(section!.y).toBeLessThan(header!.height + 25);
  expect(viewer!.y).toBeLessThan(230);
  expect(viewer!.y + viewer!.height).toBeLessThan(900);
});

test("Git comparison is accurate, linked and usable on mobile", async ({
  page,
}) => {
  await page.goto("/");
  const comparison = page.getByRole("region", {
    name: "Git and AgentTM feature comparison",
    exact: true,
  });
  await page
    .getByRole("link", { name: "Compare with Git", exact: true })
    .click();
  await expect(comparison).toBeVisible();
  await expect(comparison.getByRole("row")).toHaveCount(8);
  await expect(comparison).toContainText("Set up with git worktree");
  await expect(comparison).toContainText(
    "Save manually, for example with stash",
  );
  await expect(page.locator(".comparison-notes")).toContainText(
    "exact action-to-line attribution is not available",
  );
  await expect(page.locator(".comparison-notes")).toContainText(
    "published releases may differ",
  );
  await page
    .locator("#compare")
    .screenshot({ path: test.info().outputPath("comparison-desktop.png") });
  await page.setViewportSize({ width: 375, height: 812 });
  await comparison.focus();
  await expect(comparison).toBeFocused();
  await comparison.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });
  expect(await comparison.evaluate((node) => node.scrollLeft)).toBeGreaterThan(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#compare")
    .screenshot({ path: test.info().outputPath("comparison-mobile.png") });
});

test("website uses current desktop captures and labels the older workflow video", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".hero-preview img")).toHaveAttribute(
    "src",
    /history.png$/,
  );
  await expect(page.locator(".preview-caption")).toContainText(
    "Current desktop source build",
  );
  for (const [tab, file] of [
    ["Session timeline", "history-detail.png"],
    ["File history & diffs", "explorer-detail.png"],
    ["Safe restoration", "workspaces-detail.png"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    const image = page
      .getByRole("tabpanel", { name: tab, exact: true })
      .getByRole("img");
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(file.replaceAll(".", "\\.") + "$"),
    );
    await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode();
    });
    await expect(image).toHaveJSProperty("naturalWidth", 2740);
    await expect(image).toHaveJSProperty("naturalHeight", 1854);
    const box = await image.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(100);
    await page
      .locator("#features")
      .screenshot({ path: test.info().outputPath(file) });
  }
  await page
    .getByRole("button", { name: "Watch the 30-second demo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "AgentTM in 30 seconds" }),
  ).toContainText("Earlier-interface workflow demo");
});

test("muted product palette and edge-to-edge screenshots preserve the layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim(),
    ),
  ).toBe("#70cc8c");
  const surface = await page
    .locator(".hero")
    .evaluate((node) =>
      getComputedStyle(node)
        .backgroundColor.match(/\d+/g)!
        .slice(0, 3)
        .map(Number),
    );
  expect(Math.max(...surface) - Math.min(...surface)).toBeLessThanOrEqual(8);
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of [
      "Session timeline",
      "File history & diffs",
      "Safe restoration",
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel", { name, exact: true });
      const image = panel.getByRole("img");
      await image.evaluate(async (node: HTMLImageElement) => node.decode());
      await expect(image).toHaveCSS("object-fit", "cover");
      const bounds = await image.evaluate((node) => {
        const image = node.getBoundingClientRect();
        const frame = node.parentElement!.getBoundingClientRect();
        return {
          left: Math.abs(image.left - frame.left),
          top: Math.abs(image.top - frame.top),
          width: Math.abs(image.width - frame.width),
          height: Math.abs(image.height - frame.height),
        };
      });
      for (const difference of Object.values(bounds))
        expect(difference).toBeLessThan(1);
    }
    await page
      .getByRole("tab", { name: "Session timeline", exact: true })
      .click();
    await page
      .locator(".focus-shot-timeline img")
      .evaluate(async (node: HTMLImageElement) => node.decode());
    await page.locator("#features").screenshot({
      path: test.info().outputPath(`muted-showcase-${width}.png`),
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .locator(".hero-preview img")
    .evaluate(async (node: HTMLImageElement) => node.decode());
  await page.screenshot({
    path: test.info().outputPath("muted-hero.png"),
    animations: "disabled",
  });
});

test("walkthrough crossfades screens without exposing inactive controls or shifting the frame", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("tab", { name: "Session timeline", exact: true })
    .click();
  const first = page.locator("#panel-timeline");
  const next = page.locator("#panel-diffs");
  await expect(first).toHaveCSS("opacity", "1");
  const before = await page.locator(".focus-panel-stack").boundingBox();
  await page
    .getByRole("tab", { name: "File history & diffs", exact: true })
    .click();
  await expect(first).toHaveAttribute("aria-hidden", "true");
  await expect(first).toHaveAttribute("inert", "");
  await expect(
    page.locator(".focus-panel-stack").getByRole("tabpanel"),
  ).toHaveCount(1);
  await expect(next).toHaveCSS("transition-duration", "0.55s, 0s");
  expect(
    await next.evaluate((node) =>
      node
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    ),
  ).toBe(true);
  await expect(next).toHaveCSS("opacity", "1");
  await expect(first).toHaveCSS("opacity", "0");
  const after = await page.locator(".focus-panel-stack").boundingBox();
  expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("tab", { name: "Safe restoration", exact: true })
    .click();
  await expect(page.locator("#panel-restore")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.locator("#panel-restore")).toHaveCSS("opacity", "1");
});

test("website icons share a green tone with contrast on green buttons", async ({
  page,
}) => {
  await page.goto("/");
  const colors = await page
    .locator("svg.icon, svg.platform-mark, .capture-expand > svg")
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        getComputedStyle(node).color.match(/\d+/g)!.slice(0, 3).map(Number),
      ),
    );
  expect(colors.length).toBeGreaterThan(25);
  for (const [r, g, b] of colors) {
    expect(g).toBeGreaterThan(r + 10);
    expect(g).toBeGreaterThan(b + 3);
  }
  await expect(
    page.locator(".hero .hero-actions .button:not(.button-secondary) .icon"),
  ).toHaveCSS("color", "rgb(12, 59, 34)");
  await expect(page.locator(".github-link .icon")).toHaveCSS(
    "color",
    "rgb(138, 203, 156)",
  );
});
