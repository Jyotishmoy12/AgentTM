import { chromium, expect } from '../../../web/node_modules/@playwright/test/index.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const out = fileURLToPath(new URL('../out/updated/', import.meta.url));
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentTM — Updated product film</title>
<style>
body{margin:0;padding:32px;background:#101312;color:#e6e9e6;font:16px 'Segoe UI',sans-serif}
main{max-width:1400px;margin:auto}h1{font-size:24px;font-weight:550}
video{display:block;width:100%;border-radius:14px;background:#1e2120;outline:1px solid #38443b}
button,a{display:inline-block;margin:18px 16px 0 0;color:#8acb9c}
button{font:inherit;background:#223428;border:1px solid #55785c;border-radius:8px;padding:10px 18px;cursor:pointer}
p{color:#a1aaa3}
</style><main><h1>AgentTM · Record. Inspect. Restore.</h1>
<video controls preload="metadata" poster="AgentTM-product-poster.png" src="AgentTM-product-40s.mp4"></video>
<button onclick="const v=document.querySelector('video');v.muted=false;v.volume=0.8;v.play()">Play video with sound</button>
<a href="AgentTM-product-40s.mp4">Publication MP4</a>
<a href="AgentTM-product-40s-vscode.mp4">VS Code audio preview</a>
<p>40 seconds · 1080p · 60 fps · Music and subtle click sounds</p></main></html>`;
writeFileSync(join(out, 'watch.html'), html);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(join(out, 'watch.html')).href);
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('readyState', 4);
  await page.getByRole('button', { name: 'Play video with sound' }).click();
  await expect.poll(() => video.evaluate((node) => node.currentTime)).toBeGreaterThan(0.2);
  const playback = await video.evaluate((node) => ({
    width: node.videoWidth,
    height: node.videoHeight,
    duration: node.duration,
    muted: node.muted,
    error: node.error?.message || null,
  }));
  if (playback.width !== 1920 || playback.height !== 1080 || playback.muted || playback.error)
    throw Error(JSON.stringify(playback));
  await video.evaluate((node) => node.pause());
  for (const seconds of [1.8, 4.8, 9.1, 12.3, 15.5, 18.6, 22.5, 26.6, 30.2, 34.2, 38.5]) {
    await video.evaluate(
      (node, at) =>
        new Promise((done) => {
          node.addEventListener(
            'seeked',
            () => requestAnimationFrame(() => requestAnimationFrame(done)),
            { once: true },
          );
          node.currentTime = at;
        }),
      seconds,
    );
    await video.screenshot({ path: join(out, `review-${seconds}.png`) });
  }
  if (errors.length) throw Error(errors.join('\n'));
  writeFileSync(
    join(out, 'playback-verification.json'),
    JSON.stringify(
      {
        ...playback,
        browser: 'Chrome',
        startedWithUserGesture: true,
        representativeFrames: 11,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log('Chrome playback with unmuted audio and 11 representative seeks: PASS');
} finally {
  await browser.close();
}
