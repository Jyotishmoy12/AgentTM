import { test, expect } from '@playwright/test';

test('overview library filters real session fields and its cards open inspection', async ({ page, request }) => {
  const { items } = await (await request.get('/api/sessions')).json();
  // Explicit presentation fixture. Only the first card opens the real seeded recording.
  const sessions = Array.from({ length: 6 }, (_, i) => ({ ...items[0], id: i ? `presentation-${i}` : items[0].id, agent: i % 2 ? 'codex-interactive' : 'codex', status: i === 2 ? 'active' : i === 4 ? 'failed' : 'completed', started_at: new Date(Date.UTC(2026, 10, 4, 16-i)).toISOString(), ended_at: i === 2 ? null : new Date(Date.UTC(2026, 10, 4, 16-i, 5)).toISOString() }));
  await page.route('**/api/sessions', route => route.fulfill({ json: { items: sessions, next_cursor: null } }));
  await page.route('**/api/sessions/presentation-*/events?limit=12', route => route.fulfill({ json: { items: [
    { id:'fixture-preview-1', kind:'agenttm.snapshot.baseline', payload:{}, received_at:sessions[0].started_at },
    { id:'fixture-preview-2', kind:'item.started', payload:{ item:{ command:'Synthetic preview: inspect project structure' } }, received_at:sessions[0].started_at },
    { id:'fixture-preview-3', kind:'item.completed', payload:{ item:{ text:'Presentation fixture only. Open a recorded session to inspect its actual events, captured files, and checkpoint comparisons.' } }, received_at:sessions[0].started_at },
  ], next_cursor:null } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.locator('.home-session-card')).toHaveCount(6);
  await expect(page.locator('.home-document-icon svg')).toHaveCount(6);
  await expect(page.locator('.home-recording-page').last()).toContainText('Presentation fixture only');
  await page.screenshot({ path: '../.test-work/overview-library-1440.png' });
  await page.getByRole('tab', { name: 'Active', exact: true }).click();
  await expect(page.locator('.home-session-card')).toHaveCount(1);
  await expect(page.locator('.home-session-status')).toHaveText('active');
  await page.getByRole('tab', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.home-session-card')).toHaveCount(4);
  await page.getByRole('tab', { name: 'Recents', exact: true }).click();
  await page.setViewportSize({ width:1240, height:800 });
  await page.evaluate(() => { document.body.style.zoom = '1.25'; });
  const titles = await page.locator('.home-session-card h2').evaluateAll(nodes => nodes.map(node => {
    const heading = node as HTMLElement;
    const card = heading.closest('.home-session-card')!;
    const project = card.querySelector('.home-card-project')!;
    return { visibleHeight: heading.clientHeight, contentHeight: heading.scrollHeight, bottom: heading.getBoundingClientRect().bottom, projectTop: project.getBoundingClientRect().top };
  }));
  for (const title of titles) {
    expect(title.visibleHeight).toBeGreaterThanOrEqual(title.contentHeight);
    expect(title.projectTop).toBeGreaterThanOrEqual(title.bottom);
  }
  await page.screenshot({ path:'../.test-work/overview-titles-125-percent.png', fullPage:true });
  await page.evaluate(() => { document.body.style.zoom = ''; });
  for (const size of [{ width: 1240, height: 800 }, { width: 760, height: 550 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../.test-work/overview-library-${size.width}.png`, fullPage: true });
  }
  await page.locator('.home-session-card').first().click();
  await expect(page.getByRole('heading', { name: 'The story of this session.', exact: true })).toBeVisible();
});

test('sidebar and top bar remain consistent when moving between app tabs', async ({ page }) => {
  await page.setViewportSize({ width:1240, height:800 });
  await page.goto('/');
  const shell = async () => page.evaluate(() => {
    const sidebar = document.querySelector('.app-sidebar')!;
    const project = document.querySelector('.project-selector')!;
    const topbar = document.querySelector('.topbar')!;
    return { sidebarWidth:sidebar.getBoundingClientRect().width, projectTop:project.getBoundingClientRect().top, topbarHeight:topbar.getBoundingClientRect().height, sidebarColor:getComputedStyle(sidebar).backgroundColor, topbarColor:getComputedStyle(topbar).backgroundColor };
  });
  const original = await shell();
  for (const name of ['History', 'Storage & backups', 'Settings', 'Chat with Codex', 'Overview']) {
    await page.getByRole('navigation', { name:'Main navigation' }).getByRole('button', { name, exact:true }).click();
    await expect(page.locator('.library-shell')).toBeVisible();
    expect(await shell()).toEqual(original);
    await expect(page.locator('.app-sidebar .brand')).not.toBeVisible();
    if (name === 'Checkpoints') await page.screenshot({ path:'../.test-work/shared-shell-checkpoints.png' });
  }
});

test('cards use stored first prompts, preserve omitted-prompt fallbacks, and bound previews', async ({ page, request }) => {
  const { items } = await (await request.get('/api/sessions')).json();
  const sessions = [items[0], { ...items[0], id:'omitted-prompt', agent:'codex-interactive' }, { ...items[0], id:'cli-prompt' }];
  await page.route('**/api/sessions', route => route.fulfill({ json:{ items:sessions, next_cursor:null } }));
  await page.route('**/api/sessions/*/events?limit=12', route => {
    const id = new URL(route.request().url()).pathname.split('/')[3];
    const prompt = id === 'omitted-prompt'
      ? [{ kind:'agenttm.chat.prompt', payload:{ text:'[Prompt text capture is off]' } }, { kind:'agenttm.chat.prompt', payload:{ text:'Later follow-up must not become the title' } }]
      : id === 'cli-prompt'
        ? [{ kind:'agenttm.run.started', payload:{ prompt:'Explain the startup checks' } }]
        : [{ kind:'agenttm.chat.prompt', payload:{ text:'Fix the parser error handling' } }];
    const activity = Array.from({ length:7 }, (_, i) => ({ id:`activity-${i}`, kind:'item.completed', payload:{ item:{ text:`Synthetic recorded step ${i}` } } }));
    return route.fulfill({ json:{ items:[...prompt,...activity], next_cursor:null } });
  });
  await page.goto('/');
  const cards = page.locator('.home-session-card');
  await expect(cards.nth(0).getByRole('heading')).toHaveText('Fix the parser error handling');
  await expect(cards.nth(1).getByRole('heading')).toHaveText('codex-interactive session');
  await expect(cards.nth(2).getByRole('heading')).toHaveText('Explain the startup checks');
  const tops = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
  for (const card of await cards.all()) {
    await expect(card.locator('.home-preview-entry')).toHaveCount(3);
    await expect(card.locator('.home-view-session')).toHaveText('View session');
    expect((await card.boundingBox())!.height).toBeLessThanOrEqual(260);
  }
  await page.screenshot({ path:'../.test-work/overview-refined-cards.png' });
});
