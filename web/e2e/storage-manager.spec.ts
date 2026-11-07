import { test, expect } from '@playwright/test';
import { setup, open } from './storage-manager.fixture';
test('measured storage and separated backup flow preserve validation and clear secret fields', async ({
  page,
}) => {
  await setup(page);
  await open(page);
  await expect(page.getByRole('img', { name: /History storage breakdown/ })).toBeVisible();
  await expect(page.locator('.storage-total')).toContainText('10.00 MiB');
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Create encrypted backup',
    exact: true,
  });
  await expect(
    dialog.getByRole('button', {
      name: 'Create encrypted backup',
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel('Backup passphrase', { exact: true }).fill('a verified test passphrase');
  await page.getByLabel('Confirm backup passphrase', { exact: true }).fill('mismatched passphrase');
  await expect(dialog).toContainText('Passphrases do not match');
  await expect(
    dialog.getByRole('button', {
      name: 'Create encrypted backup',
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByLabel('Confirm backup passphrase', { exact: true })
    .fill('a verified test passphrase');
  await dialog.getByRole('button', { name: 'Create encrypted backup', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.storage-outcome')).toContainText('Encrypted backup saved.');
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Confirm backup passphrase', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Restore passphrase', { exact: true })).toHaveValue('');
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) => value.includes('a verified test passphrase')),
    ),
  ).toBe(false);
});

test('restore surfaces wrong passphrase, bad archive, and destination errors without retrying automatically', async ({
  page,
}) => {
  await setup(page);
  await open(page);
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Restore encrypted history',
    exact: true,
  });
  await expect(dialog).toContainText('Existing history will not be overwritten.');
  await expect(dialog).toContainText('native dialogs');
  for (const error of [
    'cannot decrypt backup: wrong passphrase or damaged file',
    'archive file not found',
    'backup is truncated or corrupt',
    'destination already has .agenttm; restore into a clean clone',
  ]) {
    await page.evaluate((value) => ((window as any).storageFixture.restoreError = value), error);
    await page.getByLabel('Restore passphrase', { exact: true }).fill('testing an archive');
    await dialog.getByRole('button', { name: 'Choose archive & target', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(error);
    await expect(page.getByLabel('Restore passphrase', { exact: true })).toHaveValue('');
    await expect(
      dialog.getByRole('button', {
        name: 'Choose archive & target',
        exact: true,
      }),
    ).toBeDisabled();
  }
  expect(
    (
      await page.evaluate(() =>
        (window as any).storageFixture.calls.filter((value: any) => value[0] === 'restore'),
      )
    ).length,
  ).toBe(4);
  await page.evaluate(() => {
    (window as any).storageFixture.restoreError = '';
    (window as any).storageFixture.cancelRestore = true;
  });
  await page.getByLabel('Restore passphrase', { exact: true }).fill('cancel selection');
  await dialog.getByRole('button', { name: 'Choose archive & target', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.storage-outcome')).toContainText('Restore cancelled.');
  await page.evaluate(() => ((window as any).storageFixture.cancelRestore = false));
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await page.getByLabel('Restore passphrase', { exact: true }).fill('restoring saved history');
  await dialog.getByRole('button', { name: 'Choose archive & target', exact: true }).click();
  await expect(page.locator('.storage-outcome')).toContainText('History restored');
  await expect(page.locator('.storage-outcome')).toContainText('clean-clone');
});

test('cleanup uses explicit consent, invalidates failed previews and preserves lock errors', async ({
  page,
}) => {
  await setup(page);
  await open(page);
  await page.getByRole('button', { name: 'Preview Cleanup', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Review storage cleanup',
    exact: true,
  });
  await expect(dialog).toContainText('2 eligible blobs');
  const remove = dialog.getByRole('button', {
    name: 'Delete previewed blobs',
    exact: true,
  });
  await expect(remove).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await page.evaluate(
    () =>
      ((window as any).storageFixture.applyError =
        'storage changed or preview missing; preview garbage collection again'),
  );
  await remove.click();
  await expect(dialog.getByRole('alert')).toContainText('storage changed');
  await expect(dialog.getByRole('alert')).toContainText('partially completed');
  await expect(remove).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).storageFixture.applyError = '';
    (window as any).storageFixture.token = 'fresh-preview';
  });
  await dialog.getByRole('button', { name: 'Preview again', exact: true }).click();
  await expect(remove).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await remove.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.storage-outcome')).toContainText('Removed 2 unreferenced blobs');
  const calls = await page.evaluate(() =>
    (window as any).storageFixture.calls.filter((value: any) => value[0] === 'gc'),
  );
  expect(calls).toEqual([
    ['gc', false, ''],
    ['gc', true, 'first-preview'],
    ['gc', false, ''],
    ['gc', true, 'fresh-preview'],
  ]);
  for (const error of [
    'recording is locked; run agenttm doctor',
    'finish or diagnose active recordings before maintenance',
    'GC stopped: unindexed manifest or staging file',
  ]) {
    await page.evaluate((value) => ((window as any).storageFixture.gcError = value), error);
    await page.getByRole('button', { name: 'Preview Cleanup', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(error);
    await expect(remove).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  }
});
