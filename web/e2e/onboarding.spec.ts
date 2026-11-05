import { test, expect } from '@playwright/test';

test('desktop setup guides installation, rechecks readiness, and can be reopened', async ({
  page,
}) => {
  // Exercise native bridge states without installing or authenticating Codex.
  await page.addInitScript(() => {
    let checks = 0;
    (window as any).go = {
      main: {
        Desktop: {
          CheckSetup: async () => ({
            state:
              ++checks > 1 || localStorage.getItem('agenttm:onboarding:v1') === 'done'
                ? 'ready'
                : 'missing',
            version: checks > 1 ? 'codex-cli test' : '',
            project: 'demo',
            path: 'C:\\projects\\demo',
          }),
          CopyText: async (text: string) => {
            (window as any).copiedCommand = text;
          },
          OpenCodexDocs: async () => {},
        },
      },
    };
  });
  await page.goto('/');
  const guide = page.getByRole('dialog', { name: 'Welcome' });
  await expect(guide).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your workspace', exact: true })).toBeVisible();
  await expect(page.getByText('C:\\projects\\demo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Install Codex', exact: true })).toBeVisible();
  await page
    .locator('.setup-command')
    .filter({ hasText: 'npm.cmd install' })
    .getByRole('button')
    .click();
  expect(await page.evaluate(() => (window as any).copiedCommand)).toBe(
    'npm.cmd install -g @openai/codex',
  );
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Codex is not available');
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Codex is ready');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Finish setup', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Setup guide', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'First recording' })).toBeVisible();
  await page.setViewportSize({ width: 760, height: 550 });
  await expect(page.getByRole('button', { name: 'Finish setup', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Explore history for now' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Setup guide', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
