import { test, expect } from '@playwright/test';

test('desktop icons share the website green across navigation, pages and dialogs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('agenttm:onboarding:v1', 'done');
    (window as any).go = {
      main: {
        Desktop: {
          ProjectPath: async () => 'C:\\Projects\\AgentTM',
          CheckSetup: async () => ({
            state: 'ready',
            version: 'test',
            project: 'AgentTM',
            path: 'C:\\Projects\\AgentTM',
          }),
          OpenProjectWindow: async () => false,
        },
      },
    };
  });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  for (const name of [
    'Overview',
    'Chat with Codex',
    'History',
    'Restored workspaces',
    'Storage & backups',
    'Settings',
  ]) {
    await navigation.getByRole('button', { name, exact: true }).click();
    const icons = navigation.locator('svg.app-icon');
    expect(await icons.count()).toBeGreaterThan(4);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveCSS('color', 'rgb(138, 203, 156)');
    }
  }
  await page.getByRole('button', { name: 'Project selector', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Your workspace' });
  await expect(dialog.locator('.project-current-identity svg.app-icon')).toHaveCSS(
    'color',
    'rgb(138, 203, 156)',
  );
  const primary = dialog.locator('.primary-button svg.app-icon');
  await expect(primary).toHaveCSS('color', 'rgb(12, 59, 34)');
  await page.screenshot({ path: test.info().outputPath('green-project-icons.png') });
});

test('failure icons retain their warning color', async ({ page }) => {
  await page.goto('/');
  const marker = await page.locator('.app-shell').evaluateHandle((shell) => {
    const marker = document.createElement('span');
    marker.className = 'marker-failure';
    const icon = shell.querySelector('svg.app-icon')!.cloneNode(true);
    marker.append(icon);
    shell.append(marker);
    return icon;
  });
  expect(await marker.evaluate((icon) => getComputedStyle(icon as Element).color)).toBe(
    'rgb(214, 160, 146)',
  );
});
