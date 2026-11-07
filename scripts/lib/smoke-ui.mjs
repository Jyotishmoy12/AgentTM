import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

const loopbackURL = /http:\/\/127\.0\.0\.1:\d+/;

export async function waitForURL(child, output, error = () => null, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (!loopbackURL.test(output())) {
    if (error()) throw error();
    if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) {
      throw new Error(`UI did not start: ${output()}`);
    }
    await sleep(50);
  }
  return output().match(loopbackURL)[0];
}

async function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(15000) });
}

export async function verifyDashboard(url, version) {
  const healthResponse = await request(`${url}/api/health`);
  if (!healthResponse.ok) throw new Error('UI health check failed');
  const health = await healthResponse.json();
  if (health.version !== version) throw new Error(`Unexpected UI version ${health.version}`);
  const response = await request(url);
  const html = await response.text();
  if (!response.ok || !html.includes('AgentTM')) throw new Error('Embedded index missing');
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
  if (
    !assets.some((asset) => asset.endsWith('.js')) ||
    !assets.some((asset) => asset.endsWith('.css'))
  ) {
    throw new Error('Production JS/CSS missing');
  }
  for (const asset of assets) {
    const result = await request(url + asset);
    if (!result.ok || (await result.arrayBuffer()).byteLength < 100) {
      throw new Error(`Embedded asset missing: ${asset}`);
    }
  }
  return assets.length;
}

export async function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit', { signal: AbortSignal.timeout(5000) });
  child.kill();
  await exited;
}
