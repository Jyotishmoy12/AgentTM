import { useEffect, useState } from 'react';
import { get, message } from '../api';
import type { Health, Page, RestoredWorkspace, Session } from '../types';

export type AppPage = 'overview' | 'chat' | 'sessions' | 'checkpoints' | 'restores' | 'storage' | 'setup';
export const navigation: { id: AppPage; title: string; hint: string; icon: string }[] = [
  { id: 'overview', title: 'Overview', hint: 'Your starting point', icon: 'overview' },
  { id: 'chat', title: 'Chat with Codex', hint: 'Record & continue', icon: 'chat' },
  { id: 'sessions', title: 'Sessions', hint: 'Recorded agent runs', icon: 'sessions' },
  { id: 'checkpoints', title: 'Checkpoints', hint: 'Saved workspace states', icon: 'checkpoints' },
  { id: 'restores', title: 'Restored workspaces', hint: 'Separate working copies', icon: 'restores' },
  { id: 'storage', title: 'Storage & backups', hint: 'Protect & clean up history', icon: 'storage' },
  { id: 'setup', title: 'Setup & help', hint: 'Get ready and learn', icon: 'setup' },
];
const descriptions: Record<AppPage, string> = {
  overview: 'Record a run, explore its history, then restore the workspace you need.',
  chat: 'Chat with Codex in this project. Start a new conversation or continue a recorded one.',
  sessions: 'A session is one recorded agent run. Open one to explore its timeline, files, and changes.',
  checkpoints: 'A checkpoint captures project files at a moment in a recording. Inspect it or restore a separate copy.',
  restores: 'Find the separate Git worktrees created from your checkpoints. Your original workspace stays in place.',
  storage: 'Create encrypted history backups, restore into a clean clone, and safely reclaim unused blob storage.',
  setup: 'Check your recording setup and learn what each part of AgentTM does.',
};

export function NavIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'chat' ? <><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></> : name === 'storage' ? <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></> : name === 'overview' ? <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> : name === 'sessions' ? <><path d="M7 4h14M7 12h14M7 20h14"/><circle cx="3" cy="4" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="20" r="1"/></> : name === 'checkpoints' ? <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></> : name === 'restores' ? <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7v1a6 6 0 0 1-6 6H6"/></> : <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/></>}
  </svg>;
}

export function PageHeading({ page, children }: { page: AppPage; children?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE HISTORY</span><h1>{navigation.find(n => n.id === page)?.title}</h1><p>{descriptions[page]}</p></div>{children && <div className="page-heading-actions">{children}</div>}</div>;
}

export function SessionCards({ sessions, onOpen }: { sessions: Session[]; onOpen: (id: string) => void }) {
  return <div className="session-cards">{sessions.map(session => <button key={session.id} className="session-summary" onClick={() => onOpen(session.id)} aria-label={`Open session ${session.id.slice(0, 8)}`}><span className="session-symbol"><NavIcon name="sessions"/></span><span className="session-summary-main"><strong>{new Date(session.started_at).toLocaleString()}</strong><span>{session.agent} <span aria-hidden="true">·</span> {session.id.slice(0, 8)}</span></span><span className={`status-pill ${session.status}`}>{session.status.replaceAll('_', ' ')}</span><span aria-hidden="true">→</span></button>)}</div>;
}

export function Overview({ sessions, health, more, onOpen, navigate }: { sessions: Session[]; health: Health | null; more: boolean; onOpen: (id: string) => void; navigate: (page: AppPage) => void }) {
  return <div className="page-scroll"><section className="overview-welcome"><div><span className="eyebrow">LOCAL HISTORY. A CLEAR WAY BACK.</span><h2>Your next step starts here.</h2><p>Explore an agent run, inspect a saved state, or bring an earlier workspace back into a separate folder.</p><button className="primary-button" onClick={() => navigate(sessions.length ? 'sessions' : 'setup')}>{sessions.length ? 'Explore recorded sessions' : 'Set up your first recording'} <span aria-hidden="true">→</span></button></div><div className="overview-recording"><span className="eyebrow">RECORD FROM YOUR PROJECT TERMINAL</span><code>agenttm run codex -- "your task"</code><p>Only runs started through AgentTM appear here.</p></div></section>
    <div className="overview-steps">{[
      ['sessions', '01', 'Explore a session', 'Follow what the agent said and did in receipt order.'],
      ['checkpoints', '02', 'Inspect a checkpoint', 'Browse historical files and compare captured changes.'],
      ['restores', '03', 'Find restored workspaces', 'Continue from a checkpoint in a separate Git worktree.'],
    ].map(([page, index, title, detail]) => <button key={page} onClick={() => navigate(page as AppPage)} className="overview-step"><span className="eyebrow">{index}</span><h3>{title}</h3><p>{detail}</p><span className="step-link">Open <span aria-hidden="true">↗</span></span></button>)}</div>
    <section className="overview-recent"><div className="section-title"><div><h2>Recent sessions</h2><p>Choose a recording to inspect its history.</p></div><button className="text-button" onClick={() => navigate('sessions')}>View all sessions →</button></div>{sessions.length ? <SessionCards sessions={sessions.slice(0, 3)} onOpen={onOpen}/> : <div className="page-empty"><h2>Your history starts with a run</h2><p>Open Setup & help to prepare Codex and record your first task.</p><button onClick={() => navigate('setup')}>Open setup & help</button></div>}</section>
    <div className="overview-footnote"><span>{sessions.length}{more ? '+' : ''} loaded sessions</span><span>{health?.prompt_mode === 'sanitized' ? 'Sanitized prompt capture enabled' : 'Prompt text capture off'}</span><span>Stored locally in .agenttm</span></div>
  </div>;
}

export function SetupPage() {
  const bridge = window.go?.main?.Desktop;
  const [state, setState] = useState('unchecked');
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function check() {
    if (!bridge) return;
    setBusy(true); setError('');
    try { const result = await bridge.CheckSetup(); setState(result.state); setVersion(result.version); }
    catch { setError('Could not check Codex. Try again or reopen AgentTM.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void check(); }, []);
  const labels: Record<string, string> = { unchecked: 'Not checked yet', ready: 'Ready for a recording', missing: 'Codex was not found on PATH', incompatible: 'Codex compatibility check failed', login_required: 'Codex sign-in could not be confirmed' };
  return <div className="page-scroll help-page"><section className="help-card"><h2>Recording readiness</h2>{bridge ? <><p role="status">{busy ? 'Checking Codex…' : labels[state]}{version && <span> · {version}</span>}</p><button disabled={busy} onClick={() => check()}>{busy ? 'Checking…' : 'Check again'}</button></> : <><p>In your project terminal, run this diagnostic to check Codex installation and sign-in:</p><code className="help-command">agenttm codex doctor</code><p>The browser UI cannot inspect your machine directly. The desktop app can check this here.</p></>}{error && <div className="error-box" role="alert">{error}</div>}<p>Use the <strong>Setup guide</strong> button above for installation, sign-in, and first-recording instructions.</p></section>
    <div className="help-columns"><section className="help-card"><h2>How the pieces fit together</h2><dl><dt>Session</dt><dd>One agent run launched through AgentTM. Its timeline contains received events.</dd><dt>Event</dt><dd>A recorded message, command observation, or lifecycle update. Select it to see the details.</dd><dt>Checkpoint</dt><dd>A captured set of project files. Some events have no checkpoint; the UI labels the last known state.</dd><dt>Changes</dt><dd>A comparison with the selected checkpoint's parent. A baseline is compared with an empty workspace.</dd><dt>Restored workspace</dt><dd>A separate Git worktree created from a checkpoint. AgentTM also calls this a fork.</dd></dl></section><section className="help-card"><h2>Your first recording</h2><ol><li>Open a terminal in your initialized project.</li><li>Run <code>agenttm run codex -- "your task"</code>.</li><li>Refresh this window and open Sessions.</li><li>Inspect the timeline, files, or changes.</li><li>Restore a checkpoint when you need a separate working copy.</li></ol><h2>What is captured?</h2><p>Baseline and final workspace observations, plus manual and optional observed checkpoints. A scan can include changes made by other programs; an event does not prove which tool caused a file change.</p><p>Excluded files and capture limits can produce partial checkpoints. Review their omissions before restoring.</p></section></div>
  </div>;
}

export function RestoredWorkspaces({ revision, onCheckpoints }: { revision: number; onCheckpoints: () => void }) {
  const [items, setItems] = useState<RestoredWorkspace[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    get<Page<RestoredWorkspace>>('/forks', controller.signal).then(page => { setItems(page.items); setCursor(page.next_cursor); })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, retry]);
  async function more() {
    setLoading(true);
    try { const page = await get<Page<RestoredWorkspace>>(`/forks?cursor=${cursor}`); setItems(previous => [...previous, ...page.items]); setCursor(page.next_cursor); }
    catch (e) { setError(message(e)); } finally { setLoading(false); }
  }
  return <div className="page-scroll">{error && <div className="error-box" role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Retry</button></div>}{loading && !items.length ? <p className="loading-inline">Loading restored workspaces…</p> : !items.length && !error ? <div className="page-empty"><NavIcon name="restores"/><h2>No restored workspaces yet</h2><p>Choose a checkpoint, inspect its files, then use “Fork checkpoint” to create a separate working copy.</p><button className="primary-button" onClick={onCheckpoints}>Browse checkpoints</button></div> : <><div className="workspace-ledger">{items.map(item => <article className="restored-card" key={item.id}><div className="section-title"><h2>{item.branch_name}</h2><span className={`status-pill ${item.status}`}>{item.status.replaceAll('_', ' ')}</span></div><p>Checkpoint <code>{item.checkpoint_id.slice(0, 8)}</code> · {new Date(item.created_at).toLocaleString()}</p><label>Recorded folder location<code>{item.worktree_path}</code></label><p>{item.status === 'ready' ? 'Open this folder in your editor to continue working.' : 'Review this restore before using it. Run agenttm forks and inspect its folder for recovery details.'}</p></article>)}</div>{cursor !== null && <button className="load-more" disabled={loading} onClick={more}>Load more workspaces</button>}<p className="ledger-note">These are recorded restore results. Folders may have been moved or removed since creation; live filesystem health is not checked here.</p></>}</div>;
}
