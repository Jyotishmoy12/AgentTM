import { test, expect } from '@playwright/test';
import { setup, open } from './storage-manager.fixture';
test('empty storage and no eligible blobs have truthful states at desktop sizes', async ({
  page,
}) => {
  await setup(page);
  await open(page);
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 760, height: 550 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('.storage-manager').evaluate((node) => (node.scrollTop = 0));
    await page.screenshot({
      path: `../.test-work/storage-manager-${size.width}.png`,
    });
    await page.getByRole('button', { name: 'Create backup', exact: true }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Create encrypted backup',
      exact: true,
    });
    await expect(dialog).toBeInViewport();
    await expect(
      dialog.getByRole('button', {
        name: 'Create encrypted backup',
        exact: true,
      }),
    ).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../.test-work/storage-backup-${size.width}.png`,
    });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.evaluate(() => {
    (window as any).storageFixture.empty = true;
    (window as any).storageFixture.candidates = 0;
  });
  await page.getByRole('button', { name: 'Refresh sizes', exact: true }).click();
  await expect(page.locator('.storage-total')).toContainText('0 B');
  await expect(page.getByRole('img', { name: /History storage breakdown/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview Cleanup', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review storage cleanup' });
  await expect(dialog).toContainText('Nothing is eligible for cleanup.');
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Delete previewed blobs' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.evaluate(
    () => ((window as any).storageFixture.usageError = 'Storage path cannot be measured.'),
  );
  await page.getByRole('button', { name: 'Refresh sizes', exact: true }).click();
  await expect(page.locator('.storage-local')).toContainText('Storage path cannot be measured.');
  await expect(page.locator('.storage-total')).toHaveCount(0);
});

test('pending operations cannot be dismissed and browser mode exposes no fake storage totals', async ({
  page,
}) => {
  await setup(page);
  await open(page);
  await page.evaluate(() => {
    (window as any).go.main.Desktop.CreateBackup = () =>
      new Promise((resolve) => {
        (window as any).finishBackup = resolve;
      });
  });
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await page.getByLabel('Backup passphrase', { exact: true }).fill('temporary memory only');
  await page.getByLabel('Confirm backup passphrase', { exact: true }).fill('temporary memory only');
  const dialog = page.getByRole('dialog', { name: 'Create encrypted backup' });
  await dialog.getByRole('button', { name: 'Create encrypted backup', exact: true }).click();
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.evaluate(() => (window as any).finishBackup(''));
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => {
    delete (window as any).go;
  });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Storage & backups', exact: true }).click();
  await expect(page.locator('.storage-total')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create backup', exact: true })).toBeDisabled();
  await expect(page.locator('.storage-local')).toContainText('unavailable');
});
