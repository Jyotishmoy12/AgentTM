import { test, expect } from '@playwright/test';

test('a user-supplied name persists across reload, inspection and reset without enabling prompts', async ({
  page,
  request,
}) => {
  const { items } = await (await request.get('/api/sessions')).json();
  const session = items[0];
  const health = await (await request.get('/api/health')).json();
  const before = await (await request.get(`/api/sessions/${session.id}/events`)).json();
  await page.goto('/');
  await page
    .getByRole('button', { name: `Rename session ${session.id.slice(0, 8)}`, exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Name this session', exact: true });
  await expect(dialog).toBeVisible();
  await page.getByLabel('Session name', { exact: true }).fill('Investigate parser failure');
  await dialog.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.locator('.home-session-card').first();
  await expect(card.getByRole('heading')).toHaveText('Investigate parser failure');
  await page.reload();
  await expect(card.getByRole('heading')).toHaveText('Investigate parser failure');
  await card.click();
  await expect(page.getByLabel('Session', { exact: true })).toContainText(
    'Investigate parser failure',
  );
  await page.getByRole('button', { name: 'Rename current session', exact: true }).click();
  await expect(page.getByLabel('Session name', { exact: true })).toHaveValue(
    'Investigate parser failure',
  );
  await page.getByLabel('Session name', { exact: true }).fill('');
  await dialog.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const { items: updated } = await (await request.get('/api/sessions')).json();
  expect(updated.find((item: any) => item.id === session.id).title).toBe('');
  expect((await (await request.get('/api/health')).json()).prompt_mode).toBe(health.prompt_mode);
  expect(await (await request.get(`/api/sessions/${session.id}/events`)).json()).toEqual(before);
});
