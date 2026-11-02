import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get, message } from './api';
import type { Change, Checkpoint, FileContent, Health, Page, RecordedEvent, Session, SnapshotFile } from './types';
import { changedPaths, checkpointNear, eventTitle, filterEvents, record } from './state';
import { CodeViewer } from './components/CodeViewer';
import { FileTree } from './components/FileTree';
import { ForkDialog } from './components/ForkDialog';
import { Onboarding } from './components/Onboarding';

const short = (id: string) => id.slice(0, 8);
const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const bytes = (size: number) => size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
const label = (kind: string) => kind.replace('agenttm.', '').replaceAll('.', ' / ').replaceAll('_', ' ');

function ErrorBox({ children }: { children: React.ReactNode }) { return <div className="error-box" role="alert">{children}</div>; }
function Empty({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="empty"><span className="empty-orbit" aria-hidden="true">◷</span><h2>{title}</h2><div>{children}</div></div>; }

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCursor, setSessionCursor] = useState<number | null>(null);
  const [sessionID, setSessionID] = useState('');
  const activeSession = useRef(sessionID);
  activeSession.current = sessionID;
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [eventCursor, setEventCursor] = useState<number | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointCursor, setCheckpointCursor] = useState<number | null>(null);
  const [checkpointTail, setCheckpointTail] = useState(0);
  const [selectedID, setSelectedID] = useState('');
  const [overrideCP, setOverrideCP] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [tool, setTool] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [forkID,setForkID]=useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([get<Health>('/health', controller.signal), get<Page<Session>>('/sessions', controller.signal)])
      .then(([info, page]) => { setHealth(info); setSessions(previous => [...page.items, ...previous.filter(s => !page.items.some(n => n.id === s.id))]); setSessionCursor(page.next_cursor); setSessionID(current => current || page.items[0]?.id || ''); setError(''); })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!sessionID) return;
    const controller = new AbortController();
    setEvents([]); setCheckpoints([]); setSelectedID(''); setOverrideCP(''); setEventCursor(null); setCheckpointCursor(null); setCheckpointTail(0); setQuery(''); setKind(''); setTool(''); setLoading(true);
    Promise.all([get<Page<RecordedEvent>>(`/sessions/${sessionID}/events`, controller.signal), get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints`, controller.signal)])
      .then(([page, cps]) => { setEvents(page.items); setEventCursor(page.next_cursor); setCheckpoints(cps.items); setCheckpointCursor(cps.next_cursor); setCheckpointTail(cps.last_cursor ?? 0); setSelectedID(page.items.at(-1)?.id ?? ''); setError(''); })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sessionID, revision]);

  const loadEvents = useCallback(async () => {
    if (eventCursor === null || refreshing) return;
    setRefreshing(true);
    try { const page = await get<Page<RecordedEvent>>(`/sessions/${sessionID}/events?cursor=${eventCursor}`); if (activeSession.current !== sessionID) return; setEvents(previous => [...previous, ...page.items.filter(e => !previous.some(p => p.id === e.id))]); setEventCursor(page.next_cursor); setError(''); }
    catch (e) { setError(message(e)); } finally { setRefreshing(false); }
  }, [sessionID, eventCursor, refreshing]);

  useEffect(() => {
    if (!sessionID || eventCursor !== null || loading) return;
    const controller = new AbortController();
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || document.hidden) return; busy = true;
      try {
        const [page, cps, newest] = await Promise.all([
          get<Page<RecordedEvent>>(`/sessions/${sessionID}/events?cursor=${events.at(-1)?.sequence ?? 0}`, controller.signal),
          get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints?cursor=${checkpointTail}`, controller.signal),
          get<Page<Session>>('/sessions', controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setEvents(previous => [...previous, ...page.items.filter(e => !previous.some(p => p.id === e.id))]); setEventCursor(page.next_cursor);
        setCheckpoints(previous => [...previous, ...cps.items.filter(cp => !previous.some(p => p.id === cp.id))]); setCheckpointCursor(cps.next_cursor);
        if (cps.last_cursor) setCheckpointTail(cps.last_cursor);
        setSessions(previous => [...newest.items, ...previous.filter(s => !newest.items.some(n => n.id === s.id))]);
      } catch (e) { if (!controller.signal.aborted) setError(`Refresh failed: ${message(e)}`); } finally { busy = false; }
    }, 4000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [sessionID, events, eventCursor, checkpointTail, loading]);

  const selected = events.find(e => e.id === selectedID);
  const near = checkpointNear(events, selectedID);
  const cpID = overrideCP || near?.id || '';
  const currentSession = sessions.find(s => s.id === sessionID);
  const filtered = useMemo(() => filterEvents(events, query, kind, tool), [events, query, kind, tool]);
  const kinds = [...new Set(events.map(e => e.kind))];
  const tools = [...new Set(events.map(e => e.tool_name).filter((s): s is string => !!s))];
  const selectedIndex = filtered.findIndex(e => e.id === selectedID);
  const selectEvent = (id: string) => { setSelectedID(id); setOverrideCP(''); };
  async function moreSessions() { try { const page = await get<Page<Session>>(`/sessions?cursor=${sessionCursor}`); setSessions(previous => [...previous, ...page.items.filter(s => !previous.some(p => p.id === s.id))]); setSessionCursor(page.next_cursor); } catch (e) { setError(message(e)); } }
  async function moreCheckpoints() { try { const page = await get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints?cursor=${checkpointCursor}`); if (activeSession.current !== sessionID) return; setCheckpoints(previous => [...previous, ...page.items.filter(cp => !previous.some(p => p.id === cp.id))]); setCheckpointCursor(page.next_cursor); if (page.last_cursor) setCheckpointTail(previous => Math.max(previous, page.last_cursor!)); } catch (e) { setError(message(e)); } }

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="/" aria-label="AgentTM home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M6 9a10 10 0 1 1-1 9M6 3v7H1M14 8v7l4 2" /></svg></span><span>Agent<span className="brand-light">TM</span><small>WORKSPACE HISTORY</small></span></a>
      <div className="header-divider" />
      <div className="project-label"><span className="muted">PROJECT</span><strong>{health?.project ?? 'Loading project…'}</strong></div>
      <div className="header-spacer" />
      <Onboarding />
      <span className="privacy-badge"><span className="status-dot" /> Local · private</span>
      <button className="icon-button" onClick={() => setRevision(n => n + 1)} title="Refresh history" aria-label="Refresh history">↻</button>
    </header>
    <div className="session-bar">
      <div className="session-select"><label htmlFor="session">Session</label><select id="session" value={sessionID} onChange={e => setSessionID(e.target.value)} disabled={!sessions.length}><option value="" disabled>Select a session</option>{sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.started_at).toLocaleString()} · {short(s.id)} · {s.status}</option>)}</select>{sessionCursor !== null && <button className="text-button" onClick={moreSessions}>Older sessions</button>}</div>
      {currentSession && <span className={`status-pill ${currentSession.status}`}>{currentSession.status.replaceAll('_', ' ')}</span>}
      <span className="session-meta">{currentSession?.agent ?? 'Codex'}<span> / </span>{health?.prompt_mode === 'sanitized' ? 'Sanitized prompts enabled' : 'Prompt text capture off'}</span>
    </div>
    <div className="capture-note"><span aria-hidden="true">◈</span> Workspace observations, not proof of per-tool causality. Only runs launched through AgentTM are recorded.</div>
    {error && <div className="global-error"><ErrorBox>{error} <button className="text-button" onClick={() => setRevision(n => n + 1)}>Retry</button></ErrorBox></div>}
    {!sessionID ? <Empty title={loading ? 'Loading your history' : 'Your history starts with a run'}><p>Record a real Codex session from this repository, then refresh.</p><code>agenttm run codex --model gpt-6.1-sol -- "your task"</code><p className="muted">Existing interactive Codex sessions are not captured.</p></Empty> : <main className="workspace">
      <aside className="timeline-panel" aria-label="Recorded timeline">
        <div className="panel-heading"><h1>Timeline</h1><span className="count">{events.length}</span></div>
        <div className="timeline-filters"><input aria-label="Search event kinds, tools or file paths" placeholder="Search events or file paths…" value={query} onChange={e => setQuery(e.target.value)} /><div className="filter-row"><select aria-label="Filter by event kind" value={kind} onChange={e => setKind(e.target.value)}><option value="">All events</option>{kinds.map(k => <option key={k} value={k}>{label(k)}</option>)}</select><select aria-label="Filter by tool" value={tool} onChange={e => setTool(e.target.value)}><option value="">All tools</option>{tools.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}</select></div></div>
        <div className="timeline-list" role="list" aria-label="Events in receipt order">
          {loading && <p className="loading-inline">Loading events…</p>}
          {!loading && filtered.length === 0 && <p className="muted panel-padding">{events.length ? 'No events match these filters.' : 'No recorded events in this session.'}</p>}
          {filtered.map(event => <div role="listitem" key={event.id}><button className={`event-card ${event.id === selectedID ? 'selected' : ''}`} aria-pressed={event.id === selectedID} onClick={() => selectEvent(event.id)}><span className={`event-glyph ${event.checkpoint_id ? 'checkpoint-glyph' : ''}`} aria-hidden="true">{event.checkpoint_id ? '◈' : event.tool_name ? '⌘' : event.kind.includes('fail') || event.kind === 'error' ? '!' : '·'}</span><span className="event-content"><span className="event-topline"><span className="event-kind">{label(event.kind)}</span><span className="sequence">#{event.sequence}</span></span><span className="event-title">{eventTitle(event)}</span><span className="event-bottom"><time dateTime={event.received_at}>{time(event.received_at)}</time>{event.checkpoint_id && <span className="mini-badge">{short(event.checkpoint_id)}</span>}</span></span></button></div>)}
          {eventCursor !== null && <button className="load-more" onClick={loadEvents} disabled={refreshing}>{refreshing ? 'Loading…' : 'Load next events'}</button>}
        </div>
        <div className="timeline-footer">Receipt order · {eventCursor !== null ? 'more events available' : 'refreshes every 4s'}</div>
      </aside>
      <section className="history-panel" aria-label="Historical workspace">
        <div className="checkpoint-bar"><span className="eyebrow">WORKSPACE</span><select aria-label="Select checkpoint" value={cpID} onChange={e => setOverrideCP(e.target.value)}><option value="" disabled>No known checkpoint</option>{cpID && !checkpoints.some(cp => cp.id === cpID) && <option value={cpID}>{short(cpID)}</option>}{checkpoints.map(cp => <option key={cp.id} value={cp.id}>{cp.kind} · {short(cp.id)}{cp.partial ? ' · partial' : ''}</option>)}</select>{checkpointCursor !== null && <button className="text-button" onClick={moreCheckpoints}>More</button>}</div>
        <div className={`state-note ${overrideCP ? '' : near && !near.exact ? 'last-known' : ''}`}>{overrideCP ? 'Manually selected checkpoint' : near ? near.exact ? 'Checkpoint linked to this observation' : 'Last known workspace · this event has no checkpoint' : 'No checkpoint observed at or before this event'}</div>
        <History key={`${sessionID}:${cpID}`} id={cpID} />
      </section>
      <Activity event={selected} checkpointID={cpID} override={!!overrideCP} />
    </main>}
    <footer className="app-footer"><span><span className="status-dot" /> {health?.version ?? 'AgentTM'} <span className="footer-scope">· local history</span></span><div className="event-navigation"><button onClick={() => selectEvent(filtered[Math.max(0, selectedIndex - 1)].id)} disabled={selectedIndex <= 0}>← Previous event</button><button onClick={() => selectEvent(filtered[selectedIndex + 1].id)} disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1}>Next event →</button></div><button className="fork-action" disabled={!cpID||!health?.csrf_token} onClick={()=>setForkID(cpID)}>Fork checkpoint</button></footer>
    {forkID&&health&&<ForkDialog key={forkID} id={forkID} token={health.csrf_token} onClose={()=>setForkID('')}/>}
  </div>;
}

function Activity({ event, checkpointID, override }: { event?: RecordedEvent; checkpointID: string; override: boolean }) {
  const payload = record(event?.payload);
  const item = record(payload.item);
  const paths = event ? changedPaths(event) : [];
  return <aside className="activity-panel" aria-label="Event details"><div className="panel-heading"><h2>Activity</h2><span className="eyebrow">OBSERVED</span></div>{!event ? <p className="muted panel-padding">Select an event to inspect its details.</p> : <div className="activity-content">
    <span className="eyebrow">EVENT #{event.sequence}</span><h3>{label(event.kind)}</h3>
    <dl className="details"><dt>Received</dt><dd>{new Date(event.received_at).toLocaleString()}</dd><dt>Tool</dt><dd>{event.tool_name?.replaceAll('_', ' ') ?? '—'}</dd><dt>Status</dt><dd>{typeof item.status === 'string' ? item.status : 'Observed'}</dd><dt>Checkpoint</dt><dd>{checkpointID ? <code>{short(checkpointID)}{override ? ' (selected)' : ''}</code> : 'Not yet observed'}</dd>{event.tool_call_id && <><dt>Upstream item</dt><dd><code>{event.tool_call_id}</code></dd></>}</dl>
    {typeof item.command === 'string' && <section><h4>Command</h4><pre className="payload-text">{item.command}</pre></section>}
    {typeof item.aggregated_output === 'string' && <section><h4>Tool output</h4><pre className="payload-text">{item.aggregated_output || '(No output)'}</pre></section>}
    {typeof item.text === 'string' && <section><h4>Agent message</h4><p className="agent-message">{item.text}</p></section>}
    {paths.length > 0 && <section><h4>Changed paths</h4><ul className="changed-paths">{paths.map(p => <li key={p}>{p}</li>)}</ul></section>}
    {payload.truncated === true && <div className="warning-box">Stored event payload was truncated.</div>}
    <details className="payload-details"><summary>Sanitized event payload</summary><pre className="payload-text">{JSON.stringify(event.payload, null, 2)}</pre></details>
    <div className="attribution-note">Observed near this event. File changes may also come from you, other tools, or background processes.</div>
  </div>}</aside>;
}

function History({ id }: { id: string }) {
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [files, setFiles] = useState<SnapshotFile[]>([]);
  const [fileCursor, setFileCursor] = useState<number | null>(null);
  const [path, setPath] = useState('');
  const [content, setContent] = useState<FileContent | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [diffCursor, setDiffCursor] = useState<number | null>(null);
  const [diffTotal, setDiffTotal] = useState(0);
  const [tab, setTab] = useState<'file' | 'diff'>('file');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [diffError, setDiffError] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [fileLoading, setFileLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController(); setLoading(true); setError('');
    Promise.all([get<Checkpoint>(`/checkpoints/${id}`, c.signal), get<Page<SnapshotFile>>(`/checkpoints/${id}/tree`, c.signal)])
      .then(([cp, page]) => { setCheckpoint(cp); setFiles(page.items); setFileCursor(page.next_cursor); setPath(previous => previous || page.items[0]?.path || ''); })
      .catch(e => { if (!c.signal.aborted) setError(message(e)); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [id, retry]);
  useEffect(() => {
    if (!id || !path) return;
    const c = new AbortController(); setContent(null); setFileError(''); setFileLoading(true);
    get<FileContent>(`/checkpoints/${id}/file?path=${encodeURIComponent(path)}`, c.signal).then(setContent)
      .catch(e => { if (!c.signal.aborted) setFileError(message(e)); }).finally(() => { if (!c.signal.aborted) setFileLoading(false); });
    return () => c.abort();
  }, [id, path, retry]);
  useEffect(() => {
    if (!id || tab !== 'diff') return;
    const c = new AbortController(); setDiffLoading(true); setDiffError('');
    get<Page<Change>>(`/checkpoints/${id}/diff`, c.signal).then(page => { setChanges(page.items); setDiffCursor(page.next_cursor); setDiffTotal(page.total ?? 0); })
      .catch(e => { if (!c.signal.aborted) setDiffError(message(e)); }).finally(() => { if (!c.signal.aborted) setDiffLoading(false); });
    return () => c.abort();
  }, [id, tab, retry]);
  async function moreFiles() { try { const page = await get<Page<SnapshotFile>>(`/checkpoints/${id}/tree?cursor=${fileCursor}`); setFiles(previous => [...previous, ...page.items.filter(file => !previous.some(p => p.path === file.path))]); setFileCursor(page.next_cursor); } catch (e) { setError(message(e)); } }
  async function moreChanges() { setDiffLoading(true); try { const page = await get<Page<Change>>(`/checkpoints/${id}/diff?cursor=${diffCursor}`); setChanges(previous => [...previous, ...page.items.filter(change => !previous.some(p => p.path === change.path))]); setDiffCursor(page.next_cursor); } catch (e) { setDiffError(message(e)); } finally { setDiffLoading(false); } }
  if (!id) return <Empty title="No historical workspace yet"><p>Select a snapshot observation or a checkpoint above.</p><p className="muted">Phase 1 sessions have events only. Start a new recording to capture workspace history.</p></Empty>;
  if (loading) return <Empty title="Loading checkpoint…" />;
  if (error) return <div className="panel-padding"><ErrorBox>{error}</ErrorBox><button onClick={() => setRetry(n => n + 1)}>Retry checkpoint</button></div>;
  return <>
    {checkpoint?.partial && <div className="partial-notice"><strong>Partial snapshot</strong><span>{checkpoint.omission_count} omitted paths{checkpoint.potentially_inconsistent ? ' · scan may be inconsistent' : ''}</span><details><summary>View omissions</summary><ul>{checkpoint.omissions?.map((v, i) => <li key={i}><code>{v.path}</code> — {v.reason}</li>)}</ul>{checkpoint.omissions_truncated && <p>Showing the first 100 omissions. Use agenttm show for the full manifest.</p>}</details></div>}
    <div className="view-tabs" role="tablist" aria-label="Workspace view"><button role="tab" aria-selected={tab === 'file'} onClick={() => setTab('file')}>Files <span>{checkpoint?.file_count}</span></button><button role="tab" aria-selected={tab === 'diff'} onClick={() => setTab('diff')}>Compare with parent</button><span className="readonly-label">READ ONLY</span></div>
    {tab === 'file' ? <div className="file-layout"><nav className="file-tree" aria-label="Historical file tree"><input aria-label="Filter loaded file paths" placeholder="Find a file…" value={search} onChange={e => setSearch(e.target.value)} /><div className="tree-list"><FileTree files={files.filter(f => f.path.toLowerCase().includes(search.toLowerCase()))} selected={path} onSelect={setPath} />{fileCursor !== null && <button className="load-more" onClick={moreFiles}>Load more files</button>}{!files.length && <p className="muted panel-padding">No eligible files captured.</p>}</div></nav><section className="editor-panel" aria-label="Historical file contents"><div className="file-heading"><span>{path || 'No file selected'}</span><span>{content ? bytes(content.size) : ''}</span></div>{fileLoading ? <Empty title="Loading historical file…" /> : fileError ? <div className="panel-padding"><ErrorBox>{fileError}</ErrorBox><button onClick={() => setRetry(n => n + 1)}>Retry file</button></div> : content ? <CodeViewer content={content.content} path={path} /> : <Empty title="Select a file" />}</section></div> : <div className="diff-layout"><div className="diff-heading"><strong>{diffTotal} changed paths</strong><span>{checkpoint?.parent_id ? `Compared with ${short(checkpoint.parent_id)}` : 'Baseline compared with empty tree'}</span></div>{diffError && <ErrorBox>{diffError} <button onClick={() => setRetry(n => n + 1)}>Retry diff</button></ErrorBox>}{changes.map(change => <section className="change" key={change.path}><div className="change-heading"><span className={`change-kind ${change.kind}`}>{change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : '~'}</span><strong>{change.path}</strong><span>{change.kind}</span></div>{change.binary ? <p className="diff-message">Binary file changed; contents are not displayed.</p> : change.truncated ? <p className="diff-message">Patch omitted because it exceeds the display limit.</p> : change.patch ? <pre className="patch" tabIndex={0} aria-label={`Unified diff for ${change.path}`}>{change.patch.split('\n').map((line, i) => <span key={i} className={line.startsWith('+') && !line.startsWith('+++') ? 'line-add' : line.startsWith('-') && !line.startsWith('---') ? 'line-remove' : line.startsWith('@@') ? 'line-hunk' : ''}>{line}{'\n'}</span>)}</pre> : <p className="diff-message">{change.old_mode !== change.new_mode ? `File mode: ${change.old_mode?.toString(8) ?? '—'} → ${change.new_mode?.toString(8) ?? '—'}` : 'Empty file change.'}</p>}</section>)}{diffLoading && <p className="loading-inline">Loading changes…</p>}{!diffLoading && !changes.length && !diffError && <Empty title="No file changes" />}{diffCursor !== null && <button className="load-more" onClick={moreChanges} disabled={diffLoading}>Load more changes</button>}</div>}
  </>;
}
