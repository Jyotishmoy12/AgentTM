import { test, expect } from '@playwright/test';
test('walkthrough starts automatically, advances faster, and supports pause and manual selection', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pause walkthrough', exact: true })).toHaveCount(1);
  await expect(page.locator('.showcase-tabs')).not.toHaveClass(/is-advancing/);
  await page.locator('#features').scrollIntoViewIfNeeded();
  await expect(page.locator('.showcase-tabs')).toHaveClass(/is-advancing/);
  await page.clock.fastForward(3100);
  const diffs = page.getByRole('tab', {
    name: 'File history & diffs',
    exact: true,
  });
  await expect(diffs).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Pause walkthrough', exact: true }).click();
  await page.clock.fastForward(6500);
  await expect(diffs).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Play walkthrough', exact: true }).click();
  await page.getByRole('button', { name: 'Pause animations', exact: true }).click();
  await expect(page.locator('.showcase-tabs')).not.toHaveClass(/is-advancing/);
  await page.clock.fastForward(6500);
  await expect(diffs).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Resume animations', exact: true }).click();
  await page.locator('#features').scrollIntoViewIfNeeded();
  await expect(page.locator('.showcase-tabs')).toHaveClass(/is-advancing/);
  await page.clock.fastForward(3100);
  await expect(page.getByRole('tab', { name: 'Safe restoration', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Session timeline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play walkthrough', exact: true })).toBeVisible();
  await page.clock.fastForward(6500);
  await expect(page.getByRole('tab', { name: 'Session timeline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('system reduced motion disables automatic motion and keeps the feature grid readable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'System reduced motion enabled' })).toBeDisabled();
  await expect(page.locator('.marketing-site')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('.reveal').last()).toHaveCSS('opacity', '1');
  await page.locator('.feature-grid').scrollIntoViewIfNeeded();
  await expect(page.locator('.feature-card')).toHaveCount(6);
  await expect(page.locator('.mini-terminal')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.data-packet')).toHaveCSS('animation-name', 'none');
  await page.locator('.feature-grid').screenshot({
    path: test.info().outputPath('feature-grid.png'),
    animations: 'disabled',
  });
});

test('focused captures can be enlarged without leaving the page or losing keyboard focus', async ({
  page,
}) => {
  await page.goto('/');
  for (const name of ['Session timeline', 'File history & diffs', 'Safe restoration']) {
    await page.getByRole('tab', { name, exact: true }).click();
    const enlarge = page.getByRole('button', {
      name: 'Enlarge capture',
      exact: true,
    });
    await enlarge.click();
    const dialog = page.getByRole('dialog', {
      name: 'Enlarged AgentTM capture',
    });
    await expect(dialog).toBeVisible();
    const image = dialog.getByRole('img');
    await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode();
    });
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(
      1000,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(enlarge).toBeFocused();
  }
  await expect(page.locator('.focus-shot-restore img')).toHaveAttribute(
    'src',
    /workspaces-detail.png$/,
  );
});

test('feature navigation leaves a compact header offset and brings the product into view', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Features', exact: true })
    .click();
  const section = await page.locator('#features').boundingBox();
  const header = await page.locator('.site-header').boundingBox();
  const viewer = await page.locator('.focus-panel-stack > .is-active .focus-viewer').boundingBox();
  expect(section!.y).toBeGreaterThanOrEqual(header!.height);
  expect(section!.y).toBeLessThan(header!.height + 25);
  expect(viewer!.y).toBeLessThan(230);
  expect(viewer!.y + viewer!.height).toBeLessThan(900);
});

test('Git comparison is accurate, linked and usable on mobile', async ({ page }) => {
  await page.goto('/');
  const comparison = page.getByRole('region', {
    name: 'Git and AgentTM feature comparison',
    exact: true,
  });
  await page.getByRole('link', { name: 'Compare with Git', exact: true }).click();
  await expect(comparison).toBeVisible();
  await expect(comparison.getByRole('row')).toHaveCount(8);
  await expect(comparison).toContainText('Set up with git worktree');
  await expect(comparison).toContainText('Save manually, for example with stash');
  await expect(page.locator('.comparison-notes')).toContainText(
    'exact action-to-line attribution is not available',
  );
  await expect(page.locator('.comparison-notes')).toContainText('published releases may differ');
  await page
    .locator('#compare')
    .screenshot({ path: test.info().outputPath('comparison-desktop.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await comparison.focus();
  await expect(comparison).toBeFocused();
  await comparison.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });
  expect(await comparison.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .locator('#compare')
    .screenshot({ path: test.info().outputPath('comparison-mobile.png') });
});

test('website uses current desktop captures and labels the older workflow video', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.hero-preview img')).toHaveAttribute('src', /history.png$/);
  await expect(page.locator('.preview-caption')).toContainText('Current desktop source build');
  for (const [tab, file] of [
    ['Session timeline', 'history-detail.png'],
    ['File history & diffs', 'explorer-detail.png'],
    ['Safe restoration', 'workspaces-detail.png'],
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const image = page.getByRole('tabpanel', { name: tab, exact: true }).getByRole('img');
    await expect(image).toHaveAttribute('src', new RegExp(file.replaceAll('.', '\\.') + '$'));
    await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode();
    });
    await expect(image).toHaveJSProperty('naturalWidth', 2740);
    await expect(image).toHaveJSProperty('naturalHeight', 1854);
    const box = await image.boundingBox();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(100);
    await page.locator('#features').screenshot({ path: test.info().outputPath(file) });
  }
  await page.getByRole('button', { name: 'Watch the 30-second demo', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'AgentTM in 30 seconds' })).toContainText(
    'Earlier-interface workflow demo',
  );
});
