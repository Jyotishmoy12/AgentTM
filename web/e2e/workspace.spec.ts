import { test, expect } from "@playwright/test";

test("project selector uses the native separate-window action and reports cancellation honestly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("agenttm:onboarding:v1", "done");
    (window as any).projectCalls = 0;
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({
            state: "ready",
            path: "C:\\fixture\\project",
          }),
          OpenProjectWindow: async () => {
            (window as any).projectCalls++;
            return false;
          },
        },
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Project selector", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Your workspace",
    exact: true,
  });
  await expect(dialog).toContainText("C:\\fixture\\project");
  await dialog
    .getByRole("button", { name: "Choose a Git project...", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => (window as any).projectCalls)).toBe(1);
  await dialog
    .getByRole("button", { name: "Close project selector", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
});

test("historical editor retains its scroll position across inspection modes and cannot be edited", async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get("/api/sessions")).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  const latest = cps.at(-1).id;
  const content = Array.from(
    { length: 500 },
    (_, i) => `Captured fixture line ${i + 1}`,
  ).join("\n");
  await page.route(
    `**/api/checkpoints/${latest}/file?path=example.txt`,
    (route) =>
      route.fulfill({
        json: {
          path: "example.txt",
          content,
          size: content.length,
          object_id: "display-fixture",
        },
      }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Open session / })
    .first()
    .click();
  await page
    .getByRole("button", {
      name: "Inspect checkpoint " + latest.slice(0, 8),
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "example.txt", exact: true }).click();
  const input = page.getByRole("textbox", {
    name: "Read-only historical file example.txt",
    exact: true,
  });
  await expect(page.locator(".code-viewer .monaco-editor")).toBeVisible();
  await expect(input).toBeAttached(); // Monaco's native EditContext input has no painted box.
  await input.focus();
  await expect(input).toBeFocused();
  await page.keyboard.type("ATTEMPTED_EDIT");
  await expect(page.locator(".code-viewer .view-lines")).not.toContainText(
    "ATTEMPTED_EDIT",
  );
  await page.keyboard.press("Control+End");
  await expect(page.locator(".code-viewer .view-lines")).toContainText(
    "Captured fixture line 500",
  );
  await page.getByRole("tab", { name: "Changes", exact: true }).click();
  await expect(page.locator(".monaco-diff-editor")).toBeVisible();
  await page.getByRole("tab", { name: "Files", exact: true }).click();
  await expect(page.locator(".code-viewer .view-lines")).toContainText(
    "Captured fixture line 500",
  );
  await expect(page.locator(".file-heading")).toContainText("example.txt");
});
