import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { stopChild, verifyDashboard, waitForURL } from './lib/smoke-ui.mjs';

const [binaryArg, version] = process.argv.slice(2);
if (!binaryArg || !version) throw new Error('Usage: node scripts/smoke-ui.mjs BINARY VERSION');
const binary = resolve(binaryArg);
const cwd = mkdtempSync(join(tmpdir(), 'agenttm-ui-smoke-'));
execFileSync('git', ['init', cwd], { stdio: 'pipe' });
execFileSync(binary, ['init'], { cwd, stdio: 'pipe' });
const child = spawn(binary, ['ui', '--port', '0', '--no-browser'], {
  cwd,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
let startupError;
child.stdout.on('data', (data) => {
  output += data;
});
child.stderr.on('data', (data) => {
  output += data;
});
child.on('error', (error) => {
  startupError = error;
});

try {
  const url = await waitForURL(
    child,
    () => output,
    () => startupError,
  );
  const assets = await verifyDashboard(url, version);
  console.log(`Packaged UI smoke: PASS (${version}, ${assets} embedded assets, loopback binding)`);
} finally {
  await stopChild(child);
}
