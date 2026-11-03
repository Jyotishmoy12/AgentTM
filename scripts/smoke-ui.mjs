import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';

const [binaryArg, version] = process.argv.slice(2);
if (!binaryArg || !version) throw new Error('Usage: node scripts/smoke-ui.mjs BINARY VERSION');
const binary = resolve(binaryArg);
const cwd = mkdtempSync(join(tmpdir(), 'agenttm-ui-smoke-'));
execFileSync('git', ['init', cwd], { stdio: 'pipe' });
execFileSync(binary, ['init'], { cwd, stdio: 'pipe' });
const child = spawn(binary, ['ui', '--port', '0', '--no-browser'], { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', data => { output += data; });
child.stderr.on('data', data => { output += data; });
try {
  const deadline = Date.now() + 15000;
  while (!/http:\/\/127\.0\.0\.1:\d+/.test(output)) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error(`UI did not start: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const health = await (await fetch(`${url}/api/health`)).json();
  if (health.version !== version) throw new Error(`Unexpected UI version ${health.version}`);
  const response = await fetch(url);
  const html = await response.text();
  if (!response.ok || !html.includes('AgentTM')) throw new Error('Embedded index missing');
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
  if (!assets.some(asset => asset.endsWith('.js')) || !assets.some(asset => asset.endsWith('.css'))) throw new Error('Production JS/CSS missing');
  for (const asset of assets) {
    const result = await fetch(url + asset);
    if (!result.ok || (await result.arrayBuffer()).byteLength < 100) throw new Error(`Embedded asset missing: ${asset}`);
  }
  console.log(`Packaged UI smoke: PASS (${version}, ${assets.length} embedded assets, loopback binding)`);
} finally {
  if (child.exitCode === null) { child.kill(); await once(child, 'exit'); }
}
