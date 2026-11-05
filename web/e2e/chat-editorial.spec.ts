import { test, expect } from '@playwright/test';

async function chatFixture(page: any, request: any, { long = false, approval = false, failed = false } = {}) {
  const { items } = await (await request.get('/api/sessions')).json();
  const id = items[0].id;
  await page.route('**/api/sessions', (route: any) => route.fulfill({ json: { items:[{ ...items[0], resumable:true, title:'Review parser changes' }], next_cursor:null } }));
  const data = long ? Array.from({ length:24 }, (_, i) => ({ id:`reply-${i}`, session_id:id, sequence:i+1, kind:'item.completed', received_at:new Date().toISOString(), payload:{ item:{ type:'agent_message', text:`Recorded fixture reply ${i}\n\n${'The captured workspace contains a parser and its tests. '.repeat(12)}` } } })) : [];
  if (failed) data.push({ id:'tool-failure', session_id:id, sequence:data.length+1, kind:'item.completed', tool_name:'command_execution', tool_call_id:'fixture-tool', received_at:new Date().toISOString(), payload:{ item:{ type:'command_execution', status:'failed', command:'fixture-test-command', exit_code:1, aggregated_output:'Synthetic parser test failed: expected a closing bracket.' } } } as any);
  if (failed) data.push({ id:'code-reply', session_id:id, sequence:data.length+1, kind:'item.completed', received_at:new Date().toISOString(), payload:{ item:{ type:'agent_message', text:'Review **this example** and `parse()`:\n\n```typescript\nconst text = "'+ 'x'.repeat(900) +'";\n```\n\n<img src=x onerror="alert(1)">' } } });
  await page.route(`**/api/sessions/${id}/events?*limit=200`, (route: any) => route.fulfill({ json:{ items:data, next_cursor:null } }));
  await page.addInitScript(({ id, approval, long }: any) => {
    localStorage.setItem('agenttm:onboarding:v1','done');
    (window as any).chatCalls=[];
    (window as any).chatFixtureState={ session_id:long?id:'', running:long, draft:'', error:'', approvals:approval?[{id:'approval-one',method:'command',command:'fixture-test-command',reason:'Run the fixture test suite',directory:'C:\\fixture'}]:[] };
    (window as any).go={main:{Desktop:{
      CheckSetup:async()=>({state:'ready'}),
      CopyText:async(text:string)=>{(window as any).copiedChatCode=text;},
      CodexModels:async()=>[{model:'fixture-model',displayName:'Fixture model',isDefault:true}],
      ChatStatus:async()=>(window as any).chatFixtureState,
      StartChat:async(...args:any[])=>{(window as any).chatCalls.push({method:'start',args});(window as any).chatFixtureState={session_id:id,running:true,draft:'Reviewing your request…',error:'',approvals:[]};return id;},
      StopChat:async()=>{(window as any).chatCalls.push({method:'stop'});(window as any).chatFixtureState={...(window as any).chatFixtureState,running:false,approvals:[]};},
      DecideChat:async(...args:any[])=>{(window as any).chatCalls.push({method:'decide',args});(window as any).chatFixtureState={...(window as any).chatFixtureState,approvals:[]};},
    }}};
  }, { id, approval, long });
  await page.goto('/');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Chat with Codex',exact:true}).click();
  await expect(page.getByLabel('Chat model',{exact:true})).toHaveValue('fixture-model');
  return id;
}

test('editorial welcome and composer preserve multiline input and keyboard submission', async ({ page, request }) => {
  await chatFixture(page,request);
  await expect(page.getByRole('heading',{name:'What are we building today?',exact:true})).toBeVisible();
  const composer=page.getByLabel('Your message',{exact:true});
  await composer.fill('Explain the parser');
  await composer.press('Enter');
  await composer.press('A');
  await expect(composer).toHaveValue('Explain the parser\nA');
  expect(await page.evaluate(()=>(window as any).chatCalls)).toEqual([]);
  await page.getByLabel('Chat permissions',{exact:true}).selectOption('workspace-write');
  await page.screenshot({path:'../.test-work/chat-editorial-welcome.png'});
  await composer.press('Control+Enter');
  await expect(page.getByRole('button',{name:'Stop turn',exact:true})).toBeVisible();
  expect((await page.evaluate(()=>(window as any).chatCalls))[0].args).toEqual(['','Explain the parser\nA','fixture-model','workspace-write']);
  await expect(page.getByLabel('Chat model',{exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Stop turn',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue conversation',exact:true})).toBeVisible();
});

test('saved conversations render safe code and exposed tool failures with working history navigation', async ({ page, request }) => {
  const id=await chatFixture(page,request,{failed:true});
  await page.getByLabel('Saved conversations',{exact:true}).click();
  await page.getByLabel('Chat conversation',{exact:true}).selectOption(id);
  await expect(page.locator('.chat-identity')).toContainText('Review parser changes');
  await expect(page.locator('.chat-tool-failed')).toHaveAttribute('open','');
  await expect(page.locator('.chat-tool-failure')).toContainText('exit 1');
  await expect(page.locator('.chat-tool-failed pre')).toContainText('Synthetic parser test failed');
  await expect(page.locator('.chat-code-block')).toBeVisible();
  await expect(page.locator('.chat-prose img')).toHaveCount(0);
  await page.getByRole('button',{name:'Copy code',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).copiedChatCode)).toContain('const text');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'../.test-work/chat-editorial-conversation.png'});
  await page.locator('.chat-header-actions').getByRole('button',{name:'New conversation',exact:true}).click();
  await expect(page.getByRole('heading',{name:'What are we building today?',exact:true})).toBeVisible();
  await expect(page.getByLabel('Chat model',{exact:true})).toHaveValue('fixture-model');
  await page.getByLabel('Saved conversations',{exact:true}).click();
  await page.getByLabel('Chat conversation',{exact:true}).selectOption(id);
  await page.getByRole('button',{name:'View history',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Review parser changes',exact:true})).toBeVisible();
});

test('streaming respects reading position and approvals remain discoverable and actionable', async ({ page, request }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await chatFixture(page,request,{long:true,approval:true});
  await expect(page.getByRole('heading',{name:'Codex needs your approval',exact:true})).toBeVisible();
  const transcript=page.getByLabel('Conversation messages',{exact:true});
  await transcript.evaluate((node: HTMLElement)=>{node.scrollTop=0;});
  await expect(page.getByRole('button',{name:'Latest messages',exact:true})).toBeVisible();
  await page.evaluate(()=>{(window as any).chatFixtureState.draft='Streaming fixture: '+ 'more observed text '.repeat(80);});
  await expect(page.locator('.streaming')).toContainText('Streaming fixture:');
  expect(await transcript.evaluate((node:HTMLElement)=>node.scrollTop)).toBeLessThan(5);
  await page.locator('.chat-attention-strip').click();
  await expect(page.getByRole('button',{name:'Allow once',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'Allow once',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).chatCalls)).toContainEqual({method:'decide',args:['approval-one',true]});
  await expect(page.getByRole('button',{name:'Latest messages',exact:true})).not.toBeVisible();
  expect(await transcript.evaluate((node:HTMLElement)=>node.scrollHeight-node.clientHeight-node.scrollTop)).toBeLessThan(80);
  await page.screenshot({path:'../.test-work/chat-editorial-streaming.png'});
});

test('a new prompt never replaces older paginated prompts whose capture was off', async ({ page, request }) => {
  const id=await chatFixture(page,request);
  let sent=false;
  await page.route(`**/api/sessions/${id}/events?*limit=200`, route => {
    const cursor=Number(new URL(route.request().url()).searchParams.get('cursor')||0);
    const sequence=cursor===0?1:2;
    const items=cursor===0||sent&&cursor===1?[{id:`old-prompt-${sequence}`,session_id:id,sequence,kind:'agenttm.chat.prompt',received_at:'2000-01-01T00:00:00Z',payload:{text:'[Prompt text capture is off]'}}]:[];
    return route.fulfill({json:{items,next_cursor:cursor===0?1:null}});
  });
  await page.getByLabel('Saved conversations',{exact:true}).click();
  await page.getByLabel('Chat conversation',{exact:true}).selectOption(id);
  await expect(page.locator('.chat-message.user')).toHaveCount(1);
  await page.getByLabel('Your follow-up',{exact:true}).fill('This is the new live prompt');
  await page.getByRole('button',{name:'Continue conversation',exact:true}).click();
  sent=true;
  await expect(page.locator('.chat-message.user')).toHaveCount(3);
  await expect(page.locator('.chat-message.user').filter({hasText:'[Prompt text capture is off]'})).toHaveCount(2);
  await expect(page.locator('.chat-message.user').filter({hasText:'This is the new live prompt'})).toHaveCount(1);
});
