import { test, expect } from '@playwright/test';
test('muted product palette and edge-to-edge screenshots preserve the layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    ),
  ).toBe('#70cc8c');
  const surface = await page
    .locator('.hero')
    .evaluate((node) =>
      getComputedStyle(node).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number),
    );
  expect(Math.max(...surface) - Math.min(...surface)).toBeLessThanOrEqual(8);
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ['Session timeline', 'File history & diffs', 'Safe restoration']) {
      await page.getByRole('tab', { name, exact: true }).click();
      const panel = page.getByRole('tabpanel', { name, exact: true });
      const image = panel.getByRole('img');
      await image.evaluate(async (node: HTMLImageElement) => node.decode());
      await expect(image).toHaveCSS('object-fit', 'cover');
      const bounds = await image.evaluate((node) => {
        const image = node.getBoundingClientRect();
        const frame = node.parentElement!.getBoundingClientRect();
        return {
          left: Math.abs(image.left - frame.left),
          top: Math.abs(image.top - frame.top),
          width: Math.abs(image.width - frame.width),
          height: Math.abs(image.height - frame.height),
        };
      });
      for (const difference of Object.values(bounds)) expect(difference).toBeLessThan(1);
    }
    await page.getByRole('tab', { name: 'Session timeline', exact: true }).click();
    await page
      .locator('.focus-shot-timeline img')
      .evaluate(async (node: HTMLImageElement) => node.decode());
    await page.locator('#features').screenshot({
      path: test.info().outputPath(`muted-showcase-${width}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.hero-preview video')).toHaveJSProperty('videoWidth', 1920);
  await page.screenshot({
    path: test.info().outputPath('muted-hero.png'),
    animations: 'disabled',
  });
});

test('walkthrough crossfades screens without exposing inactive controls or shifting the frame', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Session timeline', exact: true }).click();
  const first = page.locator('#panel-timeline');
  const next = page.locator('#panel-diffs');
  await expect(first).toHaveCSS('opacity', '1');
  const before = await page.locator('.focus-panel-stack').boundingBox();
  await page.getByRole('tab', { name: 'File history & diffs', exact: true }).click();
  await expect(first).toHaveAttribute('aria-hidden', 'true');
  await expect(first).toHaveAttribute('inert', '');
  await expect(page.locator('.focus-panel-stack').getByRole('tabpanel')).toHaveCount(1);
  await expect(next).toHaveCSS('transition-duration', '0.55s, 0s');
  expect(
    await next.evaluate((node) =>
      node.getAnimations().some((animation) => animation.playState === 'running'),
    ),
  ).toBe(true);
  await expect(next).toHaveCSS('opacity', '1');
  await expect(first).toHaveCSS('opacity', '0');
  const after = await page.locator('.focus-panel-stack').boundingBox();
  expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Safe restoration', exact: true }).click();
  await expect(page.locator('#panel-restore')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('#panel-restore')).toHaveCSS('opacity', '1');
});

test('website icons share a green tone with contrast on green buttons', async ({ page }) => {
  await page.goto('/');
  const colors = await page
    .locator('svg.icon, svg.platform-mark, .capture-expand > svg')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).color.match(/\d+/g)!.slice(0, 3).map(Number)),
    );
  expect(colors.length).toBeGreaterThan(25);
  for (const [r, g, b] of colors) {
    expect(g).toBeGreaterThan(r + 10);
    expect(g).toBeGreaterThan(b + 3);
  }
  await expect(page.locator('.hero .hero-actions .button:not(.button-secondary) .icon')).toHaveCSS(
    'color',
    'rgb(12, 59, 34)',
  );
  await expect(page.locator('.github-link .icon')).toHaveCSS('color', 'rgb(138, 203, 156)');
});
