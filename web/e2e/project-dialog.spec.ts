import { test, expect } from "@playwright/test";

async function fixture(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem("agenttm:onboarding:v1", "done");
    const state = {
      path: "C:\\Projects\\AgentTM",
      pathError: "",
      copyError: "",
      chooseError: "",
      opened: false,
      hold: false,
      checks: 0,
      copies: [] as string[],
      calls: 0,
    };
    (window as any).projectFixture = state;
    (window as any).go = {
      main: {
        Desktop: {
          ProjectPath: async () => {
            if (state.pathError) throw state.pathError;
            return state.path;
          },
          CheckSetup: async () => {
            state.checks++;
            return { state: "ready", path: "Wrong readiness path" };
          },
          CopyText: async (path: string) => {
            if (state.copyError) throw state.copyError;
            state.copies.push(path);
          },
          OpenProjectWindow: async () => {
            state.calls++;
            if (state.hold)
              await new Promise<void>((resolve) => {
                (window as any).finishProjectChoice = resolve;
              });
            if (state.chooseError) throw state.chooseError;
            return state.opened;
          },
        },
      },
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).checksBeforeProjectDialog = (
      window as any
    ).projectFixture.checks;
  });
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Your workspace", exact: true });
}

test("project identity loads without a Codex probe and copy feedback resets on reopening", async ({
  page,
}) => {
  const dialog = await fixture(page);
  await expect(dialog.locator(".project-location code")).toHaveText(
    "C:\\Projects\\AgentTM",
  );
  expect(await page.evaluate(() => (window as any).projectFixture.checks)).toBe(
    await page.evaluate(() => (window as any).checksBeforeProjectDialog),
  );
  await dialog
    .getByRole("button", { name: "Copy project path", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toHaveText("Project path copied.");
  expect(
    await page.evaluate(() => (window as any).projectFixture.copies),
  ).toEqual(["C:\\Projects\\AgentTM"]);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Project selector", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  await expect(dialog).not.toContainText("Project path copied.");
  await page.screenshot({ path: "../.test-work/project-dialog-1440.png" });
});

test("project path and clipboard errors are visible and retryable", async ({
  page,
}) => {
  const dialog = await fixture(page);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    (window as any).projectFixture.pathError = "Project location unavailable";
  });
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Project location unavailable",
  );
  await expect(
    dialog.getByRole("button", { name: "Copy project path", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).projectFixture.pathError = "";
  });
  await dialog
    .getByRole("button", { name: "Retry project path", exact: true })
    .click();
  await expect(dialog.locator(".project-location code")).toBeVisible();
  await page.evaluate(() => {
    (window as any).projectFixture.copyError = "Clipboard unavailable";
  });
  await dialog
    .getByRole("button", { name: "Copy project path", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText("Clipboard unavailable");
  await expect(dialog).not.toContainText("Project path copied.");
});

test("folder cancellation, native errors and launch requests report distinct outcomes", async ({
  page,
}) => {
  const dialog = await fixture(page);
  const choose = dialog.getByRole("button", {
    name: "Choose a Git project...",
    exact: true,
  });
  await choose.click();
  await expect(dialog.getByRole("status")).toContainText("No project selected");
  await page.evaluate(() => {
    (window as any).projectFixture.chooseError =
      "Choose an existing Git working tree";
  });
  await choose.click();
  await expect(dialog.getByRole("alert")).toContainText(
    "existing Git working tree",
  );
  await page.evaluate(() => {
    Object.assign((window as any).projectFixture, {
      chooseError: "",
      opened: true,
    });
  });
  await choose.click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByRole("status")).toContainText(
    "A new AgentTM window was requested",
  );
  expect(await page.evaluate(() => (window as any).projectFixture.calls)).toBe(
    3,
  );
});

test("pending project selection cannot be dismissed or duplicated", async ({
  page,
}) => {
  const dialog = await fixture(page);
  await page.evaluate(() => {
    (window as any).projectFixture.hold = true;
  });
  await dialog
    .getByRole("button", { name: "Choose a Git project...", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Choosing project...", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Close project selector", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.evaluate(() => (window as any).finishProjectChoice());
  await expect(dialog.getByRole("status")).toContainText("No project selected");
  expect(await page.evaluate(() => (window as any).projectFixture.calls)).toBe(
    1,
  );
});

test("small windows, long paths and browser fallback remain usable", async ({
  page,
}) => {
  const dialog = await fixture(page);
  await page.setViewportSize({ width: 760, height: 550 });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    (window as any).projectFixture.path =
      "C:\\Projects\\" + "long-project-name".repeat(8);
  });
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  await expect(dialog.locator(".project-location code")).toContainText(
    "long-project-name",
  );
  await expect(
    dialog.getByRole("button", {
      name: "Choose a Git project...",
      exact: true,
    }),
  ).toBeInViewport();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "../.test-work/project-dialog-760.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    delete (window as any).go;
  });
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  await expect(dialog).toContainText("agenttm ui");
  await expect(
    dialog.getByRole("button", {
      name: "Choose a Git project...",
      exact: true,
    }),
  ).toHaveCount(0);
});
