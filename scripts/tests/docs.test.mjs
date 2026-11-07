import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { checkDocumentation } from '../lib/docs.mjs';

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'agenttm-docs-test-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.match(basename(root), /^agenttm-docs-test-/);
    rmSync(root, { recursive: true, force: true });
  });
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

test('relative links, images, duplicate headings and Unicode anchors resolve', (t) => {
  const root = fixture(t, {
    'README.md':
      '# Home\n[Guide](guide.md#setup-1)\n![Image](image.png)\n[Unicode](guide.md#日本語)',
    'guide.md': '# Setup\n## Setup\n# 日本語',
    'image.png': 'fixture',
  });
  const result = checkDocumentation(root);
  assert.equal(result.files.length, 2);
  assert.deepEqual(result.problems, []);
});

test('missing files and anchors are reported', (t) => {
  const root = fixture(t, {
    'README.md': '# Home\n[Missing](absent.md)\n[Anchor](guide.md#absent)',
    'guide.md': '# Present',
  });
  const result = checkDocumentation(root);
  assert.equal(result.problems.length, 2);
  assert.match(result.problems[0], /missing absent.md/);
  assert.match(result.problems[1], /missing heading guide.md#absent/);
});

test('fenced examples, external links and generated directories are ignored', (t) => {
  const root = fixture(t, {
    'README.md': '# Home\n```md\n[Example](absent.md)\n```\n[External](https://example.com)',
    'node_modules/ignored.md': '[Missing](absent.md)',
    '.agenttm/history.md': '[Missing](absent.md)',
  });
  const result = checkDocumentation(root);
  assert.equal(result.files.length, 1);
  assert.deepEqual(result.problems, []);
});

test('outdated repository references are rejected', (t) => {
  const root = fixture(t, { 'README.md': 'AgentTM' + '-demo' });
  assert.match(checkDocumentation(root).problems[0], /outdated repository reference/);
});
