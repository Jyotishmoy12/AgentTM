import { test, expect } from '@playwright/test';

// Production history APIs backed by the managed synthetic recording fixture.
test('overview, session tabs, Monaco, checkpoint uncertainty and diffs', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sessions = await (await request.get('/api/sessions')).json();
  const session = sessions.items[0].id;
  const cps = await (await request.get(`/api/sessions/${session}/checkpoints`)).json();
  const latest = cps.items.at(-1).id;
  const latestFile = await (await request.get(`/api/checkpoints/${latest}/file?path=example.txt`)).json();
  const baselineFile = await (await request.get(`/api/checkpoints/${cps.items[0].id}/file?path=example.txt`)).json();
  const diff = await (await request.get(`/api/checkpoints/${latest}/diff`)).json();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(0);
  const sidebar = await page.locator('.app-sidebar').boundingBox();
  const content = await page.locator('.app-main').boundingBox();
  expect(sidebar!.width).toBeLessThan(260);
  expect(content!.x).toBeGreaterThanOrEqual(sidebar!.width);
  await page.screenshot({ path: '../.test-work/navigation-overview.png', fullPage: true });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.getByRole('button', { name: `Open session ${session.slice(0, 8)}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  await expect(page.locator('.monaco-editor')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await page.getByLabel('Select checkpoint').selectOption(latest);
  await expect(page.getByText('Manually selected checkpoint', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'example.txt', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.locator('.view-lines')).toContainText(latestFile.content.trim());
  await page.getByRole('tab', { name: 'Changes', exact: true }).click();
  await expect(page.locator('.diff-heading')).toContainText(`${diff.total} changed paths`);
  await expect(page.locator('.line-add').filter({ hasText: latestFile.content.trim() })).toBeVisible();
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await page.locator('.event-card').filter({ hasText: 'baseline workspace scan' }).click();
  await page.getByRole('button', { name: 'Inspect observed files' }).click();
  await page.getByRole('button', { name: 'example.txt', exact: true }).click();
  await expect(page.locator('.view-lines')).toContainText(baselineFile.content.trim());
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await page.locator('.event-card').filter({ hasText: 'item / started' }).click();
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await expect(page.getByText('Last known workspace · this event has no checkpoint', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Select checkpoint')).toHaveValue(cps.items[0].id);
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click();
  await page.getByLabel('Search event kinds, tools or file paths').fill('example.txt');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByLabel('Search event kinds, tools or file paths').fill('');
  await page.getByRole('button', { name: 'Next event →' }).click();
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1);
  await page.screenshot({ path: '../.test-work/navigation-timeline.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('missing objects, empty sessions and help have useful states', async ({ page }) => {
  await page.route('**/api/checkpoints/*/file?*', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'object_unavailable', message: 'Historical object is missing or corrupt. Run agenttm doctor.' } }) }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Historical object is missing or corrupt');
  await expect(page.getByRole('button', { name: 'Retry file' })).toBeVisible();
  await page.unrouteAll();
  await page.route('**/api/sessions', route => route.fulfill({ contentType: 'application/json', body: '{"items":[],"next_cursor":null}' }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your history starts with a run' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Setup & help', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How the pieces fit together' })).toBeVisible();
  await expect(page.getByText('agenttm codex doctor', { exact: true })).toBeVisible();
});

test('mobile navigation, history and activity remain accessible without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('button', { name: 'Sessions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Open session / }).first().click();
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  await expect(page.locator('.event-card').first()).toBeVisible();
  await page.getByRole('heading', { name: 'Activity', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({ path: '../.test-work/navigation-mobile.png', fullPage: true });
});

test('desktop minimum size keeps navigation and file tools usable', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 550 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Checkpoints', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fork checkpoint', exact: true })).toBeInViewport();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  const size = await page.locator('.editor-panel').boundingBox();
  expect(size!.width).toBeGreaterThan(250);
  expect(size!.height).toBeGreaterThan(100);
  await page.screenshot({ path: '../.test-work/navigation-small.png', fullPage: true });
});
