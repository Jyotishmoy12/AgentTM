import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = path.join(root, '.test-work', `browser-demo-${randomUUID()}`);
const seed = spawnSync('go', ['run', './internal/server/testdata/seed', '--root', fixture], {
  cwd: root,
  stdio: 'inherit',
});
if (seed.status !== 0) process.exit(seed.status ?? 1);
const binary =
  process.env.AGENTTM_E2E_BINARY ||
  path.join(root, 'bin', process.platform === 'win32' ? 'agenttm.exe' : 'agenttm');
const child = spawn(
  binary,
  ['ui', '--no-browser', '--port', process.env.AGENTTM_E2E_PORT || '7333'],
  { cwd: fixture, stdio: 'inherit', windowsHide: true },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
