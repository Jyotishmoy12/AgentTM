import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';
import { stopChild, verifyDashboard, waitForURL } from '../lib/smoke-ui.mjs';

async function dashboard(t, changes = {}) {
  const routes = {
    '/api/health': [200, JSON.stringify({ version: 'fixture' })],
    '/': [200, 'AgentTM<script src="/assets/app.js"></script><link href="/assets/app.css">'],
    '/assets/app.js': [200, 'x'.repeat(100)],
    '/assets/app.css': [200, 'x'.repeat(100)],
    ...changes,
  };
  const server = createServer((request, response) => {
    const [status, body] = routes[request.url] ?? [404, 'missing'];
    response.writeHead(status);
    response.end(body);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

test('dashboard validates its version and real embedded assets', async (t) => {
  assert.equal(await verifyDashboard(await dashboard(t), 'fixture'), 2);
});

for (const [name, changes, error] of [
  ['wrong version', { '/api/health': [200, '{"version":"other"}'] }, /Unexpected UI version/],
  ['failed health', { '/api/health': [503, '{}'] }, /health check failed/],
  ['missing index', { '/': [404, 'missing'] }, /Embedded index missing/],
  [
    'missing CSS',
    { '/': [200, 'AgentTM<script src="/assets/app.js"></script>'] },
    /JS\/CSS missing/,
  ],
  ['missing asset', { '/assets/app.js': [404, 'missing'] }, /Embedded asset missing/],
  ['empty asset', { '/assets/app.css': [200, ''] }, /Embedded asset missing/],
]) {
  test(`dashboard rejects ${name}`, async (t) => {
    await assert.rejects(verifyDashboard(await dashboard(t, changes), 'fixture'), error);
  });
}

test('startup rejects failed, exited or unresponsive children', async () => {
  const running = { exitCode: null, signalCode: null };
  assert.equal(
    await waitForURL(running, () => 'UI: http://127.0.0.1:7331'),
    'http://127.0.0.1:7331',
  );
  await assert.rejects(
    waitForURL({ exitCode: 1 }, () => 'failed'),
    /UI did not start/,
  );
  await assert.rejects(
    waitForURL(
      running,
      () => '',
      () => new Error('spawn failed'),
    ),
    /spawn failed/,
  );
  await assert.rejects(
    waitForURL(
      running,
      () => '',
      () => null,
      -1,
    ),
    /UI did not start/,
  );
});

test('cleanup waits for its own child and tolerates repeated cleanup', async (t) => {
  const child = spawn(process.execPath, ['-e', 'console.log("ready");setInterval(()=>{},1000)'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => stopChild(child));
  await once(child.stdout, 'data', { signal: AbortSignal.timeout(10000) });
  await stopChild(child);
  assert.ok(child.exitCode !== null || child.signalCode !== null);
  await stopChild(child);
});
