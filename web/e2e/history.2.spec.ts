import { test, expect } from '@playwright/test';
test('explicit tool-call groups leave failures visible and compare opens the supported parent diff', async ({
  page,
  request,
}) => {
  const { items: sessions } = await (await request.get('/api/sessions')).json();
  const events = Array.from({ length: 6 }, (_, i) => ({
    id: 'group-' + i,
    session_id: sessions[0].id,
    sequence: i + 1,
    kind: i === 0 ? 'item.started' : i === 5 ? 'item.completed' : 'item.updated',
    tool_name: 'command_execution',
    tool_call_id: 'retained-tool-id',
    received_at: new Date(Date.UTC(2026, 10, 5, 12, 0, i)).toISOString(),
    payload: {
      item: { type: 'command_execution', command: 'Recorded fixture command' },
    },
  }));
  events.push({
    ...events[5],
    id: 'visible-failure',
    sequence: 7,
    payload: {
      item: {
        type: 'command_execution',
        command: 'Failed fixture',
        exit_code: 1,
      },
    },
  } as any);
  events.push({
    ...events[0],
    id: 'unidentified',
    sequence: 8,
    received_at: '2026-11-05T12:00:07Z',
    tool_call_id: '',
    payload: {
      item: { type: 'command_execution', command: 'Separate event without ID' },
    },
  });
  await page.route(`**/api/sessions/${sessions[0].id}/events*`, (route) =>
    route.fulfill({ json: { items: events, next_cursor: null } }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: /^Open session / })
    .first()
    .click();
  await expect(page.locator('.history-event-group')).toHaveCount(1);
  await expect(page.locator('.history-event-group>summary')).toContainText('6 recorded events');
  await expect(page.getByText('Failure / interruption recorded', { exact: true })).toBeVisible();
  await expect(page.locator('[data-event-id="unidentified"]')).toBeVisible();
  await page.locator('.history-event-group>summary').click();
  await expect(page.locator('[data-event-id="group-0"]')).toBeVisible();
  await expect(page.locator('[data-event-id="group-0"] .event-kind-label')).toHaveText(
    'Command started',
  );
  await page.getByRole('button', { name: /^Compare checkpoint/ }).click();
  await expect(page.getByRole('tab', { name: 'Changes', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.monaco-diff-editor')).toBeVisible();
});

test('minimum desktop keeps discovery and inspection usable; empty history is explained', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 550 });
  await page.goto('/');
  await page
    .getByRole('button', { name: /^Open session / })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'Visual History', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: /^Inspect checkpoint / })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Restore checkpoint', exact: true }),
  ).toBeInViewport();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  const editor = (await page.locator('.editor-panel').boundingBox())!;
  expect(editor.width).toBeGreaterThan(260);
  expect(editor.height).toBeGreaterThan(150);
  await page.getByRole('button', { name: 'Show checkpoint details', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Checkpoint details' })).toBeInViewport();
  await page.getByRole('button', { name: 'Close checkpoint details', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../.test-work/explorer-editorial-760.png' });
  await page.route('**/api/sessions', (route) =>
    route.fulfill({ json: { items: [], next_cursor: null } }),
  );
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'History', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Your history starts with a run' })).toBeVisible();
});
