import { test, expect } from '@playwright/test';
for (const width of [375, 768, 1024, 1440]) {
  test(`layout and showcase at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Know what happened.');
    await page.locator('.hero-preview img').evaluate(async (image: HTMLImageElement) => {
      await image.decode();
    });
    await expect(page.locator('.hero-preview img')).toHaveJSProperty('naturalWidth', 3200);
    await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-preview .product-frame')).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: test.info().outputPath('hero.png') });
    await page.getByRole('tab', { name: 'File history & diffs' }).click();
    await expect(page.getByRole('tabpanel', { name: 'File history & diffs' })).toBeVisible();
    await expect(
      page.getByRole('tabpanel', { name: 'File history & diffs' }).getByRole('img'),
    ).toHaveAttribute('src', /explorer-detail.png$/);
    await page.getByRole('tab', { name: 'Safe restoration' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'A separate workspace. A fresh starting point.',
      }),
    ).toBeVisible();
    await page.locator('#features').scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath('showcase.png') });
    await page.getByRole('tab', { name: 'Requirements' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Requirements' })).toContainText('Git 2.42+');
    await page.getByRole('radio', { name: 'macOS', exact: true }).check();
    await expect(page.getByRole('link', { name: 'macOS install guide' })).toHaveAttribute(
      'href',
      /install\/macos\/README.md$/,
    );
    await page.getByRole('radio', { name: 'Linux', exact: true }).check();
    await expect(page.getByRole('link', { name: 'Linux install guide' })).toHaveAttribute(
      'href',
      /install\/linux\/README.md$/,
    );
    await page.getByRole('tab', { name: 'Quick start' }).click();
    await page.locator('#install').scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath('installation.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

test('keyboard tabs, mobile navigation, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.locator('.menu-button');
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Features' })
    .click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await menu.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  const timeline = page.getByRole('tab', { name: 'Session timeline' });
  await timeline.focus();
  await timeline.press('ArrowRight');
  const diffs = page.getByRole('tab', { name: 'File history & diffs' });
  await expect(diffs).toBeFocused();
  await expect(diffs).toHaveAttribute('aria-selected', 'true');
  await diffs.press('End');
  await expect(page.getByRole('tab', { name: 'Safe restoration' })).toBeFocused();
  const quick = page.getByRole('tab', { name: 'Quick start' });
  await quick.focus();
  await quick.press('ArrowDown');
  await expect(page.getByRole('tab', { name: 'Requirements' })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
});

test('copy feedback and accessible video playback controls', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Quick start', exact: true }).click();
  await page.getByRole('button', { name: 'Copy agenttm init', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('agenttm init');
  const trigger = page.getByRole('button', {
    name: 'Watch the 30-second demo',
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'AgentTM in 30 seconds' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('controls', true);
  await expect(page.locator('video')).toHaveJSProperty('autoplay', false);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('download choices distinguish desktop from CLI and keep the matching guide in sync', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('radio', { name: 'Windows', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Desktop app', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('tab', { name: 'Desktop', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('link', { name: /Get AgentTM for Windows/ })).toHaveAttribute(
    'href',
    'https://github.com/Jyotishmoy12/AgentTM/releases/latest',
  );
  await expect(page.locator('.install-journey li')).toHaveCount(3);
  await page.getByRole('radio', { name: 'macOS', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Desktop app', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', {
      name: 'CLI and browser dashboard',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('tab', { name: 'Quick start', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('link', { name: /Get AgentTM for macOS/ })).toBeVisible();
  await expect(page.locator('.download-main-button')).toContainText('Apple silicon & Intel');
  await page.getByRole('radio', { name: 'Windows', exact: true }).check();
  await page.getByRole('button', { name: 'Desktop app', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Desktop', exact: true })).toContainText(
    'WebView2',
  );
  await page.screenshot({
    path: test.info().outputPath('download-desktop.png'),
  });
});

test('production page has no missing local resources or placeholder links', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4178') && response.status() >= 400)
      failed.push(response.url());
  });
  await page.goto('/');
  for (const name of ['File history & diffs', 'Safe restoration'])
    await page.getByRole('tab', { name }).click();
  await page.getByRole('button', { name: 'Watch the 30-second demo' }).click();
  await page.locator('video').evaluate(
    (video) =>
      new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) resolve();
        else {
          video.addEventListener('loadedmetadata', () => resolve(), {
            once: true,
          });
          video.addEventListener('error', () => reject(new Error('Video metadata failed')), {
            once: true,
          });
        }
      }),
  );
  expect(await page.locator('video').evaluate((video) => Math.round(video.duration))).toBe(30);
  expect(await page.locator('a[href="#"]').count()).toBe(0);
  expect(failed).toEqual([]);
});

test('global motion control stops decoration and reveals all content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.marketing-site')).toHaveAttribute('data-motion', 'running');
  await page.getByRole('button', { name: 'Pause animations', exact: true }).click();
  await expect(page.locator('.marketing-site')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.light-trail')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.reveal').last()).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Resume animations', exact: true }).click();
  await expect(page.locator('.marketing-site')).toHaveAttribute('data-motion', 'running');
  await expect(page.locator('.light-trail')).toHaveCSS('animation-name', 'trace-light');
});
