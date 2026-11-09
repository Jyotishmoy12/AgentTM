import { test, expect } from '@playwright/test';

test('public crawl files and social image are served', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://agenttm.site/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain('<loc>https://agenttm.site/</loc>');
  expect(xml).toContain('<loc>https://agenttm.site/docs.html</loc>');
  const image = await request.get('/images/og-image.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  const bytes = await image.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});

for (const path of ['/', '/docs.html']) {
  test(`social metadata is present in initial HTML for ${path}`, async ({ request }) => {
    const response = await request.get(path);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="https://agenttm.site${path}"`);
    expect(html).toContain('property="og:url"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('https://agenttm.site/images/og-image.png');
  });
}
