import { short } from '../../data/App';
import { historyDate } from '../../history-presentation';
import type { Health, Session } from '../../types';
import type { AppPage } from '../../types/NavigationPages';

export function AppSessionBar({
  model: viewModel,
}: {
  model: {
    sessionID: string;
    setSessionID: import('react').Dispatch<import('react').SetStateAction<string>>;
    setExploring: import('react').Dispatch<import('react').SetStateAction<string>>;
    sessions: Session[];
    sessionCursor: number | null;
    moreSessions: () => Promise<void>;
    health: Health | null;
    setRenameID: import('react').Dispatch<import('react').SetStateAction<string>>;
    currentSession: Session | undefined;
    setResumeSession: import('react').Dispatch<import('react').SetStateAction<string>>;
    setPage: import('react').Dispatch<import('react').SetStateAction<AppPage>>;
  };
}) {
  const {
    sessionID,
    setSessionID,
    setExploring,
    sessions,
    sessionCursor,
    moreSessions,
    health,
    setRenameID,
    currentSession,
    setResumeSession,
    setPage,
  } = viewModel;
  return (
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
            className="app-icon"
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
}
