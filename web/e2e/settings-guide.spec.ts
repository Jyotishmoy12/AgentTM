import { test, expect } from "@playwright/test";
async function desktop(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem("agenttm:onboarding:v1", "done");
    const fixture: any = {
      state: "ready",
      error: "",
      git: "available",
      repo: "valid",
      copies: [],
      checks: 0,
    };
    (window as any).settingsFixture = fixture;
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => {
            fixture.checks++;
            if (fixture.error) throw fixture.error;
            return {
              state: fixture.state,
              version: fixture.state === "missing" ? "" : "codex-cli test",
              project: "Recorded project",
              path: "C:\\projects\\recorded",
              environment: {
                git_state: fixture.git,
                git_version:
                  fixture.git === "available" ? "git version 2.54.0" : "",
                repository_state: fixture.repo,
              },
            };
          },
          CopyText: async (text: string) => fixture.copies.push(text),
          OpenCodexDocs: async () => {},
        },
      },
    };
  });
}
async function settings(page: any) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
}

test("settings shows supported read-only configuration and verified independent diagnostics", async ({
  page,
  request,
}) => {
  await desktop(page);
  await settings(page);
  const health = await (await request.get("/api/health")).json();
  await expect(
    page.locator("[data-diagnostic=codex] .settings-status"),
  ).toHaveText("Ready");
  await expect(
    page.locator("[data-diagnostic=git] .settings-status"),
  ).toHaveText("Available");
  await expect(
    page.locator("[data-diagnostic=repository] .settings-status"),
  ).toHaveText("Verified");
  await expect(
    page.locator("[data-diagnostic=history] .settings-status"),
  ).toHaveText("Readable");
  await expect(
    page.getByRole("region", { name: "Application settings" }),
  ).toContainText(health.version);
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "How the pieces fit together" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "../.test-work/settings-editorial-1440.png" });
  await page
    .getByRole("button", { name: "Open setup guide", exact: true })
    .click();
  const guide = page.getByRole("dialog");
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: /History basics/ }).click();
  await expect(
    guide.getByRole("heading", { name: "History basics", exact: true }),
  ).toBeVisible();
  await expect(guide).toContainText("not a Git commit or an atomic snapshot");
  await guide
    .locator(".setup-command")
    .filter({ hasText: "agenttm doctor" })
    .getByRole("button", { name: "Copy", exact: true })
    .click();
  expect(
    await page.evaluate(() => (window as any).settingsFixture.copies),
  ).toContain("agenttm doctor");
  await guide.getByRole("button", { name: /Capture & limits/ }).click();
  await expect(guide).toContainText("Scans are not atomic");
  await guide.getByRole("button", { name: /Restore safely/ }).click();
  await expect(guide).toContainText("index, and HEAD stay unchanged");
  await expect(guide).toContainText("does not rewind");
  await page.screenshot({ path: "../.test-work/setup-guide-reference.png" });
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open setup guide", exact: true }),
  ).toBeFocused();
});

test("missing, incompatible, sign-in and failed native diagnostics never show false readiness", async ({
  page,
}) => {
  await desktop(page);
  await settings(page);
  await expect(
    page.locator("[data-diagnostic=codex] .settings-status"),
  ).toHaveText("Ready");
  for (const [state, label, heading] of [
    ["missing", "Not found", "Install Codex"],
    ["incompatible", "Compatibility check failed", "Install Codex"],
    ["login_required", "Sign-in not confirmed", "Sign in & verify"],
  ]) {
    await page.evaluate(
      (value) => ((window as any).settingsFixture.state = value),
      state,
    );
    await page
      .getByRole("button", { name: "Check again", exact: true })
      .click();
    await expect(
      page.locator("[data-diagnostic=codex] .settings-status"),
    ).toHaveText(label);
    await page
      .locator("[data-diagnostic=codex]")
      .getByRole("button", { name: "Setup help", exact: true })
      .click();
    const guide = page.getByRole("dialog");
    await expect(
      guide.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await guide
      .getByRole("button", { name: "Close setup guide", exact: true })
      .click();
  }
  await page.evaluate(() => {
    (window as any).settingsFixture.error =
      "Native diagnostic could not start.";
  });
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Native diagnostic could not start",
  );
  await expect(
    page.locator("[data-diagnostic=codex] .settings-status"),
  ).toHaveText("Not verified");
  await expect(
    page.locator("[data-diagnostic=git] .settings-status"),
  ).toHaveText("Not verified");
  await expect(
    page.locator("[data-diagnostic=history] .settings-status"),
  ).toHaveText("Readable");
});

test("repository, Git, history-read failures and browser fallback stay independently truthful", async ({
  page,
}) => {
  await desktop(page);
  await settings(page);
  await expect(
    page.locator("[data-diagnostic=codex] .settings-status"),
  ).toHaveText("Ready");
  await page.evaluate(() => {
    (window as any).settingsFixture.git = "missing";
    (window as any).settingsFixture.repo = "unchecked";
  });
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(
    page.locator("[data-diagnostic=git] .settings-status"),
  ).toHaveText("Not found");
  await expect(
    page.locator("[data-diagnostic=repository] .settings-status"),
  ).toHaveText("Not checked");
  await page.evaluate(() => {
    (window as any).settingsFixture.git = "available";
    (window as any).settingsFixture.repo = "invalid";
  });
  await page.route("**/api/sessions?limit=1", (route) =>
    route.fulfill({
      status: 500,
      json: { error: { message: "History database cannot be read." } },
    }),
  );
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(
    page.locator("[data-diagnostic=repository] .settings-status"),
  ).toHaveText("Not verified");
  await expect(page.locator("[data-diagnostic=history]")).toContainText(
    "History database cannot be read",
  );
  await page.evaluate(() => {
    delete (window as any).go;
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.locator("[data-diagnostic=codex] .settings-status"),
  ).toHaveText("Not verified");
  await expect(
    page.locator("[data-diagnostic=git] .settings-status"),
  ).toHaveText("Not verified");
  await page
    .getByRole("button", { name: "Open setup guide", exact: true })
    .click();
  const guide = page.getByRole("dialog");
  await guide.getByRole("button", { name: /Sign in & verify/ }).click();
  await expect(guide).toContainText("agenttm codex doctor");
});

test("compact settings and reference guide remain usable at the minimum desktop size", async ({
  page,
}) => {
  await desktop(page);
  await page.setViewportSize({ width: 760, height: 550 });
  await settings(page);
  await expect(
    page.getByRole("button", { name: "Check again", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../.test-work/settings-editorial-760.png" });
  await page
    .getByRole("button", { name: "Open setup guide", exact: true })
    .click();
  const guide = page.getByRole("dialog");
  await guide.getByRole("button", { name: /Capture & limits/ }).click();
  await expect(
    guide.getByRole("button", { name: "Done reading", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../.test-work/setup-guide-760.png" });
  await guide
    .getByRole("button", { name: "Done reading", exact: true })
    .click();
  await expect(guide).toHaveCount(0);
});
