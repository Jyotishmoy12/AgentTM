import { test, expect } from '@playwright/test';
export async function setup(page: any) {
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
export async function open(page: any) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Storage & backups', exact: true })
    .click();
}
