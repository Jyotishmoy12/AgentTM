import { test, expect } from '@playwright/test';

test('desktop chat and storage controls use explicit native actions', async ({ page, request }) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(({ sessionID }) => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    let state = { session_id: '', running: false, draft: '', error: '', approvals: [] as any[] };
    (window as any).featureCalls = [];
    const call = (method: string, args: unknown[]) => (window as any).featureCalls.push({ method, args });
    (window as any).go = { main: { Desktop: {
      CheckSetup: async () => ({ state: 'ready', version: 'synthetic', project: 'demo', path: 'C:\\demo' }),
      CopyText: async () => {}, OpenCodexDocs: async () => {},
      CodexModels: async () => [{ model: 'synthetic-model', displayName: 'Synthetic available model', isDefault: true }],
      ChatStatus: async () => state,
      StartChat: async (...args: unknown[]) => { call('start', args); state = { session_id: sessionID, running: true, draft: 'Synthetic live reply', error: '', approvals: [{ id: 'test-approval', method: 'command', command: 'echo synthetic', directory: 'C:\\demo', reason: 'Synthetic test approval' }] }; return sessionID; },
      StopChat: async () => { state = { ...state, running: false, approvals: [] }; },
      DecideChat: async (...args: unknown[]) => { call('decide', args); state = { ...state, running: false, approvals: [] }; },
      CreateBackup: async (...args: unknown[]) => { call('backup', args); return 'C:\\backups\\test.age'; },
      RestoreHistory: async (...args: unknown[]) => { call('restore', args); return 'C:\\clone'; },
      GarbageCollect: async (apply: boolean, token: string) => { call('gc', [apply, token]); return { objects: 3, referenced: 2, candidates: 1, bytes: 1024, removed: apply ? 1 : 0, token: 'preview-token' }; },
    } } };
  }, { sessionID });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('synthetic-model');
  await page.getByLabel('Your message', { exact: true }).fill('Explain this project');
  await page.getByRole('button', { name: 'Send to Codex', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Codex needs your approval' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop turn', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue conversation', exact: true })).toBeVisible();
  await page.getByLabel('Your follow-up', { exact: true }).fill('Explain more');
  await page.getByRole('button', { name: 'Continue conversation', exact: true }).click();
  const starts = await page.evaluate(() => (window as any).featureCalls.filter((c: any) => c.method === 'start'));
  expect(starts[0].args).toEqual(['', 'Explain this project', 'synthetic-model', 'read-only']);
  expect(starts[1].args[0]).toBe(sessionID);
  await page.screenshot({ path: '../.test-work/chat-feature.png', fullPage: true });
  await nav.getByRole('button', { name: 'Storage & backups', exact: true }).click();
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create encrypted backup', exact: true })).toBeDisabled();
  await page.getByLabel('Backup passphrase', { exact: true }).fill('a good test passphrase');
  await page.getByLabel('Confirm backup passphrase', { exact: true }).fill('a different passphrase');
  await expect(page.getByRole('button', { name: 'Create encrypted backup', exact: true })).toBeDisabled();
  await page.getByLabel('Confirm backup passphrase', { exact: true }).fill('a good test passphrase');
  await page.getByRole('button', { name: 'Create encrypted backup', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Encrypted backup saved');
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await expect(page.getByLabel('Backup passphrase', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Cleanup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete previewed blobs', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Delete previewed blobs', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Removed 1');
  const gcCalls = await page.evaluate(() => (window as any).featureCalls.filter((c: any) => c.method === 'gc'));
  expect(gcCalls[1].args).toEqual([true, 'preview-token']);
  await page.screenshot({ path: '../.test-work/storage-feature.png', fullPage: true });
});

test('browser explains desktop-only chat without starting a process', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chat is available in the desktop app' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send to Codex' })).toHaveCount(0);
});

test('model picker unwraps account errors and sends the selected retry model', async ({ page, request }) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(({ sessionID }) => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    let current = { session_id: '', running: false, draft: '', error: '', approvals: [] };
    (window as any).selectedModels = [];
    (window as any).go = { main: { Desktop: {
      CheckSetup: async () => ({ state: 'ready' }),
      ChatStatus: async () => current,
      CodexModels: async () => [{ model: 'catalog-model', displayName: 'Catalog default', isDefault: true }, { model: 'alternate-model', displayName: 'Alternative model', isDefault: false }],
      StartChat: async (_session: string, _prompt: string, model: string) => {
        (window as any).selectedModels.push(model);
        const detail = JSON.stringify({ error: { code: 'model_not_found', message: "The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account." } });
        current = { session_id: sessionID, running: false, draft: '', error: model === 'alternate-model' ? '' : JSON.stringify({ message: detail, additionalDetails: null }), approvals: [] };
        return sessionID;
      },
    } } };
  }, { sessionID });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('catalog-model');
  await page.getByLabel('Your message', { exact: true }).fill('hello');
  await page.getByRole('button', { name: 'Send to Codex', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a different model');
  await expect(page.getByRole('alert')).not.toContainText('additionalDetails');
  await page.getByLabel('Chat model', { exact: true }).selectOption('alternate-model');
  await page.getByLabel('Your follow-up', { exact: true }).fill('hello again');
  await page.getByRole('button', { name: 'Continue conversation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue conversation', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).selectedModels)).toEqual(['catalog-model', 'alternate-model']);
});

test('native catalog failures show their cause and executable selection can recover', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    let picked = false;
    (window as any).go = { main: { Desktop: {
      CheckSetup: async () => ({ state: 'ready' }),
      StartChat: async () => 'unused',
      ChatStatus: async () => ({ session_id: '', running: false, draft: '', error: '', approvals: [] }),
      CodexModels: async () => { if (!picked) throw 'Codex executable was not found on PATH'; return [{ model: 'recovered-model', displayName: 'Discovered model', isDefault: true }]; },
      ChooseCodex: async () => { picked = true; return 'C:\\tools\\codex.exe'; },
    } } };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Codex executable was not found on PATH');
  await expect(page.getByRole('status')).not.toContainText('recorded history');
  await page.getByText('Model settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Choose Codex executable…', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('recovered-model');
  await page.getByText('Model settings', { exact: true }).click();
  await expect(page.getByText('Using: C:\\tools\\codex.exe', { exact: true })).toBeVisible();
});

test('chat gives the transcript most of the window and keeps model setup out of the layout', async ({ page, request }) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(({ sessionID }) => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    (window as any).go = { main: { Desktop: {
      CheckSetup: async () => ({ state: 'ready' }),
      StartChat: async () => sessionID,
      ChatStatus: async () => ({ session_id: '', running: false, draft: '', error: '', approvals: [] }),
      CodexModels: async () => [{ model: 'layout-model', displayName: 'Test model', isDefault: true }],
      ChooseCodex: async () => 'C:\\tools\\codex.exe',
    } } };
  }, { sessionID });
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Chat with Codex', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('layout-model');
  const transcript = page.getByLabel('Conversation messages');
  const initial = (await transcript.boundingBox())!;
  expect(initial.height).toBeGreaterThan(740 * 0.5);
  await expect(page.getByRole('button', { name: 'Choose Codex executable…', exact: true })).toBeHidden();
  await page.getByText('Model settings', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Codex executable…', exact: true })).toBeVisible();
  const expanded = (await transcript.boundingBox())!;
  expect(expanded.height).toBe(initial.height);
  await page.getByText('Model settings', { exact: true }).click();
  await page.screenshot({ path: '../.test-work/chat-roomy.png', fullPage: true });
  await page.setViewportSize({ width: 760, height: 550 });
  expect((await transcript.boundingBox())!.height).toBeGreaterThan(200);
  await expect(page.getByRole('button', { name: 'Send to Codex', exact: true })).toBeInViewport();
});
