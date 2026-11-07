// Read-only captures of the current embedded UI using the existing disposable film recording.
import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const demo = readFileSync(join(root, 'marketing/launch-video/demo-location.txt'), 'utf8').trim();
if (!demo.startsWith(join(root, '.test-work', 'launch-film-')) || !demo.endsWith('demo-checkout'))
  throw Error('Only the disposable film project is allowed');
const git = (args) =>
  execFileSync('git', args, {
    cwd: demo,
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(join(demo, file)))
    .digest('hex');
const before = {
  head: git(['rev-parse', 'HEAD']),
  index: hash('.git/index'),
  cart: hash('src/cart.ts'),
  tests: hash('test/cart.test.ts'),
};
const child = spawn(join(root, 'bin/agenttm.exe'), ['ui', '--no-browser', '--port', '0'], {
  cwd: demo,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (data) => {
  output += data;
});
child.stderr.on('data', (data) => {
  output += data;
});
child.on('error', (error) => {
  output += error.message;
});
let browser;
const manifest = {
  source: 'Current source-build production React UI; existing disposable Codex demo recording',
  images: {},
  originalPreserved: false,
};
try {
  const deadline = Date.now() + 20000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) {
    if (child.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((done) => setTimeout(done, 100));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const sessions = (await (await fetch(url + '/api/sessions')).json()).items;
  const previous = JSON.parse(
    readFileSync(join(root, 'marketing/launch-video/capture-report.json'), 'utf8'),
  );
  const session = sessions.find((item) => item.id === previous.session) || sessions[0];
  if (!session) throw Error('No recorded session');
  const cps = (await (await fetch(url + `/api/sessions/${session.id}/checkpoints`)).json()).items;
  let changed;
  for (const cp of cps) {
    const diff = await (await fetch(url + `/api/checkpoints/${cp.id}/diff`)).json();
    if (diff.items?.some((item) => item.path === 'src/cart.ts' && item.kind === 'modified'))
      changed = cp;
  }
  if (!changed) throw Error('No recorded cart change');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  await page.addInitScript(() => localStorage.setItem('agenttm:onboarding:v1', 'done'));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function capture(name, locator) {
    await page.evaluate(() => document.fonts.ready);
    const buffer = locator
      ? await page.locator(locator).screenshot({ animations: 'disabled' })
      : await page.screenshot({ animations: 'disabled' });
    writeFileSync(join(root, 'website/public/images', name), buffer);
    manifest.images[name] = {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  await page.goto(url);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await capture('overview.png');
  await page
    .getByRole('button', {
      name: `Open session ${session.id.slice(0, 8)}`,
      exact: true,
    })
    .click();
  await expect(page.getByRole('region', { name: 'Visual History' })).toBeVisible();
  await expect(page.locator('.milestone').first()).toBeVisible();
  await capture('history.png');
  await capture('history-detail.png', '.history-experience');
  await page
    .getByRole('button', {
      name: `Inspect checkpoint ${changed.id.slice(0, 8)}`,
      exact: true,
    })
    .click();
  await page.getByRole('tab', { name: 'Changes', exact: true }).click();
  await expect(page.locator('.monaco-diff-editor')).toBeVisible();
  await page.getByRole('button', { name: 'src/cart.ts', exact: true }).click();
  await expect(page.locator('.monaco-diff-editor .view-lines').first()).toContainText('quantity');
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await capture('explorer.png');
  await capture('explorer-detail.png', '.checkpoint-explorer');
  await nav.getByRole('button', { name: 'Restored workspaces', exact: true }).click();
  const rows = page.locator('.restores-row');
  await expect(rows.first()).toBeVisible();
  await rows.first().click();
  await expect(page.locator('.restores-details')).toBeVisible();
  await capture('workspaces.png');
  await capture('workspaces-detail.png', '.restore-manager');
  const after = {
    head: git(['rev-parse', 'HEAD']),
    index: hash('.git/index'),
    cart: hash('src/cart.ts'),
    tests: hash('test/cart.test.ts'),
  };
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error('Capture changed original project');
  if (errors.length) throw Error(errors.join('\n'));
  manifest.originalPreserved = true;
  writeFileSync(
    join(root, 'website/public/images/capture-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await browser?.close();
  if (child.exitCode === null) child.kill();
}
