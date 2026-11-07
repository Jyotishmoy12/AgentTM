import type { Session } from '../../types';
import { NavIcon } from '../atoms/NavIcon';

export function SessionCards({
  sessions,
  onOpen,
}: {
  sessions: Session[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="session-cards">
      {sessions.map((session) => (
        <button
          key={session.id}
          className="session-summary"
          onClick={() => onOpen(session.id)}
          aria-label={`Open session ${session.id.slice(0, 8)}`}
        >
          <span className="session-symbol">
            <NavIcon name="sessions" />
          </span>
          <span className="session-summary-main">
            <strong>{session.title || new Date(session.started_at).toLocaleString()}</strong>
            <span>
              {session.agent} <span aria-hidden="true">·</span> {session.id.slice(0, 8)}
            </span>
          </span>
          <span className={`status-pill ${session.status}`}>
            {session.status.replaceAll('_', ' ')}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}
