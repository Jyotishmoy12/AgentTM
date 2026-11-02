// Optional acceptance check against a disposable REAL coding recording.
// Required arguments: loopback URL, session ID, baseline ID, edited checkpoint ID.
import { chromium, expect } from '@playwright/test';
const [url,session,baseline,edited] = process.argv.slice(2,6);
if(!url||new URL(url).hostname!=='127.0.0.1'||new URL(url).protocol!=='http:'||![session,baseline,edited].every(v=>/^[a-f0-9-]{36}$/.test(v)))throw new Error('Provide a loopback URL and the three recording UUIDs.');
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.getByLabel('Session',{exact:true}).selectOption(session);
  await expect(page.locator('.event-card').first()).toBeVisible();
  await page.getByLabel('Select checkpoint').selectOption(edited);
  await page.getByRole('button',{name:'calc.go',exact:true}).click();
  await expect(page.locator('.view-lines')).toContainText('func Multiply');
  await page.getByRole('tab',{name:'Compare with parent'}).click();
  await expect(page.locator('.change-heading').filter({hasText:'calc_test.go'})).toBeVisible();
  await page.screenshot({path:'../.test-work/real-e2e-ui.png',fullPage:true});
  await page.getByRole('tab',{name:/^Files/}).click();
  await page.getByLabel('Select checkpoint').selectOption(baseline);
  await page.getByRole('button',{name:'calc.go',exact:true}).click();
  await expect(page.locator('.view-lines')).toContainText('func Add');
  await expect(page.locator('.view-lines')).not.toContainText('func Multiply');
  if(process.argv.includes('--fork')){
    await page.getByRole('button',{name:'Fork checkpoint',exact:true}).click();
    await page.getByLabel('New fork name').fill(`real-ui-${Date.now().toString(36)}`);
    await expect(page.locator('.fork-destination')).toContainText('worktrees');
    await page.getByRole('button',{name:'Create isolated fork'}).click();
    await expect(page.getByRole('heading',{name:'Checkpoint restored'})).toBeVisible();
    console.log('UI fork:',await page.locator('.fork-destination').textContent());
  }
  expect(errors).toEqual([]);
  console.log('Real recording UI: historical code, parent diff and baseline verified.');
}finally{await browser.close()}
