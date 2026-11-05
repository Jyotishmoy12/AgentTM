import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { get, message } from '../api';
import { desktopFeatures, type ChatState } from '../desktop';
import type { Page, RecordedEvent, Session } from '../types';
import { record } from '../state';
import { ModelPicker } from './ModelPicker';
import { codexError } from '../codexErrors';
import { ChatContent, ChatIcon } from './ChatContent';

export function ChatPage({
  resume,
  sessions,
  onRecorded,
  project,
  promptMode,
  onInspect,
}: {
  resume: string;
  sessions: Session[];
  onRecorded: () => void;
  project: string;
  promptMode: string;
  onInspect: (id: string) => void;
}) {
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
  const [stopping, setStopping] = useState(false);
  const [deciding, setDeciding] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(!!resume);
  const [pending, setPending] = useState<{
    session: string;
    text: string;
    after: number;
    sentAt: number;
  } | null>(null);
  const [localPrompts, setLocalPrompts] = useState(new Map<string, string>());
  const transcript = useRef<HTMLDivElement>(null);
  const approvals = useRef<HTMLDivElement>(null);
  const conversationMenu = useRef<HTMLDetailsElement>(null);
  const follow = useRef(true);
  const activeSession = useRef(session);
  activeSession.current = session;
  const [jump, setJump] = useState(false);
  useEffect(() => {
    setSession(resume);
  }, [resume]);
  useEffect(() => {
    after.current = 0;
    setEvents([]);
    setCursor(null);
    follow.current = true;
    setJump(false);
  }, [session]);
  useEffect(() => {
    if (!bridge) return;
    let disposed = false,
      querying = false;
    async function poll() {
      if (querying) return;
      querying = true;
      try {
        const current = await bridge!.ChatStatus();
        if (!disposed) {
          setState(current);
          if (current.running && current.session_id) setSession(current.session_id);
          if (!current.running) setStopping(false);
          setRevision((n) => n + 1);
        }
      } catch (e) {
        if (!disposed) setError(message(e));
      } finally {
        querying = false;
      }
    }
    void poll();
    const timer = setInterval(poll, 1500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [!!bridge]);
  useEffect(() => {
    if (!session) {
      setEvents([]);
      setCursor(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    if (after.current === 0) setLoading(true);
    get<Page<RecordedEvent>>(
      `/sessions/${session}/events?cursor=${after.current}&limit=200`,
      controller.signal,
    )
      .then((page) => {
        if (controller.signal.aborted) return;
        setEvents((previous) => [
          ...previous,
          ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
        ]);
        after.current = page.items.at(-1)?.sequence ?? after.current;
        setCursor(page.next_cursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, revision]);
  async function more() {
    if (cursor === null || loading) return;
    const id = session;
    setLoading(true);
    try {
      const page = await get<Page<RecordedEvent>>(
        `/sessions/${id}/events?cursor=${after.current}&limit=200`,
      );
      if (activeSession.current !== id) return;
      setEvents((previous) => [
        ...previous,
        ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
      ]);
      after.current = page.items.at(-1)?.sequence ?? after.current;
      setCursor(page.next_cursor);
    } catch (e) {
      if (activeSession.current === id) setError(message(e));
    } finally {
      if (activeSession.current === id) setLoading(false);
    }
  }
  async function send() {
    if (!bridge || !prompt.trim() || busy || state?.running) return;
    if (!model.trim()) {
      setError('Choose a Codex model before sending your message.');
      return;
    }
    const text = prompt;
    const sequence = after.current;
    const sentAt = Date.now();
    setBusy(true);
    setError('');
    follow.current = true;
    try {
      const id = await bridge.StartChat(session, text, model, sandbox);
      setPending({
        session: id,
        text,
        after: id === session ? sequence : 0,
        sentAt,
      });
      setSession(id);
      setPrompt('');
      setState({
        session_id: id,
        running: true,
        draft: '',
        error: '',
        approvals: [],
      });
      onRecorded();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    if (!bridge || stopping) return;
    setStopping(true);
    try {
      await bridge.StopChat();
      const current = await bridge.ChatStatus();
      setState(current);
      if (!current.running) setStopping(false);
    } catch (e) {
      setError(message(e));
      setStopping(false);
    }
  }
  async function decide(id: string, allow: boolean) {
    if (!bridge || deciding) return;
    setDeciding(id);
    try {
      await bridge.DecideChat(id, allow);
      setState(await bridge.ChatStatus());
    } catch (e) {
      setError(message(e));
    } finally {
      setDeciding('');
    }
  }
  function choose(id: string) {
    if (state?.running || busy) return;
    setSession(id);
    setLoading(!!id);
    setEvents([]);
    setPending(null);
    setLocalPrompts(new Map());
    setError('');
    setPrompt('');
    follow.current = true;
    if (conversationMenu.current) conversationMenu.current.open = false;
  }
  const current = state?.session_id === session ? state : null;
  const selected = sessions.find((s) => s.id === session);
  const locked = busy || !!state?.running;
  const problem = error || current?.error;
  const friendlyError = problem ? codexError(problem) : null;
  const pendingEvent = useMemo(
    () =>
      pending?.session === session
        ? events.find(
            (e) =>
              e.kind === 'agenttm.chat.prompt' &&
              e.sequence > pending.after &&
              Date.parse(e.received_at) >= pending.sentAt,
          )
        : undefined,
    [events, pending, session],
  );
  useEffect(() => {
    if (!pendingEvent || !pending) return;
    setLocalPrompts((previous) => {
      if (previous.get(pendingEvent.id) === pending.text) return previous;
      const next = new Map(previous);
      next.set(pendingEvent.id, pending.text);
      if (next.size > 100) next.delete(next.keys().next().value!);
      return next;
    });
  }, [pendingEvent, pending]);
  const empty = !session && !pending && !current?.running;
  const completedCalls = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.kind === 'item.completed' && e.tool_call_id)
          .map((e) => e.tool_call_id),
      ),
    [events],
  );
  useLayoutEffect(() => {
    if (follow.current && transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [events, current?.draft, current?.approvals.length, pending, session]);
  function latest() {
    follow.current = true;
    setJump(false);
    const node = transcript.current;
    if (node)
      node.scrollTo({
        top: node.scrollHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  }
  if (!bridge)
    return (
      <div className="page-scroll">
        <div className="page-empty">
          <h2>Chat is available in the desktop app</h2>
          <p>
            Open the native AgentTM app to chat with Codex, answer approval requests, and continue
            recorded conversations.
          </p>
          <code>agenttm run codex -- "your task"</code>
          <p>The browser can still inspect recordings started from the CLI.</p>
        </div>
      </div>
    );
  return (
    <section
      className={'chat-page editorial-chat ' + (empty ? 'chat-empty-state' : 'chat-active-state')}
      aria-label="Codex workspace"
    >
      <header className="chat-conversation-header">
        <div className="chat-identity">
          <h1>Chat with Codex</h1>
          <p title={selected?.title || session}>
            {project}
            <span>/</span>
            {selected?.title ||
              (session ? 'Conversation · ' + session.slice(0, 8) : 'New conversation')}
          </p>
        </div>
        <div className="chat-header-actions">
          {session && (
            <button
              type="button"
              className="chat-history-link"
              onClick={() => onInspect(session)}
              title="Open recorded events and workspace checkpoints"
            >
              <ChatIcon name="layers" />
              <span>View history</span>
            </button>
          )}
          <details
            className="chat-conversation-menu"
            ref={conversationMenu}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary
              aria-label="Saved conversations"
              aria-disabled={locked}
              onClick={(event) => {
                if (locked) event.preventDefault();
              }}
              title="Saved conversations"
            >
              <ChatIcon name="history" />
            </summary>
            <div className="chat-saved-panel">
              <label>
                Saved conversations
                <select
                  aria-label="Chat conversation"
                  disabled={locked}
                  value={session}
                  onChange={(event) => choose(event.target.value)}
                >
                  <option value="">New conversation</option>
                  {sessions
                    .filter((s) => s.resumable || s.id === session)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title ? s.title + ' · ' : ''}
                        {s.id.slice(0, 8)} · {new Date(s.started_at).toLocaleString()}
                      </option>
                    ))}
                  {session && !sessions.some((s) => s.id === session) && (
                    <option value={session}>{session.slice(0, 8)}</option>
                  )}
                </select>
              </label>
              <button type="button" disabled={locked} onClick={() => choose('')}>
                <ChatIcon name="plus" />
                New conversation
              </button>
            </div>
          </details>
          <button
            type="button"
            className="chat-icon-button"
            aria-label="New conversation"
            title="New conversation"
            disabled={locked}
            onClick={() => choose('')}
          >
            <ChatIcon name="plus" />
          </button>
        </div>
      </header>
      <div className="chat-reading-area">
        <div
          ref={transcript}
          className="chat-transcript"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
          aria-relevant="additions text"
          onScroll={(event) => {
            const el = event.currentTarget;
            follow.current = el.scrollHeight - el.clientHeight - el.scrollTop < 80;
            setJump(!follow.current);
          }}
        >
          <div className="chat-content-column">
            {empty ? (
              <div className="chat-welcome">
                <span className="chat-welcome-symbol">
                  <ChatIcon name="spark" />
                </span>
                <h2>What are we building today?</h2>
                <p>Your Codex session, recorded with AgentTM.</p>
              </div>
            ) : (
              <>
                {loading && !events.length && !pending && (
                  <p className="chat-system-note">Loading your conversation…</p>
                )}
                {events.map((event) => {
                  const p = record(event.payload),
                    item = record(p.item);
                  if (event.kind === 'agenttm.chat.prompt')
                    return (
                      <article className="chat-message user" key={event.id}>
                        <div className="chat-message-heading">You</div>
                        <ChatContent
                          text={
                            localPrompts.get(event.id) ||
                            (pendingEvent?.id === event.id && pending
                              ? pending.text
                              : String(p.text ?? '[Prompt text capture is off]'))
                          }
                        />
                      </article>
                    );
                  if (event.kind === 'item.completed' && item.type === 'agent_message')
                    return (
                      <article className="chat-message assistant" key={event.id}>
                        <div className="chat-message-heading">
                          <ChatIcon name="spark" />
                          Codex
                        </div>
                        <ChatContent text={String(item.text ?? '')} />
                      </article>
                    );
                  if (
                    event.tool_name &&
                    (event.kind === 'item.completed' ||
                      (event.kind === 'item.started' &&
                        current?.running &&
                        !!event.tool_call_id &&
                        !completedCalls.has(event.tool_call_id)))
                  ) {
                    const failed =
                      item.status === 'failed' ||
                      (typeof item.exit_code === 'number' && item.exit_code !== 0);
                    const status = failed
                      ? 'Failed'
                      : event.kind === 'item.started'
                        ? 'Started'
                        : String(item.status ?? 'Observed');
                    return (
                      <details
                        className={'chat-tool ' + (failed ? 'chat-tool-failed' : '')}
                        key={event.id}
                        open={failed ? true : undefined}
                      >
                        <summary>
                          <ChatIcon name="tool" />
                          <span>{event.tool_name.replaceAll('_', ' ')}</span>
                          <span className="chat-tool-state">{status}</span>
                        </summary>
                        {failed && (
                          <p className="chat-tool-failure" role="alert">
                            Tool execution failed
                            {typeof item.exit_code === 'number'
                              ? ' (exit ' + item.exit_code + ')'
                              : ''}
                            . Review the recorded output below.
                          </p>
                        )}
                        <pre tabIndex={0}>
                          {String(item.command ?? '')}
                          {item.aggregated_output ? '\n' + String(item.aggregated_output) : ''}
                          {!item.command && !item.aggregated_output
                            ? JSON.stringify(item, null, 2)
                            : ''}
                        </pre>
                        {event.checkpoint_id && (
                          <button
                            type="button"
                            className="chat-tool-history"
                            onClick={() => onInspect(session)}
                          >
                            View captured workspace in history
                          </button>
                        )}
                      </details>
                    );
                  }
                  if (event.kind === 'error' || event.kind.endsWith('.failed'))
                    return (
                      <div className="chat-system-error" role="alert" key={event.id}>
                        {String(
                          p.message ??
                            record(p.error).message ??
                            'A failure was recorded for this turn. View history for details.',
                        )}
                      </div>
                    );
                  return null;
                })}
                {pending?.session === session && !pendingEvent && (
                  <article className="chat-message user">
                    <div className="chat-message-heading">You</div>
                    <ChatContent text={pending.text} />
                  </article>
                )}
                {cursor !== null && (
                  <button
                    type="button"
                    className="chat-load-more"
                    disabled={loading}
                    onClick={more}
                  >
                    {loading ? 'Loading…' : 'Load more conversation events'}
                  </button>
                )}
                {current?.draft && (
                  <article className="chat-message assistant streaming">
                    <div className="chat-message-heading">
                      <ChatIcon name="spark" />
                      Codex<span className="chat-stream-label">Replying</span>
                    </div>
                    <ChatContent text={current.draft} />
                  </article>
                )}
                {!!current?.approvals.length && (
                  <div className="chat-approvals" ref={approvals}>
                    {current.approvals.map((approval) => (
                      <section key={approval.id}>
                        <span className="chat-approval-eyebrow">
                          <ChatIcon name="shield" />
                          YOUR PERMISSION
                        </span>
                        <h2>Codex needs your approval</h2>
                        <p>{approval.reason || approval.method}</p>
                        <pre tabIndex={0}>
                          {approval.command || 'Approve the proposed file changes?'}
                        </pre>
                        {approval.directory && (
                          <p className="chat-approval-location">Location: {approval.directory}</p>
                        )}
                        <div className="chat-approval-actions">
                          <button
                            type="button"
                            disabled={!!deciding}
                            onClick={() => decide(approval.id, false)}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            disabled={!!deciding}
                            onClick={() => decide(approval.id, true)}
                          >
                            {deciding === approval.id ? 'Sending decision…' : 'Allow once'}
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {current?.running && !current.approvals.length && (
                  <p className="chat-working" role="status">
                    <span />
                    {stopping ? 'Stopping turn…' : 'Codex is working…'}
                  </p>
                )}
                {!loading && !events.length && !pending && !current?.running && (
                  <p className="chat-system-note">
                    No conversation messages were captured. View history to inspect recorded
                    activity.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        {jump && !empty && (
          <button className="chat-jump-latest" type="button" onClick={latest}>
            Latest messages
            <ChatIcon name="chevron" />
          </button>
        )}
      </div>
      <div className="chat-compose-dock">
        {!!current?.approvals.length && (
          <button
            type="button"
            className="chat-attention-strip"
            onClick={() => {
              follow.current = true;
              approvals.current?.scrollIntoView({ block: 'end' });
            }}
          >
            <ChatIcon name="shield" />
            {current.approvals.length} approval
            {current.approvals.length === 1 ? '' : 's'} waiting for your decision<span>Review</span>
          </button>
        )}
        {friendlyError && (
          <div className="error-box chat-error" role="alert">
            <strong>{friendlyError.title}</strong>
            <p>{friendlyError.detail}</p>
            <p>{friendlyError.action}</p>
          </div>
        )}
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="chat-message">
            {session ? 'Your follow-up' : 'Your message'}
          </label>
          <textarea
            id="chat-message"
            value={prompt}
            rows={3}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                (event.ctrlKey || event.metaKey) &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask Codex anything about your project…"
            maxLength={32000}
            disabled={locked}
          />
          <div className="chat-composer-toolbar">
            <div className="chat-composer-controls">
              <ModelPicker bridge={bridge} value={model} onChange={setModel} disabled={locked} />
              <label className="chat-permission-control">
                <ChatIcon name="shield" />
                <span className="sr-only">Permissions</span>
                <select
                  aria-label="Chat permissions"
                  value={sandbox}
                  onChange={(event) => setSandbox(event.target.value)}
                  disabled={locked}
                >
                  <option value="read-only">Read only</option>
                  <option value="workspace-write">Allow project edits</option>
                </select>
              </label>
            </div>
            {state?.running ? (
              <button
                className="chat-send chat-stop"
                type="button"
                disabled={stopping}
                aria-label="Stop turn"
                title="Stop turn"
                onClick={stop}
              >
                <ChatIcon name="stop" />
              </button>
            ) : (
              <button
                className="chat-send"
                type="submit"
                aria-label={
                  busy ? 'Starting…' : session ? 'Continue conversation' : 'Send to Codex'
                }
                title={busy ? 'Starting…' : 'Send message (Ctrl+Enter)'}
                disabled={busy || !prompt.trim() || !model.trim()}
              >
                <ChatIcon name="arrow" />
              </button>
            )}
          </div>
        </form>
        <div className="chat-composer-footnote">
          <span>
            <span className={'chat-recording-dot ' + (current?.running ? 'recording' : '')} />
            {busy
              ? 'Starting turn…'
              : current?.running
                ? 'Recording this turn'
                : session
                  ? 'Recorded conversation'
                  : 'Records when you send'}
            <span className="chat-footnote-divider">·</span>
            {promptMode === 'sanitized' ? 'Sanitized prompts saved locally' : 'Prompt capture off'}
          </span>
          <span>Ctrl+Enter to send</span>
        </div>
      </div>
    </section>
  );
}
