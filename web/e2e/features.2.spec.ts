import { test, expect } from '@playwright/test';
test('model picker unwraps account errors and sends the selected retry model', async ({
  page,
  request,
}) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(
    ({ sessionID }) => {
      localStorage.setItem('agenttm:onboarding:v1', 'done');
      let current = { session_id: '', running: false, draft: '', error: '', approvals: [] };
      (window as any).selectedModels = [];
      (window as any).go = {
        main: {
          Desktop: {
            CheckSetup: async () => ({ state: 'ready' }),
            ChatStatus: async () => current,
            CodexModels: async () => [
              { model: 'catalog-model', displayName: 'Catalog default', isDefault: true },
              { model: 'alternate-model', displayName: 'Alternative model', isDefault: false },
            ],
            StartChat: async (_session: string, _prompt: string, model: string) => {
              (window as any).selectedModels.push(model);
              const detail = JSON.stringify({
                error: {
                  code: 'model_not_found',
                  message:
                    "The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.",
                },
              });
              current = {
                session_id: sessionID,
                running: false,
                draft: '',
                error:
                  model === 'alternate-model'
                    ? ''
                    : JSON.stringify({ message: detail, additionalDetails: null }),
                approvals: [],
              };
              return sessionID;
            },
          },
        },
      };
    },
    { sessionID },
  );
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Chat with Codex', exact: true })
    .click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('catalog-model');
  await page.getByLabel('Your message', { exact: true }).fill('hello');
  await page.getByRole('button', { name: 'Send to Codex', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a different model');
  await expect(page.getByRole('alert')).not.toContainText('additionalDetails');
  await page.getByLabel('Chat model', { exact: true }).selectOption('alternate-model');
  await page.getByLabel('Your follow-up', { exact: true }).fill('hello again');
  await page.getByRole('button', { name: 'Continue conversation', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Continue conversation', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).selectedModels)).toEqual([
    'catalog-model',
    'alternate-model',
  ]);
});

test('native catalog failures show their cause and executable selection can recover', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    let picked = false;
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({ state: 'ready' }),
          StartChat: async () => 'unused',
          ChatStatus: async () => ({
            session_id: '',
            running: false,
            draft: '',
            error: '',
            approvals: [],
          }),
          CodexModels: async () => {
            if (!picked) throw 'Codex executable was not found on PATH';
            return [{ model: 'recovered-model', displayName: 'Discovered model', isDefault: true }];
          },
          ChooseCodex: async () => {
            picked = true;
            return 'C:\\tools\\codex.exe';
          },
        },
      },
    };
  });
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Chat with Codex', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Codex executable was not found on PATH');
  await expect(page.getByRole('status')).not.toContainText('recorded history');
  await page.getByText('Model settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Choose Codex executable…', exact: true }).click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('recovered-model');
  await page.getByText('Model settings', { exact: true }).click();
  await expect(page.getByText('Using: C:\\tools\\codex.exe', { exact: true })).toBeVisible();
});

test('chat gives the transcript most of the window and keeps model setup out of the layout', async ({
  page,
  request,
}) => {
  const sessions = await (await request.get('/api/sessions')).json();
  const sessionID = sessions.items[0].id;
  await page.addInitScript(
    ({ sessionID }) => {
      localStorage.setItem('agenttm:onboarding:v1', 'done');
      (window as any).go = {
        main: {
          Desktop: {
            CheckSetup: async () => ({ state: 'ready' }),
            StartChat: async () => sessionID,
            ChatStatus: async () => ({
              session_id: '',
              running: false,
              draft: '',
              error: '',
              approvals: [],
            }),
            CodexModels: async () => [
              { model: 'layout-model', displayName: 'Test model', isDefault: true },
            ],
            ChooseCodex: async () => 'C:\\tools\\codex.exe',
          },
        },
      };
    },
    { sessionID },
  );
  await page.setViewportSize({ width: 1100, height: 740 });
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Chat with Codex', exact: true })
    .click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('layout-model');
  const transcript = page.getByLabel('Conversation messages');
  const initial = (await transcript.boundingBox())!;
  expect(initial.height).toBeGreaterThan(740 * 0.5);
  await expect(
    page.getByRole('button', { name: 'Choose Codex executable…', exact: true }),
  ).toBeHidden();
  await page.getByText('Model settings', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Choose Codex executable…', exact: true }),
  ).toBeVisible();
  const expanded = (await transcript.boundingBox())!;
  expect(expanded.height).toBe(initial.height);
  await page.getByText('Model settings', { exact: true }).click();
  await page.screenshot({ path: '../.test-work/chat-roomy.png', fullPage: true });
  await page.setViewportSize({ width: 760, height: 550 });
  expect((await transcript.boundingBox())!.height).toBeGreaterThan(200);
  await expect(page.getByRole('button', { name: 'Send to Codex', exact: true })).toBeInViewport();
});
