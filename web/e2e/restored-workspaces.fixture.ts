import { test, expect } from '@playwright/test';
export async function ledger(page: any, request: any) {
  const { items: sessions } = await (await request.get('/api/sessions')).json();
  const { items: cps } = await (
    await request.get(`/api/sessions/${sessions[0].id}/checkpoints`)
  ).json();
  const items = [
    {
      id: 'restore-a',
      checkpoint_id: cps[0].id,
      branch_name: 'agenttm/parser-review',
      worktree_path: 'C:\\recorded project\\.agenttm\\worktrees\\parser-review',
      status: 'ready',
      created_at: '2026-11-05T10:00:00Z',
    },
    {
      id: 'restore-b',
      checkpoint_id: cps.at(-1).id,
      branch_name: 'agenttm/auth-investigation',
      worktree_path: 'C:\\recorded project\\.agenttm\\worktrees\\auth-investigation',
      status: 'failed',
      created_at: '2026-11-04T09:00:00Z',
    },
    {
      id: 'restore-c',
      checkpoint_id: cps.at(-1).id,
      branch_name: 'agenttm/config-check',
      worktree_path: 'C:\\recorded project\\.agenttm\\worktrees\\config-check',
      status: 'restoring',
      created_at: '2026-11-03T08:00:00Z',
    },
  ];
  await page.route('**/api/forks*', (route: any) =>
    route.fulfill({ json: { items, next_cursor: null } }),
  );
  return { items, cps };
}
export async function native(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    (window as any).restoreCalls = [];
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({ state: 'ready' }),
          CopyText: async (value: string) => {
            (window as any).restoreCalls.push(['copy', value]);
          },
          CheckRestoredWorkspace: async (id: string) => {
            (window as any).restoreCalls.push(['check', id]);
            return {
              state: id === 'restore-b' ? 'missing' : 'available',
              checked_at: '2026-11-05T12:00:00Z',
              message:
                id === 'restore-b'
                  ? 'The recorded folder was not found. It may have been moved or removed.'
                  : 'Folder is accessible. Git registration and file integrity were not re-verified.',
            };
          },
          OpenRestoredWorkspace: async (id: string) => {
            (window as any).restoreCalls.push(['open', id]);
          },
        },
      },
    };
  });
}
export async function open(page: any) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Restored workspaces', exact: true })
    .click();
}
