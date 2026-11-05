import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { get, message } from './api';
import type { Checkpoint, Health, Page, RecordedEvent, Session } from './types';
import { VisualHistory } from './components/VisualHistory';
import { CheckpointExplorer } from './components/CheckpointExplorer';
import { RestoredWorkspaces } from './components/RestoredWorkspaces';
import { historyDate } from './history-presentation';
import { ProjectMenu } from './components/ProjectMenu';
import { SessionNameDialog } from './components/SessionNameDialog';
import { ForkDialog } from './components/ForkDialog';
import { Onboarding } from './components/Onboarding';
import { SettingsPage } from './components/SettingsPage';
import { NavIcon, navigation, Overview, PageHeading } from './components/NavigationPages';
import type { AppPage } from './components/NavigationPages';
import { ChatPage } from './components/ChatPage';
import { StoragePage } from './components/StoragePage';
import { CommandMenu, type AppCommand } from './components/CommandMenu';
import './navigation.css';
import './features.css';
import './desktop-refresh.css';
import './workbench.css';
import './overview.css';
import './chat-editorial.css';
import './history-editorial.css';
import './restores-editorial.css';
import './storage-editorial.css';
import './settings-editorial.css';
import './project-editorial.css';
import './ui-consistency.css';
import { SidebarTooltip } from './components/SidebarTooltip';

const short = (id: string) => id.slice(0, 8);

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="error-box" role="alert">
      {children}
    </div>
  );
}
function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-orbit" aria-hidden="true">
        ◷
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export function App() {
  const [compactNavigation, setCompactNavigation] = useState(
    () => matchMedia('(min-width:651px) and (max-width:800px)').matches,
  );
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(null);
  const sidebarCollapsed = sidebarPreference ?? compactNavigation;
  const toggleSidebar = useCallback(
    () => setSidebarPreference((current) => !(current ?? compactNavigation)),
    [compactNavigation],
  );
  useEffect(() => {
    const media = matchMedia('(min-width:651px) and (max-width:800px)');
    const update = () => setCompactNavigation(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [commandOpen, setCommandOpen] = useState(false);
  const [page, setPage] = useState<AppPage>('overview');
  const [exploring, setExploring] = useState('');
  const [explorerMode, setExplorerMode] = useState<'file' | 'diff'>('file');
  const inspectCheckpoint = useCallback((id: string, mode: 'file' | 'diff' = 'file') => {
    setExplorerMode(mode);
    setExploring(id);
  }, []);
  const [resumeSession, setResumeSession] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCursor, setSessionCursor] = useState<number | null>(null);
  const [sessionID, setSessionID] = useState('');
  const loadedSession = useRef('');
  const activeSession = useRef(sessionID);
  activeSession.current = sessionID;
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [eventCursor, setEventCursor] = useState<number | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointCursor, setCheckpointCursor] = useState<number | null>(null);
  const [checkpointTail, setCheckpointTail] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [forkID, setForkID] = useState('');
  const [renameID, setRenameID] = useState('');

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat)
        return;
      if (event.key.toLowerCase() === 'k') {
        if (document.querySelector('dialog[open], [role="dialog"]')) return;
        event.preventDefault();
        setCommandOpen(true);
      }
      if (
        event.key.toLowerCase() === 'b' &&
        !(
          event.target instanceof Element &&
          event.target.closest('input, textarea, [contenteditable="true"], [role="dialog"], dialog')
        )
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [toggleSidebar]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      get<Health>('/health', controller.signal),
      get<Page<Session>>('/sessions', controller.signal),
    ])
      .then(([info, page]) => {
        if (controller.signal.aborted) return;
        setHealth(info);
        setSessions((previous) => [
          ...page.items,
          ...previous.filter((s) => !page.items.some((n) => n.id === s.id)),
        ]);
        setSessionCursor(page.next_cursor);
        setSessionID((current) => current || page.items[0]?.id || '');
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!sessionID) return;
    const controller = new AbortController();
    const changed = loadedSession.current !== sessionID;
    loadedSession.current = sessionID;
    if (changed) {
      setEvents([]);
      setCheckpoints([]);
      setEventCursor(null);
      setCheckpointCursor(null);
      setCheckpointTail(0);
    }
    setLoading(true);
    Promise.all([
      get<Page<RecordedEvent>>(`/sessions/${sessionID}/events`, controller.signal),
      get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints`, controller.signal),
    ])
      .then(([page, cps]) => {
        if (controller.signal.aborted) return;
        setEvents((previous) =>
          changed
            ? page.items
            : [
                ...page.items,
                ...previous.filter((event) => !page.items.some((next) => next.id === event.id)),
              ].sort((a, b) => a.sequence - b.sequence),
        );
        setEventCursor(page.next_cursor);
        setCheckpoints((previous) =>
          changed
            ? cps.items
            : [
                ...cps.items,
                ...previous.filter((cp) => !cps.items.some((next) => next.id === cp.id)),
              ],
        );
        setCheckpointCursor(cps.next_cursor);
        setCheckpointTail(cps.last_cursor ?? 0);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sessionID, revision]);

  const loadEvents = useCallback(async () => {
    if (eventCursor === null || refreshing) return;
    setRefreshing(true);
    try {
      const page = await get<Page<RecordedEvent>>(
        `/sessions/${sessionID}/events?cursor=${eventCursor}`,
      );
      if (activeSession.current !== sessionID) return;
      setEvents((previous) => [
        ...previous,
        ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
      ]);
      setEventCursor(page.next_cursor);
      setError('');
    } catch (e) {
      setError(message(e));
    } finally {
      setRefreshing(false);
    }
  }, [sessionID, eventCursor, refreshing]);

  useEffect(() => {
    if (!sessionID || eventCursor !== null || loading) return;
    const controller = new AbortController();
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const [page, cps, newest] = await Promise.all([
          get<Page<RecordedEvent>>(
            `/sessions/${sessionID}/events?cursor=${events.at(-1)?.sequence ?? 0}`,
            controller.signal,
          ),
          get<Page<Checkpoint>>(
            `/sessions/${sessionID}/checkpoints?cursor=${checkpointTail}`,
            controller.signal,
          ),
          get<Page<Session>>('/sessions', controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setEvents((previous) => [
          ...previous,
          ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
        ]);
        setEventCursor(page.next_cursor);
        setCheckpoints((previous) => [
          ...previous,
          ...cps.items.filter((cp) => !previous.some((p) => p.id === cp.id)),
        ]);
        setCheckpointCursor(cps.next_cursor);
        if (cps.last_cursor) setCheckpointTail(cps.last_cursor);
        setSessions((previous) => [
          ...newest.items,
          ...previous.filter((s) => !newest.items.some((n) => n.id === s.id)),
        ]);
      } catch (e) {
        if (!controller.signal.aborted) setError(`Refresh failed: ${message(e)}`);
      } finally {
        busy = false;
      }
    }, 4000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [sessionID, events, eventCursor, checkpointTail, loading]);

  const currentSession = sessions.find((s) => s.id === sessionID);
  const openSession = (id: string) => {
    setSessionID(id);
    setPage('sessions');
    setExploring('');
  };
  const navigate = (destination: AppPage) => {
    setPage(destination === 'checkpoints' ? 'sessions' : destination);
    setExploring('');
  };
  const commands: AppCommand[] = [
    ...navigation.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.hint,
      icon: item.icon,
      run: () => navigate(item.id),
    })),
    {
      id: 'refresh',
      title: 'Refresh history',
      detail: 'Reload recorded sessions and workspace observations',
      icon: 'refresh',
      run: () => setRevision((n) => n + 1),
    },
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      title: session.title || `Open session ${short(session.id)}`,
      detail: `${short(session.id)} · ${new Date(session.started_at).toLocaleString()} · ${session.status.replaceAll('_', ' ')}`,
      icon: 'sessions',
      run: () => openSession(session.id),
    })),
  ];
  async function moreSessions() {
    try {
      const page = await get<Page<Session>>(`/sessions?cursor=${sessionCursor}`);
      setSessions((previous) => [
        ...previous,
        ...page.items.filter((s) => !previous.some((p) => p.id === s.id)),
      ]);
      setSessionCursor(page.next_cursor);
    } catch (e) {
      setError(message(e));
    }
  }
  async function moreCheckpoints() {
    try {
      const page = await get<Page<Checkpoint>>(
        `/sessions/${sessionID}/checkpoints?cursor=${checkpointCursor}`,
      );
      if (activeSession.current !== sessionID) return;
      setCheckpoints((previous) => [
        ...previous,
        ...page.items.filter((cp) => !previous.some((p) => p.id === cp.id)),
      ]);
      setCheckpointCursor(page.next_cursor);
      if (page.last_cursor) setCheckpointTail((previous) => Math.max(previous, page.last_cursor!));
    } catch (e) {
      setError(message(e));
    }
  }

  const sessionSelector = (
    <div className="session-bar">
      <div className="session-select">
        <label htmlFor="session">Session</label>
        <select
          id="session"
          value={sessionID}
          onChange={(e) => {
            setSessionID(e.target.value);
            setExploring('');
          }}
          disabled={!sessions.length}
        >
          <option value="" disabled>
            Select a session
          </option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title ? s.title + ' · ' : ''}
              {historyDate(s.started_at)} · {short(s.id)} · {s.status}
            </option>
          ))}
        </select>
        {sessionCursor !== null && (
          <button className="text-button" onClick={moreSessions}>
            Older sessions
          </button>
        )}
      </div>
      {sessionID && (
        <button
          className="text-button session-name-trigger"
          disabled={!health?.csrf_token}
          onClick={() => setRenameID(sessionID)}
          aria-label="Rename current session"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z" />
          </svg>
          <span>Name session</span>
        </button>
      )}
      {currentSession?.resumable && (
        <button
          className="text-button"
          onClick={() => {
            setResumeSession(sessionID);
            setPage('chat');
          }}
        >
          Continue in chat
        </button>
      )}
      <span className="session-meta">
        {currentSession?.agent ?? 'Codex'}
        <span> / </span>
        {health?.prompt_mode === 'sanitized'
          ? 'Sanitized prompts enabled'
          : 'Prompt text capture off'}
      </span>
    </div>
  );
  return (
    <div
      className={`app-shell navigation-shell refreshed-shell library-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      <aside className="app-sidebar" id="app-sidebar" aria-label="Workspace navigation">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('overview');
          }}
          aria-label="AgentTM home"
        >
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28">
              <path d="M6 9a10 10 0 1 1-1 9M6 3v7H1M14 8v7l4 2" />
            </svg>
          </span>
          <span>
            Agent<span className="brand-light">TM</span>
            <small>WORKSPACE HISTORY</small>
          </span>
        </a>
        <ProjectMenu project={health?.project || 'Loading project…'} compact={sidebarCollapsed} />
        <button
          className="sidebar-search"
          onClick={() => setCommandOpen(true)}
          title={sidebarCollapsed ? undefined : 'Search commands and sessions (Ctrl+K)'}
          data-sidebar-tooltip="Search anything · Ctrl+K"
          aria-label="Search anything"
        >
          <NavIcon name="search" />
          <span>Search anything</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav aria-label="Main navigation">
          {navigation.map((item, index) => (
            <Fragment key={item.id}>
              {(index === 0 || item.id === 'storage') && (
                <span className="nav-group-label">{index === 0 ? 'WORKSPACE' : 'MANAGE'}</span>
              )}
              <button
                aria-label={item.title}
                title={sidebarCollapsed ? undefined : `${item.title} — ${item.hint}`}
                data-sidebar-tooltip={`${item.title} · ${item.hint}`}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <NavIcon name={item.icon} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.hint}</small>
                </span>
                {item.id === 'sessions' && (
                  <span className="nav-count">
                    {sessions.length}
                    {sessionCursor !== null ? '+' : ''}
                  </span>
                )}
              </button>
            </Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="privacy-badge">
            <span className="status-dot" />
            History on this device
          </span>
          <p>Codex uses its configured service.</p>
        </div>
      </aside>
      <main className={`app-main ${page === 'chat' ? 'chat-layout' : ''}`}>
        <header className="topbar">
          <div className="toolbar-location">
            <button
              className="toolbar-icon"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={`${sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
              aria-expanded={!sidebarCollapsed}
              aria-controls="app-sidebar"
              onClick={toggleSidebar}
            >
              <NavIcon name={sidebarCollapsed ? 'sidebar-expand' : 'sidebar-collapse'} />
            </button>
            <span className="workspace-breadcrumb">
              <span>{health?.project || 'Workspace'}</span>
              <span aria-hidden="true">/</span>
              <strong>{navigation.find((n) => n.id === page)?.title}</strong>
            </span>
          </div>
          <div className="toolbar-actions">
            <button
              className="toolbar-command"
              onClick={() => setCommandOpen(true)}
              aria-label="Open command menu"
              title="Search commands (Ctrl+K)"
            >
              <NavIcon name="search" />
              <span>Commands</span>
              <kbd>Ctrl K</kbd>
            </button>
            <Onboarding projectName={health?.project} />
            <button
              className="toolbar-icon"
              onClick={() => setRevision((n) => n + 1)}
              aria-label="Refresh history"
              title="Refresh history"
            >
              <NavIcon name="refresh" />
            </button>
          </div>
        </header>
        {!(
          page === 'overview' ||
          page === 'chat' ||
          page === 'checkpoints' ||
          page === 'sessions' ||
          page === 'restores' ||
          page === 'storage' ||
          page === 'setup'
        ) && <PageHeading page={page} />}
        {error && (
          <div className="global-error">
            <ErrorBox>
              {error}{' '}
              <button className="text-button" onClick={() => setRevision((n) => n + 1)}>
                Retry
              </button>
            </ErrorBox>
          </div>
        )}
        {page === 'overview' && (
          <Overview
            sessions={sessions}
            health={health}
            more={sessionCursor !== null}
            onOpen={openSession}
            navigate={navigate}
            onRename={setRenameID}
          />
        )}
        {page === 'setup' && <SettingsPage health={health} />}
        {page === 'chat' && (
          <ChatPage
            resume={resumeSession}
            project={health?.project || 'Workspace'}
            promptMode={health?.prompt_mode || 'metadata_only'}
            onInspect={openSession}
            sessions={sessions}
            onRecorded={() => setRevision((n) => n + 1)}
          />
        )}
        {page === 'storage' && <StoragePage />}
        {page === 'restores' && (
          <RestoredWorkspaces
            revision={revision}
            onInspect={async (id) => {
              const checkpoint = await get<Checkpoint>('/checkpoints/' + id);
              setSessionID(checkpoint.session_id);
              setExplorerMode('file');
              setPage('sessions');
              setExploring(id);
            }}
            onCheckpoints={() => {
              setExploring('');
              setPage('sessions');
            }}
          />
        )}
        {(page === 'sessions' || page === 'checkpoints') && (
          <div className="history-experience">
            <div className="history-discovery" hidden={!!exploring}>
              {sessionSelector}
              <VisualHistory
                key={sessionID}
                session={currentSession}
                events={events}
                checkpoints={checkpoints}
                loading={loading}
                eventMore={eventCursor !== null}
                checkpointMore={checkpointCursor !== null}
                busy={refreshing}
                loadEvents={loadEvents}
                loadCheckpoints={moreCheckpoints}
                inspect={inspectCheckpoint}
              />
            </div>
            {exploring && (
              <CheckpointExplorer
                key={sessionID}
                id={exploring}
                initialMode={explorerMode}
                checkpoints={checkpoints}
                onCheckpoint={setExploring}
                onBack={() => {
                  const id = exploring;
                  setExploring('');
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLButtonElement>(
                        '[aria-label="Inspect checkpoint ' + id.slice(0, 8) + '"]',
                      )
                      ?.focus({ preventScroll: true }),
                  );
                }}
                onRestore={setForkID}
                canRestore={!!health?.csrf_token}
                more={checkpointCursor !== null}
                loadMore={moreCheckpoints}
              />
            )}
          </div>
        )}
      </main>
      <footer className="shell-status">
        <span>
          <span className="status-dot" />
          Local history <span className="status-divider">/</span> {health?.version || 'AgentTM'}
        </span>
        <span>
          {currentSession
            ? `${short(currentSession.id)} · ${currentSession.status.replaceAll('_', ' ')}`
            : 'No session selected'}
        </span>
        <button onClick={() => setCommandOpen(true)}>
          <kbd>Ctrl K</kbd> Commands
        </button>
      </footer>
      <SidebarTooltip />
      <CommandMenu open={commandOpen} close={() => setCommandOpen(false)} commands={commands} />
      {renameID && health && sessions.some((session) => session.id === renameID) && (
        <SessionNameDialog
          key={renameID}
          session={sessions.find((session) => session.id === renameID)!}
          token={health.csrf_token}
          onClose={() => setRenameID('')}
          onSaved={(id, title) => {
            setSessions((previous) =>
              previous.map((session) => (session.id === id ? { ...session, title } : session)),
            );
            setRenameID('');
          }}
        />
      )}
      {forkID && health && (
        <ForkDialog
          key={forkID}
          id={forkID}
          token={health.csrf_token}
          onViewRestores={() => {
            setForkID('');
            setPage('restores');
            setRevision((n) => n + 1);
          }}
          onClose={() => {
            setForkID('');
            setRevision((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
