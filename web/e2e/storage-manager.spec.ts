import { test, expect } from '@playwright/test';
async function setup(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    const state: any = {
      calls: [],
      restoreError: '',
      gcError: '',
      applyError: '',
      candidates: 2,
      token: 'first-preview',
      usageError: '',
      empty: false,
    };
    (window as any).storageFixture = state;
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({ state: 'ready' }),
          StartChat: async () => '',
          StorageUsage: async () => {
            if (state.usageError) throw state.usageError;
            return state.empty
              ? {
                  total: 0,
                  blobs: 0,
                  database: 0,
                  manifests: 0,
                  logs: 0,
                  other: 0,
                  measured_at: '2026-11-05T12:00:00Z',
                }
              : {
                  total: 10485760,
                  blobs: 8388608,
                  database: 1048576,
                  manifests: 524288,
                  logs: 262144,
                  other: 262144,
                  measured_at: '2026-11-05T12:00:00Z',
                };
          },
          CreateBackup: async (password: string) => {
            state.calls.push(['backup', password]);
            return 'C:\\backups\\history.age';
          },
          RestoreHistory: async (password: string) => {
            state.calls.push(['restore', password]);
            if (state.restoreError) throw state.restoreError;
            return state.cancelRestore ? '' : 'C:\\clean-clone';
          },
          GarbageCollect: async (apply: boolean, token: string) => {
            state.calls.push(['gc', apply, token]);
            if (state.gcError) throw state.gcError;
            if (apply && state.applyError) throw state.applyError;
            return {
              objects: 5,
              referenced: 3,
              candidates: state.candidates,
              bytes: state.candidates ? 4096 : 0,
              removed: apply ? state.candidates : 0,
              token: state.token,
            };
          },
        },
      },
    };
  });
}
async function open(page: any) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Storage & backups', exact: true })
    .click();
}

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
