import { useEffect, useRef, useState } from 'react';
import { get, message } from '../api';
import { desktopFeatures, type ChatState } from '../desktop';
import type { Page, RecordedEvent, Session } from '../types';
import { record } from '../state';
import { ModelPicker } from './ModelPicker';
import { codexError } from '../codexErrors';

export function ChatPage({ resume, sessions, onRecorded }: { resume: string; sessions: Session[]; onRecorded: () => void }) {
  const bridge = desktopFeatures();
  const [session, setSession] = useState(resume);
  const [state, setState] = useState<ChatState | null>(null);
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const after = useRef(0);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [sandbox, setSandbox] = useState('read-only');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [lastPrompt, setLastPrompt] = useState('');
  useEffect(() => { setSession(resume); }, [resume]);
  useEffect(() => { after.current = 0; setEvents([]); setCursor(null); }, [session]);
  useEffect(() => {
    if (!bridge) return;
    let disposed = false; let querying = false;
    async function poll() {
      if (querying) return; querying = true;
      try { const current = await bridge!.ChatStatus(); if (!disposed) { setState(current); if (current.running && current.session_id) setSession(current.session_id); setRevision(n => n + 1); } }
      catch (e) { if (!disposed) setError(message(e)); } finally { querying = false; }
    }
    void poll(); const timer = setInterval(poll, 1500);
    return () => { disposed = true; clearInterval(timer); };
  }, [!!bridge]);
  useEffect(() => {
    if (!session) { setEvents([]); setCursor(null); return; }
    const controller = new AbortController();
    get<Page<RecordedEvent>>(`/sessions/${session}/events?cursor=${after.current}&limit=200`, controller.signal).then(page => { if (controller.signal.aborted) return; setEvents(previous => [...previous, ...page.items.filter(e => !previous.some(p => p.id === e.id))]); after.current = page.items.at(-1)?.sequence ?? after.current; setCursor(page.next_cursor); })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, [session, revision]);
  async function older() {
    if (cursor === null) return;
    try { const page = await get<Page<RecordedEvent>>(`/sessions/${session}/events?cursor=${after.current}&limit=200`); setEvents(previous => [...previous, ...page.items.filter(e => !previous.some(p => p.id === e.id))]); after.current = page.items.at(-1)?.sequence ?? after.current; setCursor(page.next_cursor); } catch (e) { setError(message(e)); }
  }
  async function send() {
    if (!bridge || !prompt.trim() || busy || state?.running) return;
    if (!model.trim()) { setError('Choose a Codex model before sending your message.'); return; }
    setBusy(true); setError('');
    try { const id = await bridge.StartChat(session, prompt, model, sandbox); setSession(id); setLastPrompt(prompt); setPrompt(''); setState({ session_id: id, running: true, draft: '', error: '', approvals: [] }); onRecorded(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  const current = state?.session_id === session ? state : null;
  const problem = error || current?.error;
  const friendlyError = problem ? codexError(problem) : null;
  if (!bridge) return <div className="page-scroll"><div className="page-empty"><h2>Chat is available in the desktop app</h2><p>Open the native AgentTM app to chat with Codex, answer approval requests, and continue recorded conversations.</p><code>agenttm run codex -- "your task"</code><p>The browser can still inspect recordings started from the CLI.</p></div></div>;
  return <div className="chat-page"><div className="chat-options"><label>Conversation<select aria-label="Chat conversation" disabled={!!state?.running || busy} value={session} onChange={e => { setSession(e.target.value); setEvents([]); setLastPrompt(''); setError(''); }}><option value="">New conversation</option>{sessions.filter(s => s.resumable || s.id === session).map(s => <option key={s.id} value={s.id}>{s.id.slice(0, 8)} · {new Date(s.started_at).toLocaleString()}</option>)}{session && !sessions.some(s => s.id === session) && <option value={session}>{session.slice(0, 8)}</option>}</select></label><ModelPicker bridge={bridge} value={model} onChange={setModel} disabled={!!state?.running || busy}/><label>Permissions<select aria-label="Chat permissions" value={sandbox} onChange={e => setSandbox(e.target.value)} disabled={!!state?.running}><option value="read-only">Read only</option><option value="workspace-write">Allow project edits</option></select></label></div>
    <p className="view-explanation">{session ? 'Continue this Codex conversation with a follow-up message.' : 'Send a message to start a recorded Codex conversation.'} Each turn captures workspace observations. Tool approvals appear here when requested.</p>
    <div className="chat-transcript" aria-label="Conversation messages" aria-live="polite">{!events.length && !lastPrompt && <div className="page-empty"><h2>What would you like to work on?</h2><p>Start small: ask Codex to explain your project. Switch permissions to “Allow project edits” when you want code changes.</p></div>}{events.map(event => {
      const p = record(event.payload); const item = record(p.item);
      if (event.kind === 'agenttm.chat.prompt') return <article className="chat-message user" key={event.id}><strong>You</strong><p>{lastPrompt && event.id === events.filter(e => e.kind === 'agenttm.chat.prompt').at(-1)?.id ? lastPrompt : String(p.text ?? '[Prompt text capture is off]')}</p></article>;
      if (event.kind === 'item.completed' && item.type === 'agent_message') return <article className="chat-message" key={event.id}><strong>Codex</strong><p>{String(item.text ?? '')}</p></article>;
      if (event.tool_name && event.kind === 'item.completed') return <details className="chat-tool" key={event.id}><summary>{event.tool_name.replaceAll('_', ' ')} · {String(item.status ?? 'observed')}</summary><pre>{String(item.command ?? '')}{item.aggregated_output ? '\n' + String(item.aggregated_output) : ''}</pre></details>;
      return null;
    })}{cursor !== null && <button onClick={older}>Load more conversation events</button>}{current?.draft && <article className="chat-message"><strong>Codex · replying</strong><p>{current.draft}</p></article>}{current?.running && <p role="status">Codex is working…</p>}</div>
    {!!current?.approvals.length && <div className="chat-approvals">{current.approvals.map(approval => <section key={approval.id}><h2>Codex needs your approval</h2><p>{approval.reason || approval.method}</p><pre>{approval.command || 'Approve the proposed file changes?'}</pre>{approval.directory && <p>Location: {approval.directory}</p>}<button onClick={() => bridge.DecideChat(approval.id, false).catch(e => setError(message(e)))}>Decline</button><button className="primary-button" onClick={() => bridge.DecideChat(approval.id, true).catch(e => setError(message(e)))}>Allow once</button></section>)}</div>}
    {friendlyError && <div className="error-box" role="alert"><strong>{friendlyError.title}</strong><p>{friendlyError.detail}</p><p>{friendlyError.action}</p></div>}
    <form className="chat-composer" onSubmit={e => { e.preventDefault(); void send(); }}><label htmlFor="chat-message">{session ? 'Your follow-up' : 'Your message'}</label><textarea id="chat-message" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask Codex about this project…" maxLength={32000} disabled={busy || !!state?.running}/><div><small>Prompt storage follows your project's capture setting. Codex keeps its own conversation history.</small>{state?.running ? <button type="button" onClick={() => bridge.StopChat().catch(e => setError(message(e)))}>Stop turn</button> : <button className="primary-button" disabled={busy || !prompt.trim() || !model.trim()}>{busy ? 'Starting…' : session ? 'Continue conversation' : 'Send to Codex'}</button>}</div></form>
  </div>;
}
