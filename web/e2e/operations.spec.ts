import { test, expect } from "@playwright/test";

test("operation coverage and before/after checkpoint navigation", async ({
  page,
  request,
}) => {
  const sessions = await (await request.get("/api/sessions")).json();
  const session = sessions.items[0].id;
  const cps = await (
    await request.get(`/api/sessions/${session}/checkpoints`)
  ).json();
  const response = await request.get(`/api/sessions/${session}/operations`);
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).items).toEqual([]); // historical fixture has no operation ledger
  await page.route(`**/api/sessions/${session}/operations`, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "test-operation",
            tool: "command_execution",
            status: "completed",
            capture_status: "complete",
            started_at: new Date().toISOString(),
            before_checkpoint_id: cps.items[0].id,
            after_checkpoint_id: cps.items.at(-1).id,
            overlapping: true,
            missing_start: false,
            error: "",
            changed_paths: ["example.txt"],
            changed_path_count: 1,
          },
          {
            id: "missing",
            tool: "file_change",
            status: "interrupted",
            capture_status: "missing_start",
            started_at: new Date().toISOString(),
            before_checkpoint_id: "",
            after_checkpoint_id: "",
            overlapping: false,
            missing_start: true,
            error: "No completed boundary",
            changed_paths: [],
            changed_path_count: 0,
          },
        ],
        next_cursor: null,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await page
    .getByRole("button", { name: "View operation boundaries", exact: true })
    .click();
  await expect(
    page.getByText("Overlapping operations:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Start notification missing;", { exact: false }),
  ).toBeVisible();
  await expect(
    page
      .locator(".operation-card")
      .last()
      .getByRole("button", { name: "Inspect before" }),
  ).toBeDisabled();
  await page
    .locator(".operation-card")
    .first()
    .getByRole("button", { name: "Inspect after" })
    .click();
  await expect(page.getByLabel("Select checkpoint")).toHaveValue(
    cps.items.at(-1).id,
  );
  await page.getByRole("button", { name: "example.txt", exact: true }).click();
  await expect(page.locator(".view-lines")).toContainText(
    "Changed workspace text",
  );
  await page.locator(".back-history").click();

  await page
    .locator(".operation-card")
    .first()
    .getByRole("button", { name: "Inspect before" })
    .click();
  await page.getByRole("button", { name: "example.txt", exact: true }).click();
  await expect(page.locator(".view-lines")).toContainText(
    "Baseline workspace text",
  );
});
