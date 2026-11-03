import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../../internal/desktop/launcher.js', import.meta.url), 'utf8');
function welcome(choose) {
  let click;
  let reloads = 0;
  const button = { disabled: false, addEventListener: (name, callback) => { click = callback; } };
  const status = { textContent: '' };
  const window = { location: { reload: () => reloads++ } };
  if (choose) window.go = { main: { Desktop: { ChooseProject: choose } } };
  runInNewContext(source, { window, document: { getElementById: id => id === 'open' ? button : status } });
  return { click: () => click(), button, status, reloads: () => reloads };
}

test('welcome reloads dashboard only after project opens', async () => {
  let finish;
  const page = welcome(() => new Promise(resolve => { finish = resolve; }));
  const pending = page.click();
  assert.equal(page.button.disabled, true);
  assert.equal(page.reloads(), 0);
  finish(true);
  await pending;
  assert.equal(page.reloads(), 1);
});

test('welcome cancellation, errors and bridge startup permit retry', async () => {
  const cancelled = welcome(async () => false);
  await cancelled.click();
  assert.equal(cancelled.reloads(), 0);
  assert.equal(cancelled.button.disabled, false);
  assert.match(cancelled.status.textContent, /No project opened/);
  let attempts = 0;
  const failed = welcome(async () => { if (++attempts === 1) throw new Error('not a Git project'); return true; });
  await failed.click();
  assert.match(failed.status.textContent, /not a Git project/);
  assert.equal(failed.button.disabled, false);
  await failed.click();
  assert.equal(failed.reloads(), 1);
  const starting = welcome();
  await starting.click();
  assert.match(starting.status.textContent, /bridge is not ready/);
  assert.equal(starting.button.disabled, false);
});
