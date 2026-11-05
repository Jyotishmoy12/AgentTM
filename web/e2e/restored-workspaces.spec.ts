import { test, expect } from "@playwright/test";

async function ledger(page: any, request: any) {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  const items = [
    {
      id: "restore-a",
      checkpoint_id: cps[0].id,
      branch_name: "agenttm/parser-review",
      worktree_path: "C:\\recorded project\\.agenttm\\worktrees\\parser-review",
      status: "ready",
      created_at: "2026-11-05T10:00:00Z",
    },
    {
      id: "restore-b",
      checkpoint_id: cps.at(-1).id,
      branch_name: "agenttm/auth-investigation",
      worktree_path:
        "C:\\recorded project\\.agenttm\\worktrees\\auth-investigation",
      status: "failed",
      created_at: "2026-11-04T09:00:00Z",
    },
    {
      id: "restore-c",
      checkpoint_id: cps.at(-1).id,
      branch_name: "agenttm/config-check",
      worktree_path: "C:\\recorded project\\.agenttm\\worktrees\\config-check",
      status: "restoring",
      created_at: "2026-11-03T08:00:00Z",
    },
  ];
  await page.route("**/api/forks*", (route: any) =>
    route.fulfill({ json: { items, next_cursor: null } }),
  );
  return { items, cps };
}
async function native(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem("agenttm:onboarding:v1", "done");
    (window as any).restoreCalls = [];
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({ state: "ready" }),
          CopyText: async (value: string) => {
            (window as any).restoreCalls.push(["copy", value]);
          },
          CheckRestoredWorkspace: async (id: string) => {
            (window as any).restoreCalls.push(["check", id]);
            return {
              state: id === "restore-b" ? "missing" : "available",
              checked_at: "2026-11-05T12:00:00Z",
              message:
                id === "restore-b"
                  ? "The recorded folder was not found. It may have been moved or removed."
                  : "Folder is accessible. Git registration and file integrity were not re-verified.",
            };
          },
          OpenRestoredWorkspace: async (id: string) => {
            (window as any).restoreCalls.push(["open", id]);
          },
        },
      },
    };
  });
}
async function open(page: any) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Restored workspaces", exact: true })
    .click();
}

test("workspace manager searches, sorts, copies, checks, opens and inspects recorded sources", async ({
  page,
  request,
}) => {
  const { items } = await ledger(page, request);
  await native(page);
  await open(page);
  const list = page.getByRole("listbox", {
    name: "Restored workspaces",
    exact: true,
  });
  await expect(list.getByRole("option")).toHaveCount(3);
  await expect(list.getByRole("option").first()).toHaveAccessibleName(
    "Workspace parser-review",
  );
  const details = page.getByRole("complementary", {
    name: "Selected workspace details",
  });
  await expect(details).toContainText("Not checked.");
  expect(await page.evaluate(() => (window as any).restoreCalls)).toEqual([]);
  await page.getByLabel("Sort restored workspaces").selectOption("name");
  await expect(list.getByRole("option").first()).toHaveAccessibleName(
    "Workspace auth-investigation",
  );
  await page.getByLabel("Search restored workspaces").fill("parser");
  await expect(list.getByRole("option")).toHaveCount(1);
  await details.getByRole("button", { name: "Copy path", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Workspace path copied.");
  await details
    .getByRole("button", { name: "Check folder", exact: true })
    .click();
  await expect(details).toContainText("Folder accessible");
  await expect(details).toContainText("not re-verified");
  await details
    .getByRole("button", { name: "Open folder", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "File Explorer launch requested.",
  );
  expect(await page.evaluate(() => (window as any).restoreCalls)).toEqual([
    ["copy", items[0].worktree_path],
    ["check", "restore-a"],
    ["open", "restore-a"],
  ]);
  await details
    .getByRole("button", { name: "Inspect source checkpoint", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Checkpoint Explorer" }),
  ).toBeVisible();
  await expect(page.getByLabel("Select checkpoint")).toHaveValue(
    items[0].checkpoint_id,
  );
});

test("missing folders and native failures remain explicit without implying health", async ({
  page,
  request,
}) => {
  await ledger(page, request);
  await native(page);
  await open(page);
  await page
    .getByRole("option", { name: "Workspace auth-investigation", exact: true })
    .click();
  const details = page.getByRole("complementary", {
    name: "Selected workspace details",
  });
  await details
    .getByRole("button", { name: "Check folder", exact: true })
    .click();
  await expect(details).toContainText("Folder not found");
  await expect(
    details.getByRole("button", { name: "Open folder", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("option", { name: "Workspace parser-review", exact: true })
    .click();
  await expect(details).toContainText("Not checked.");
  await page.evaluate(() => {
    const bridge = (window as any).go.main.Desktop;
    bridge.OpenRestoredWorkspace = async () => {
      throw "The folder cannot be accessed.";
    };
    bridge.CopyText = async () => {
      throw "Clipboard unavailable.";
    };
  });
  await details
    .getByRole("button", { name: "Open folder", exact: true })
    .click();
  await expect(details.getByRole("alert")).toContainText("cannot be accessed");
  await details.getByRole("button", { name: "Copy path", exact: true }).click();
  await expect(details.getByRole("alert")).toContainText(
    "Clipboard unavailable",
  );
  await page.evaluate(() => {
    (window as any).go.main.Desktop.CheckRestoredWorkspace = async () => ({
      state: "inaccessible",
      checked_at: "2026-11-05T12:00:00Z",
      message: "The recorded folder cannot be read.",
    });
  });
  await details
    .getByRole("button", { name: "Check folder", exact: true })
    .click();
  await expect(details).toContainText("Folder inaccessible");
  await expect(
    details.getByRole("button", { name: "Open folder", exact: true }),
  ).toBeDisabled();
});

test("empty, error, pagination and browser-only states are useful", async ({
  page,
  request,
}) => {
  const { items } = await ledger(page, request);
  let fail = true;
  await page.route("**/api/forks*", (route) =>
    route.fulfill(
      fail
        ? {
            status: 500,
            json: { error: { message: "Could not load restored workspaces." } },
          }
        : { json: { items: [], next_cursor: null } },
    ),
  );
  await open(page);
  await expect(page.getByRole("alert")).toContainText("Could not load");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No restored workspaces yet" }),
  ).toBeVisible();
  await page.unroute("**/api/forks*");
  await page.route("**/api/forks*", (route) =>
    route.fulfill({
      json: route.request().url().includes("cursor=")
        ? { items: [items[1], items[2]], next_cursor: null }
        : { items: [items[0]], next_cursor: 100 },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh history", exact: true })
    .click();
  await expect(page.locator(".restores-row")).toHaveCount(1);
  await expect(page.locator(".restores-scope")).toContainText("loaded records");
  const details = page.getByRole("complementary", {
    name: "Selected workspace details",
  });
  await expect(
    details.getByRole("button", { name: "Open folder", exact: true }),
  ).toBeDisabled();
  await expect(details).toContainText("updated Windows desktop app");
  await page
    .getByRole("button", { name: "Load more workspaces", exact: true })
    .click();
  await expect(page.locator(".restores-row")).toHaveCount(3);
  await page
    .getByLabel("Search restored workspaces")
    .fill("no matching record");
  await expect(
    page.getByRole("heading", { name: "No matching workspaces" }),
  ).toBeVisible();
});

test("workspace details remain usable at maximized and minimum desktop sizes", async ({
  page,
  request,
}) => {
  await ledger(page, request);
  await native(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await page.screenshot({ path: "../.test-work/restored-workspaces-1440.png" });
  for (const size of [
    { width: 1240, height: 800 },
    { width: 760, height: 550 },
  ]) {
    await page.setViewportSize(size);
    await page
      .getByRole("option", { name: "Workspace parser-review", exact: true })
      .click();
    const details = page.getByRole("complementary", {
      name: "Selected workspace details",
    });
    await expect(details).toBeInViewport();
    await expect(
      details.getByRole("button", { name: "Open folder", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../.test-work/restored-workspaces-${size.width}.png`,
    });
    if (size.width === 760) {
      await details
        .getByRole("button", { name: "Copy path", exact: true })
        .click();
      await expect(details.getByRole("status")).toHaveText(
        "Workspace path copied.",
      );
      await page.keyboard.press("Escape");
      await expect(details).toHaveCount(0);
      await expect(
        page.getByRole("option", {
          name: "Workspace parser-review",
          exact: true,
        }),
      ).toBeFocused();
    }
  }
});
