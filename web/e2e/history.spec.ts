import { test, expect } from '@playwright/test';

// Exercise actual DB/manifest/blob storage, not browser mock data. The optional
// managed fixture is explicitly synthetic; AGENTTM_TEST_URL can target a real recording.
test('stored history, Monaco, checkpoint uncertainty and diffs', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sessions = await (await request.get('/api/sessions')).json();
  expect(sessions.items.length).toBeGreaterThan(0);
  const session = sessions.items[0].id;
  const cps = await (await request.get(`/api/sessions/${session}/checkpoints`)).json();
  expect(cps.items.length).toBeGreaterThan(1);
  const latest = cps.items.at(-1).id;
  const latestFile = await (await request.get(`/api/checkpoints/${latest}/file?path=example.txt`)).json();
  const baselineFile = await (await request.get(`/api/checkpoints/${cps.items[0].id}/file?path=example.txt`)).json();
  const diff = await (await request.get(`/api/checkpoints/${latest}/diff`)).json();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  await expect(page.locator('.event-card').first()).toBeVisible();
  await page.getByLabel('Select checkpoint').selectOption(cps.items.at(-1).id);
  await expect(page.getByText('Manually selected checkpoint', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'example.txt', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.locator('.view-lines')).toContainText(latestFile.content.trim());
  await page.getByRole('tab', { name: 'Compare with parent' }).click();
  await expect(page.locator('.diff-heading')).toContainText(`${diff.total} changed paths`);
  await expect(page.locator('.line-add').filter({ hasText: latestFile.content.trim() })).toBeVisible();
  await page.screenshot({ path: '../.test-work/phase3-ui.png', fullPage: true });
  await page.getByRole('tab', { name: /^Files/ }).click();
  await page.locator('.event-card').filter({ hasText: 'baseline workspace scan' }).click();
  await expect(page.locator('.view-lines')).toContainText(baselineFile.content.trim());
  await page.locator('.event-card').filter({ hasText: 'item / started' }).click();
  await expect(page.getByText('Last known workspace · this event has no checkpoint', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Select checkpoint')).toHaveValue(cps.items[0].id);
  await page.getByLabel('Search event kinds, tools or file paths').fill('example.txt');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByLabel('Search event kinds, tools or file paths').fill('');
  await page.getByRole('button', { name: 'Next event →' }).click();
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('missing objects and empty sessions have useful states', async ({ page }) => {
  await page.route('**/api/checkpoints/*/file?*', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'object_unavailable', message: 'Historical object is missing or corrupt. Run agenttm doctor.' } }) }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Historical object is missing or corrupt');
  await expect(page.getByRole('button', { name: 'Retry file' })).toBeVisible();
  await page.unrouteAll();
  await page.route('**/api/sessions', route => route.fulfill({ contentType: 'application/json', body: '{"items":[],"next_cursor":null}' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your history starts with a run' })).toBeVisible();
});

test('mobile history and activity stay accessible without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  await expect(page.locator('.event-card').first()).toBeVisible();
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  await page.getByRole('heading', { name: 'Activity', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
});
