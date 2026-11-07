import { chromium, expect } from '../../../web/node_modules/@playwright/test/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(project, '../..');
const demo = readFileSync(join(project, 'demo-location.txt'), 'utf8').trim();
const allowed = join(root, '.test-work', 'launch-film-');
if (!demo.startsWith(allowed) || !demo.endsWith('demo-checkout'))
  throw Error('Not a disposable film repository');
const binary = resolve(
  process.env.AGENTTM_VIDEO_BINARY || join(root, 'bin/icon-refresh/agenttm-cli.exe'),
);
const run = (tool, args) =>
  execFileSync(tool, args, { cwd: demo, encoding: 'utf8', windowsHide: true }).trim();
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(join(demo, file)))
    .digest('hex');
const fingerprint = () => ({
  head: run('git', ['rev-parse', 'HEAD']),
  index: hash('.git/index'),
  cart: hash('src/cart.ts'),
  tests: hash('test/cart.test.ts'),
});
const before = fingerprint();
const child = spawn(binary, ['ui', '--port', '0', '--no-browser'], {
  cwd: demo,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (value) => {
  output += value;
});
child.stderr.on('data', (value) => {
  output += value;
});
child.on('error', (error) => {
  output += error.message;
});
let browser;
const shots = {};
const errors = [];
try {
  const deadline = Date.now() + 20000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) {
    if (child.exitCode !== null || Date.now() > deadline) throw Error(output);
    await new Promise((done) => setTimeout(done, 100));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const get = async (path) => {
    const response = await fetch(url + '/api' + path);
    if (!response.ok) throw Error(await response.text());
    return response.json();
  };
  const source = JSON.parse(readFileSync(join(project, 'capture-report.json'), 'utf8'));
  const session = (await get('/sessions')).items.find((item) => item.id === source.session);
  if (!session) throw Error('Original real Codex demo recording is missing');
  const checkpoints = (await get(`/sessions/${session.id}/checkpoints`)).items;
  let changed;
  for (const checkpoint of checkpoints) {
    const diff = await get(`/checkpoints/${checkpoint.id}/diff`);
    if (diff.items.some((item) => item.path === 'src/cart.ts' && item.kind === 'modified')) {
      changed = checkpoint;
      break;
    }
  }
  if (!changed) throw Error('No actual captured cart modification');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 800 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const point = async (locator) => {
    const box = await locator.boundingBox();
    if (!box || box.y < 0 || box.y + box.height > 800)
      throw Error('Target is outside the captured viewport');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const capture = async (name, targets) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const positions = {};
    for (const [key, locator] of Object.entries(targets)) positions[key] = await point(locator);
    const buffer = await page.screenshot({ animations: 'disabled' });
    writeFileSync(join(project, 'public/updated', name + '.png'), buffer);
    shots[name] = { targets: positions, sha256: createHash('sha256').update(buffer).digest('hex') };
    console.log('Captured:', name);
  };
  await page.goto(url);
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const history = nav.getByRole('button', { name: 'History', exact: true });
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await capture('overview', { history });
  await history.click();
  await expect(page.locator('.milestone').first()).toBeVisible();
  const filter = page.getByRole('button', { name: 'Checkpoints', exact: true });
  await filter.scrollIntoViewIfNeeded();
  await capture('history', { filter });
  await filter.click();
  const inspect = page.getByRole('button', {
    name: `Inspect checkpoint ${changed.id.slice(0, 8)}`,
    exact: true,
  });
  await inspect.scrollIntoViewIfNeeded();
  await capture('checkpoints', { inspect });
  await inspect.click();
  await page.getByRole('button', { name: 'cart.ts', exact: true }).click();
  await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('quantity');
  const changes = page.getByRole('tab', { name: 'Changes', exact: true });
  await capture('files', { changes });
  await changes.click();
  const cart = page.getByRole('button', { name: 'src/cart.ts', exact: true });
  await cart.click();
  await expect(page.locator('.monaco-diff-editor')).toBeVisible();
  const split = page.getByRole('button', { name: 'Split', exact: true });
  await capture('changes', { split });
  await split.click();
  await page.mouse.move(1300, 470);
  await page.mouse.wheel(240, 0);
  await page.mouse.move(730, 470);
  await page.mouse.wheel(240, 0);
  await page.waitForTimeout(200);
  const restore = page.getByRole('button', { name: 'Restore checkpoint', exact: true });
  await capture('split', { restore });
  await restore.click();
  const dialog = page.getByRole('dialog', { name: 'Restore checkpoint', exact: true });
  await expect(dialog).toBeVisible();
  const name = `cart-checkpoint-${Date.now().toString(36).slice(-4)}`;
  await page.getByLabel('New fork name').fill(name);
  const consent = page.getByRole('checkbox');
  if (await consent.count()) await consent.check();
  const confirm = page.getByRole('button', { name: 'Create restored worktree', exact: true });
  await expect(confirm).toBeEnabled();
  await capture('restore', { confirm });
  await confirm.click();
  await expect(
    page.getByRole('heading', { name: 'Checkpoint restored', exact: true }),
  ).toBeVisible();
  const view = page.getByRole('button', { name: 'View restored workspaces', exact: true });
  await capture('restored', { view });
  await view.click();
  const row = page.locator('.restores-row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.click();
  await capture('workspaces', { row });
  const restored = await get('/forks');
  const result = restored.items.find((item) => item.worktree_path.endsWith(name));
  if (result?.status !== 'ready') throw Error('Restore was not verified by the backend');
  const original = await get(`/checkpoints/${changed.id}/file?path=src%2Fcart.ts`);
  if (readFileSync(join(result.worktree_path, 'src/cart.ts'), 'utf8') !== original.content)
    throw Error('Restored cart differs from captured content');
  const after = fingerprint();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Original repository changed');
  if (errors.length) throw Error(errors.join('\n'));
  const report = {
    capturedAt: new Date().toISOString(),
    viewport: { width: 1600, height: 800 },
    pixels: { width: 3200, height: 1600 },
    session: session.id,
    checkpoint: changed.id,
    source: 'Current production React UI; existing real Codex recording; edited demonstration',
    restore: result,
    originalPreserved: true,
    before,
    after,
    browserErrors: errors,
    shots,
  };
  writeFileSync(join(project, 'public/updated/capture.json'), JSON.stringify(report, null, 2));
  console.log('Updated captures and real restore verified.');
} finally {
  await browser?.close();
  if (child.exitCode === null) child.kill();
}
