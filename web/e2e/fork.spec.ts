import { test, expect } from '@playwright/test';

test('fork dialog requires partial consent and creates a verified worktree', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'History', exact: true })
    .click();
  await page
    .getByRole('button', { name: /^Inspect checkpoint / })
    .last()
    .click();
  await expect(
    page
      .locator('.explorer-header')
      .getByRole('button', { name: 'Restore checkpoint', exact: true }),
  ).toBeEnabled();
  await page
    .locator('.explorer-header')
    .getByRole('button', { name: 'Restore checkpoint', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Restore checkpoint',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.getByLabel('New fork name').fill(`browser-${Date.now().toString(36)}`);
  await expect(dialog.locator('.fork-destination')).toContainText('worktrees');
  await expect(page.getByRole('button', { name: 'Create restored worktree' })).toBeDisabled();
  await page
    .getByRole('checkbox', {
      name: 'I reviewed the omissions and accept a partial restore.',
    })
    .check();
  await page.getByRole('button', { name: 'Create restored worktree' }).click();
  await expect(page.getByRole('heading', { name: 'Checkpoint restored' })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.fork-destination')).toContainText('worktrees');
  await page.screenshot({
    path: '../.test-work/fork-dialog.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Restored workspaces', exact: true })
    .click();
  await expect(page.locator('.restores-row').first()).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Selected workspace details' }),
  ).toContainText('recorded result');
});

test('invalid fork names are explained without a mutation', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'History', exact: true })
    .click();
  await page
    .getByRole('button', { name: /^Inspect checkpoint / })
    .last()
    .click();
  await expect(
    page
      .locator('.explorer-header')
      .getByRole('button', { name: 'Restore checkpoint', exact: true }),
  ).toBeEnabled();
  await page
    .locator('.explorer-header')
    .getByRole('button', { name: 'Restore checkpoint', exact: true })
    .click();
  await page.getByLabel('New fork name').fill('../outside');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('fork name');
  await expect(page.getByRole('button', { name: 'Create restored worktree' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
