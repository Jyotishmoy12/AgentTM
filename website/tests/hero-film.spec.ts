import { test, expect } from '@playwright/test';

test('hero film autoplays silently without player controls and follows the site pause toggle', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const video = page.getByLabel('AgentTM product tour', { exact: true });
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty('autoplay', true);
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('controls', false);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(video).toHaveAttribute('playsinline', '');
  await expect
    .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
    .toBeGreaterThan(0.2);
  await expect(video).toHaveJSProperty('paused', false);
  expect(await video.evaluate((node: HTMLVideoElement) => Math.round(node.duration))).toBe(40);
  await page.getByRole('button', { name: 'Pause animations', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Resume animations', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', false);
  await page.screenshot({ path: test.info().outputPath('hero-film-desktop.png') });
});

test('reduced motion leaves a static poster; mobile playback remains inline and fits the frame', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/');
  const video = page.getByLabel('AgentTM product tour', { exact: true });
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty('autoplay', false);
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveJSProperty('controls', false);
  const bounds = await video.boundingBox();
  expect(Math.abs(bounds!.width / bounds!.height - 16 / 9)).toBeLessThan(0.02);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveJSProperty('muted', true);
  await page.screenshot({ path: test.info().outputPath('hero-film-mobile.png') });
});

test('blocked video loading has an explicit retry instead of an empty hero', async ({ page }) => {
  await page.route('**/media/agenttm-product-tour.mp4', (route) => route.abort());
  await page.goto('/');
  const video = page.getByLabel('AgentTM product tour', { exact: true });
  await video.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Play product tour', exact: true })).toBeVisible();
  await expect(video).toHaveAttribute('poster', /product-tour-poster.png$/);
  await expect(video).toHaveJSProperty('controls', false);
});
