// Capture the actual dashboard and execute one restore in the disposable demo.
import { chromium, expect } from '../../../web/node_modules/@playwright/test/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(project, '../..');
const demo = readFileSync(join(project, 'demo-location.txt'), 'utf8').trim();
if (!demo.startsWith(join(root, '.test-work', 'launch-film-')) || !demo.endsWith('demo-checkout')) throw new Error('Only the disposable film demo is accepted');
const binary = join(root, 'bin/agenttm.exe');
const cli = args => execFileSync(binary, args, { cwd: demo, encoding: 'utf8', windowsHide: true });
const git = args => execFileSync('git', args, { cwd: demo, encoding: 'utf8', windowsHide: true }).trim();
const hash = path => createHash('sha256').update(readFileSync(join(demo, path))).digest('hex');
const originals = { head: git(['rev-parse', 'HEAD']), index: hash('.git/index'), cart: hash('src/cart.ts'), tests: hash('test/cart.test.ts') };
const forkName = `before-cart-fix-${Date.now().toString(36)}`;
const child = spawn(binary, ['ui', '--no-browser', '--port', '0'], { cwd: demo, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', data => { output += data; });
child.stderr.on('data', data => { output += data; });
child.on('error', error => { output += error.message; });
const textures = join(project, 'public/textures');
mkdirSync(textures, { recursive: true });
const layout = {};
let browser;
try {
  const deadline = Date.now() + 20000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const sessions = await (await fetch(url + '/api/sessions')).json();
  const session = sessions.items[0].id;
  const checkpoints = (await (await fetch(url + `/api/sessions/${session}/checkpoints`)).json()).items;
  const baseline = checkpoints[0].id;
  let changed;
  for (const cp of checkpoints) {
    const diff = await (await fetch(url + `/api/checkpoints/${cp.id}/diff`)).json();
    if (diff.items?.some(item => item.path === 'src/cart.ts' && item.kind === 'modified')) changed = cp.id;
  }
  if (!changed) throw new Error('No changed checkpoint');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function capture(name, selector) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(textures, `${name}.png`), fullPage: false });
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Missing capture element ${selector}`);
    layout[name] = { viewport: { width: 1600, height: 1000 }, focus: box, source: 'unmodified production UI, disposable demo project' };
    await page.locator(selector).first().screenshot({ path: join(textures, `${name}-detail.png`) });
  }
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await capture('overview', '.overview-welcome');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.getByRole('button', { name: `Open session ${session.slice(0, 8)}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Timeline', exact: true })).toBeVisible();
  const fileEvent = page.locator('.event-card').filter({ hasText: /file.change/i }).filter({ hasText: /item\s*\/\s*completed/i }).first();
  if (await fileEvent.count()) await fileEvent.click();
  await capture('timeline', '.timeline-workspace');
  await page.locator('.event-card.selected').screenshot({ path: join(textures, 'event-detail.png') });
  await page.getByRole('tab', { name: 'Changes', exact: true }).click();
  await page.getByLabel('Select checkpoint').selectOption(changed);
  await expect(page.locator('.diff-heading')).toContainText('changed paths');
  await expect(page.locator('.line-add').first()).toBeVisible();
  await capture('changes', '.diff-layout');
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await page.getByLabel('Select checkpoint').selectOption(baseline);
  await page.getByRole('button', { name: 'cart.ts', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await capture('baseline', '.editor-panel');
  await page.getByRole('button', { name: 'Fork checkpoint', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Fork checkpoint', exact: true });
  await expect(dialog).toBeVisible();
  await page.getByLabel('New fork name').fill(forkName);
  await expect(page.getByRole('button', { name: 'Create isolated fork' })).toBeEnabled();
  await capture('restore', '.fork-dialog');
  await page.getByRole('button', { name: 'Create isolated fork' }).click();
  await expect(page.getByRole('heading', { name: 'Checkpoint restored' })).toBeVisible();
  await capture('restored', '.fork-dialog');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await nav.getByRole('button', { name: 'Restored workspaces', exact: true }).click();
  await expect(page.locator('.restored-card').first()).toBeVisible();
  await capture('workspaces', '.restored-card');
  if (originals.head !== git(['rev-parse', 'HEAD']) || originals.index !== hash('.git/index') || originals.cart !== hash('src/cart.ts') || originals.tests !== hash('test/cart.test.ts')) throw new Error('Restore altered original project');
  const restored = readFileSync(join(demo, '.agenttm/worktrees', forkName, 'src/cart.ts'), 'utf8');
  if (restored.includes('item.unitPriceCents * item.quantity')) throw new Error('Restore is not the baseline');
  const diagnostic = cli(['doctor']);
  if (errors.length) throw new Error(errors.join('\n'));
  writeFileSync(join(project, 'public/layout.json'), JSON.stringify(layout, null, 2));
  writeFileSync(join(project, 'capture-report.json'), JSON.stringify({ session, baseline, changed, checkpoints: checkpoints.length, originalPreserved: true, integrity: diagnostic, browserErrors: errors, demo }, null, 2));
  console.log('Real UI capture and isolated restore: PASS');
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) child.kill();
}
