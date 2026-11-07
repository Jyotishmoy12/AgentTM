import { test, expect } from '@playwright/test';
test('desktop chat and storage controls use explicit native actions', async ({ page, request }) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(
    ({ sessionID }) => {
      localStorage.setItem('agenttm:onboarding:v1', 'done');
      let state = { session_id: '', running: false, draft: '', error: '', approvals: [] as any[] };
      (window as any).featureCalls = [];
      const call = (method: string, args: unknown[]) =>
        (window as any).featureCalls.push({ method, args });
      (window as any).go = {
        main: {
          Desktop: {
            CheckSetup: async () => ({
              state: 'ready',
              version: 'synthetic',
              project: 'demo',
              path: 'C:\\demo',
            }),
            CopyText: async () => {},
            OpenCodexDocs: async () => {},
            CodexModels: async () => [
              {
                model: 'synthetic-model',
                displayName: 'Synthetic available model',
                isDefault: true,
              },
            ],
            ChatStatus: async () => state,
            StartChat: async (...args: unknown[]) => {
              call('start', args);
              state = {
                session_id: sessionID,
                running: true,
                draft: 'Synthetic live reply',
                error: '',
                approvals: [
                  {
                    id: 'test-approval',
                    method: 'command',
                    command: 'echo synthetic',
                    directory: 'C:\\demo',
                    reason: 'Synthetic test approval',
                  },
                ],
              };
              return sessionID;
            },
            StopChat: async () => {
              state = { ...state, running: false, approvals: [] };
            },
            DecideChat: async (...args: unknown[]) => {
              call('decide', args);
              state = { ...state, running: false, approvals: [] };
            },
            CreateBackup: async (...args: unknown[]) => {
              call('backup', args);
              return 'C:\\backups\\test.age';
            },
            RestoreHistory: async (...args: unknown[]) => {
              call('restore', args);
              return 'C:\\clone';
            },
            GarbageCollect: async (apply: boolean, token: string) => {
              call('gc', [apply, token]);
              return {
                objects: 3,
                referenced: 2,
                candidates: 1,
                bytes: 1024,
                removed: apply ? 1 : 0,
                token: 'preview-token',
              };
            },
          },
        },
      };
    },
    { sessionID },
  );
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('synthetic-model');
  await page.getByLabel('Your message', { exact: true }).fill('Explain this project');
  await page.getByRole('button', { name: 'Send to Codex', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Codex needs your approval' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop turn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Continue conversation', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Your follow-up', { exact: true }).fill('Explain more');
  await page.getByRole('button', { name: 'Continue conversation', exact: true }).click();
  const starts = await page.evaluate(() =>
    (window as any).featureCalls.filter((c: any) => c.method === 'start'),
  );
  expect(starts[0].args).toEqual(['', 'Explain this project', 'synthetic-model', 'read-only']);
  expect(starts[1].args[0]).toBe(sessionID);
  await page.screenshot({ path: '../.test-work/chat-feature.png', fullPage: true });
  await nav.getByRole('button', { name: 'Storage & backups', exact: true }).click();
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Create encrypted backup', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Backup passphrase', { exact: true }).fill('a good test passphrase');
  await page
    .getByLabel('Confirm backup passphrase', { exact: true })
    .fill('a different passphrase');
  await expect(
    page.getByRole('button', { name: 'Create encrypted backup', exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel('Confirm backup passphrase', { exact: true })
    .fill('a good test passphrase');
  await page.getByRole('button', { name: 'Create encrypted backup', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Encrypted backup saved');
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Cleanup', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete previewed blobs', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Delete previewed blobs', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Removed 1');
  const gcCalls = await page.evaluate(() =>
    (window as any).featureCalls.filter((c: any) => c.method === 'gc'),
  );
  expect(gcCalls[1].args).toEqual([true, 'preview-token']);
  await page.screenshot({ path: '../.test-work/storage-feature.png', fullPage: true });
});

test('browser explains desktop-only chat without starting a process', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Chat with Codex', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Chat is available in the desktop app' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send to Codex' })).toHaveCount(0);
});
