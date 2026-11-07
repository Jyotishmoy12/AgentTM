import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

test('all script source and test files stay within 200 lines', () => {
  for (const file of sourceFiles(root)) {
    const lines = readFileSync(file, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= 200, `${file} has ${lines} lines`);
  }
});

test('downloaded installers have no companion-module dependencies', () => {
  const powershell = readFileSync(resolve(root, 'install.ps1'), 'utf8');
  const shell = readFileSync(resolve(root, 'install.sh'), 'utf8');
  assert.doesNotMatch(powershell, /Import-Module|\$PSScriptRoot/);
  assert.doesNotMatch(shell, /^\s*(?:source|\.)\s+/m);
});
