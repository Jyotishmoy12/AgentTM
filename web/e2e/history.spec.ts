import { test, expect } from "@playwright/test";

test("History opens a separate read-only explorer with optional details and parent comparisons", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  const latest = cps.at(-1);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "History", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Visual History", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Historical file tree" }),
  ).toHaveCount(0);
  await expect(page.locator(".milestone")).toHaveCount(cps.length);
  await page.screenshot({ path: "../.test-work/history-editorial-1440.png" });
  await page
    .getByRole("button", {
      name: "Inspect checkpoint " + latest.id.slice(0, 8),
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Checkpoint Explorer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Checkpoint details" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "example.txt", exact: true }).click();
  await expect(page.locator(".editor-panel .view-lines")).toContainText(
    "Changed workspace text",
  );
  await page.getByRole("tab", { name: "Changes", exact: true }).click();
  await expect(page.locator(".monaco-diff-editor")).toBeVisible();
  await page.getByRole("button", { name: "Split", exact: true }).click();
  await expect(
    page.locator(".monaco-diff-editor .original .view-lines"),
  ).toContainText("Baseline workspace text");
  await page
    .getByRole("button", { name: "Show checkpoint details", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Checkpoint details" }),
  ).toContainText("does not rewind");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Show checkpoint details", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: "../.test-work/explorer-editorial-1440.png" });
  await page.getByRole("button", { name: "← History", exact: true }).click();
  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("partial captures, omissions, missing objects and filtering are truthful", async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  await page.route("**/api/checkpoints/*/file?*", (route) =>
    route.fulfill({
      status: 500,
      json: {
        error: {
          code: "object_unavailable",
          message:
            "Historical object is missing or corrupt. Run agenttm doctor.",
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await page.getByLabel("Filter history status").selectOption("partial");
  await expect(page.locator(".milestone")).toHaveCount(
    cps.filter((cp: any) => cp.partial).length,
  );
  await page
    .getByRole("button", { name: /^Inspect checkpoint / })
    .first()
    .click();
  await expect(page.locator(".partial-notice")).toContainText(
    "Partial snapshot",
  );
  await page.getByText("View omissions", { exact: true }).click();
  await expect(page.locator(".partial-notice")).toContainText(".env");
  await expect(page.getByRole("alert")).toContainText(
    "Historical object is missing or corrupt",
  );
  await expect(page.getByRole("button", { name: "Retry file" })).toBeVisible();
});

test("long histories use real time bins and bounded rows without inferring states", async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: original } = await (
    await request.get(`/api/sessions/${sessions[0].id}/events`)
  ).json();
  const events = Array.from({ length: 3000 }, (_, i) => ({
    ...original[0],
    id: "long-" + i,
    sequence: i + 1,
    checkpoint_id: "",
    received_at: new Date(
      Date.UTC(2026, 10, 5, 12, 0, i < 1500 ? 0 : 1200),
    ).toISOString(),
    kind: "item.started",
    payload: { item: { command: "fixture " + i } },
  }));
  await page.route(`**/api/sessions/${sessions[0].id}/events*`, (route) =>
    route.fulfill({ json: { items: events, next_cursor: null } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await expect(page.getByLabel("Recorded event density")).toBeVisible();
  expect(await page.locator(".chronology-row").count()).toBeLessThanOrEqual(80);
  const heights = await page
    .locator(".density-bars .density-bar>span")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
  expect(heights.filter((height) => height > 10).length).toBe(2);
  await page.screenshot({ path: "../.test-work/history-session-activity.png" });
  await page.locator(".density-bar:not([disabled])").last().click();
  const jumped = page.locator('[data-event-id="long-1500"]');
  await expect(jumped).toBeFocused();
  await expect(jumped).toBeInViewport();
  expect(await page.locator(".chronology-row").count()).toBeLessThanOrEqual(80);
  await expect(page.locator(".history-sticky-summary")).toHaveClass(
    /is-visible/,
  );
  const summaryBox = (await page
    .locator(".history-sticky-summary")
    .boundingBox())!;
  const selectorBox = (await page
    .locator(".history-discovery>.session-bar")
    .boundingBox())!;
  const scrollerBox = (await page.locator(".visual-history").boundingBox())!;
  expect(
    Math.abs(summaryBox.y - (selectorBox.y + selectorBox.height)),
  ).toBeLessThan(2);
  expect(scrollerBox.y).toBeGreaterThanOrEqual(
    summaryBox.y + summaryBox.height - 1,
  );
  const pinnedY = summaryBox.y;
  await page
    .locator(".visual-history")
    .evaluate((node) => (node.scrollTop += 180));
  expect((await page.locator(".history-sticky-summary").boundingBox())!.y).toBe(
    pinnedY,
  );
  await page.screenshot({ path: "../.test-work/history-activity-jump.png" });
  await page.getByRole("button", { name: "Checkpoints", exact: true }).click();
  await expect(page.locator(".history-event")).toHaveCount(0);
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByLabel("Search history", { exact: true }).fill("fixture 2999");
  await expect(page.locator(".history-event")).toHaveCount(1);
  await page.locator(".history-event>summary").click();
  await expect(page.locator(".history-event-details")).toContainText(
    "No workspace state is inferred",
  );
});

test("short sessions hide activity bars and use singular capture counts", async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  await page.route(`**/api/sessions/${sessions[0].id}/checkpoints*`, (route) =>
    route.fulfill({ json: { items: [cps[0]], next_cursor: null } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await expect(page.getByLabel("Recorded event density")).toHaveCount(0);
  await expect(page.locator(".history-statline")).toContainText(
    "1 captured state",
  );
  await expect(page.locator(".history-statline")).not.toContainText(
    "1 captured states",
  );
  await expect(page.locator(".milestone .editorial-kicker")).not.toContainText(
    cps[0].id.slice(0, 8),
  );
  await expect(
    page.getByRole("button", { name: /^Compare checkpoint/ }),
  ).toHaveCount(0);
});

test("explicit tool-call groups leave failures visible and compare opens the supported parent diff", async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const events = Array.from({ length: 6 }, (_, i) => ({
    id: "group-" + i,
    session_id: sessions[0].id,
    sequence: i + 1,
    kind:
      i === 0 ? "item.started" : i === 5 ? "item.completed" : "item.updated",
    tool_name: "command_execution",
    tool_call_id: "retained-tool-id",
    received_at: new Date(Date.UTC(2026, 10, 5, 12, 0, i)).toISOString(),
    payload: {
      item: { type: "command_execution", command: "Recorded fixture command" },
    },
  }));
  events.push({
    ...events[5],
    id: "visible-failure",
    sequence: 7,
    payload: {
      item: {
        type: "command_execution",
        command: "Failed fixture",
        exit_code: 1,
      },
    },
  } as any);
  events.push({
    ...events[0],
    id: "unidentified",
    sequence: 8,
    received_at: "2026-11-05T12:00:07Z",
    tool_call_id: "",
    payload: {
      item: { type: "command_execution", command: "Separate event without ID" },
    },
  });
  await page.route(`**/api/sessions/${sessions[0].id}/events*`, (route) =>
    route.fulfill({ json: { items: events, next_cursor: null } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await expect(page.locator(".history-event-group")).toHaveCount(1);
  await expect(page.locator(".history-event-group>summary")).toContainText(
    "6 recorded events",
  );
  await expect(
    page.getByText("Failure / interruption recorded", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-event-id="unidentified"]')).toBeVisible();
  await page.locator(".history-event-group>summary").click();
  await expect(page.locator('[data-event-id="group-0"]')).toBeVisible();
  await expect(
    page.locator('[data-event-id="group-0"] .event-kind-label'),
  ).toHaveText("Command started");
  await page.getByRole("button", { name: /^Compare checkpoint/ }).click();
  await expect(
    page.getByRole("tab", { name: "Changes", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".monaco-diff-editor")).toBeVisible();
});

test("minimum desktop keeps discovery and inspection usable; empty history is explained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 550 });
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Visual History", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Inspect checkpoint / })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Restore checkpoint", exact: true }),
  ).toBeInViewport();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  const editor = (await page.locator(".editor-panel").boundingBox())!;
  expect(editor.width).toBeGreaterThan(260);
  expect(editor.height).toBeGreaterThan(150);
  await page
    .getByRole("button", { name: "Show checkpoint details", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Checkpoint details" }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Close checkpoint details", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../.test-work/explorer-editorial-760.png" });
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ json: { items: [], next_cursor: null } }),
  );
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "History", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your history starts with a run" }),
  ).toBeVisible();
});
