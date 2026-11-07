import { test, expect } from '@playwright/test';
export async function chatFixture(
  page: any,
  request: any,
  { long = false, approval = false, failed = false } = {},
) {
  const { items } = await (await request.get('/api/sessions')).json();
  const id = items[0].id;
  await page.route('**/api/sessions', (route: any) =>
    route.fulfill({
      json: {
        items: [{ ...items[0], resumable: true, title: 'Review parser changes' }],
        next_cursor: null,
      },
    }),
  );
  const data = long
    ? Array.from({ length: 24 }, (_, i) => ({
        id: `reply-${i}`,
        session_id: id,
        sequence: i + 1,
        kind: 'item.completed',
        received_at: new Date().toISOString(),
        payload: {
          item: {
            type: 'agent_message',
            text: `Recorded fixture reply ${i}\n\n${'The captured workspace contains a parser and its tests. '.repeat(12)}`,
          },
        },
      }))
    : [];
  if (failed)
    data.push({
      id: 'tool-failure',
      session_id: id,
      sequence: data.length + 1,
      kind: 'item.completed',
      tool_name: 'command_execution',
      tool_call_id: 'fixture-tool',
      received_at: new Date().toISOString(),
      payload: {
        item: {
          type: 'command_execution',
          status: 'failed',
          command: 'fixture-test-command',
          exit_code: 1,
          aggregated_output: 'Synthetic parser test failed: expected a closing bracket.',
        },
      },
    } as any);
  if (failed)
    data.push({
      id: 'code-reply',
      session_id: id,
      sequence: data.length + 1,
      kind: 'item.completed',
      received_at: new Date().toISOString(),
      payload: {
        item: {
          type: 'agent_message',
          text:
            'Review **this example** and `parse()`:\n\n```typescript\nconst text = "' +
            'x'.repeat(900) +
            '";\n```\n\n<img src=x onerror="alert(1)">',
        },
      },
    });
  await page.route(`**/api/sessions/${id}/events?*limit=200`, (route: any) =>
    route.fulfill({ json: { items: data, next_cursor: null } }),
  );
  await page.addInitScript(
    ({ id, approval, long }: any) => {
      localStorage.setItem('agenttm:onboarding:v1', 'done');
      (window as any).chatCalls = [];
      (window as any).chatFixtureState = {
        session_id: long ? id : '',
        running: long,
        draft: '',
        error: '',
        approvals: approval
          ? [
              {
                id: 'approval-one',
                method: 'command',
                command: 'fixture-test-command',
                reason: 'Run the fixture test suite',
                directory: 'C:\\fixture',
              },
            ]
          : [],
      };
      (window as any).go = {
        main: {
          Desktop: {
            CheckSetup: async () => ({ state: 'ready' }),
            CopyText: async (text: string) => {
              (window as any).copiedChatCode = text;
            },
            CodexModels: async () => [
              { model: 'fixture-model', displayName: 'Fixture model', isDefault: true },
            ],
            ChatStatus: async () => (window as any).chatFixtureState,
            StartChat: async (...args: any[]) => {
              (window as any).chatCalls.push({ method: 'start', args });
              (window as any).chatFixtureState = {
                session_id: id,
                running: true,
                draft: 'Reviewing your request…',
                error: '',
                approvals: [],
              };
              return id;
            },
            StopChat: async () => {
              (window as any).chatCalls.push({ method: 'stop' });
              (window as any).chatFixtureState = {
                ...(window as any).chatFixtureState,
                running: false,
                approvals: [],
              };
            },
            DecideChat: async (...args: any[]) => {
              (window as any).chatCalls.push({ method: 'decide', args });
              (window as any).chatFixtureState = {
                ...(window as any).chatFixtureState,
                approvals: [],
              };
            },
          },
        },
      };
    },
    { id, approval, long },
  );
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Chat with Codex', exact: true })
    .click();
  await expect(page.getByLabel('Chat model', { exact: true })).toHaveValue('fixture-model');
  return id;
}
