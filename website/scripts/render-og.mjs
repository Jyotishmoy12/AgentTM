import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const directory = new URL('../public/images/', import.meta.url);
const svg = await readFile(new URL('og-image.svg', directory), 'utf8');
const screenshot = await readFile(new URL('history.png', directory));
const artwork = svg.replace(
  'href="history.png"',
  `href="data:image/png;base64,${screenshot.toString('base64')}"`,
);
const browser = await chromium.launch({
  executablePath: process.env.AGENTTM_BROWSER_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:1200px;height:630px}svg{display:block}</style>${artwork}`,
  );
  await page.screenshot({ path: fileURLToPath(new URL('og-image.png', directory)) });
} finally {
  await browser.close();
}
