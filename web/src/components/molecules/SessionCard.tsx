import { useEffect, useState } from 'react';
import { previewSessionEvents } from '../../handlers/events';
import { changedPaths, eventTitle, record } from '../../state';
import type { Session } from '../../types';
import { HomeIcon } from '../atoms/HomeIcon';

export function SessionCard({
  session,
  project,
  onOpen,
  onRename,
  canRename,
}: {
  session: Session;
  project: string;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  canRename: boolean;
}) {
  const [lines, setLines] = useState<{ kind: string; text: string }[] | null>(null);
  const [failed, setFailed] = useState(false);
  const fallback =
    session.title || `${session.agent === 'codex' ? 'Codex' : session.agent} session`;
  const [heading, setHeading] = useState(fallback);
  useEffect(() => {
    const controller = new AbortController();
    setHeading(fallback);
    previewSessionEvents(session.id, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setFailed(false);
          const firstPrompt = page.items.find(
            (event) => event.kind === 'agenttm.chat.prompt' || event.kind === 'agenttm.run.started',
          );
          const payload = record(firstPrompt?.payload);
          const prompt =
            firstPrompt?.kind === 'agenttm.chat.prompt' ? payload.text : payload.prompt;
          const text = typeof prompt === 'string' ? prompt.replace(/\s+/g, ' ').trim() : '';
          setHeading(
            session.title
              ? session.title
              : text && !/^\[(?:prompt.*(?:off|omitted)|redacted)\]$/i.test(text)
                ? text.slice(0, 120) + (text.length > 120 ? '…' : '')
                : fallback,
          );
          const activity = page.items.filter(
            (event) => event.kind !== 'agenttm.chat.prompt' && event.kind !== 'agenttm.run.started',
          );
          const detailed = activity.filter((event) => {
            const item = record(record(event.payload).item);
            return (
              typeof item.command === 'string' ||
              typeof item.text === 'string' ||
              changedPaths(event).length > 0
            );
          });
          setLines(
            (detailed.length ? detailed : activity).slice(0, 3).map((event) => ({
              kind: event.kind.replace('agenttm.', '').replaceAll('.', ' / '),
              text: (changedPaths(event).join(', ') || eventTitle(event)).slice(0, 120),
            })),
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [session.id, session.status, fallback]);
  return (
    <article className="home-session-tile">
      <button
        className={'home-session-card home-session-' + session.status}
        onClick={() => onOpen(session.id)}
        aria-label={`Open session ${session.id.slice(0, 8)}`}
      >
        <h2 title={session.title || heading}>{session.title || heading}</h2>
        <div className="home-card-project">
          <span className="home-document-icon">
            <HomeIcon name="session" />
          </span>
          <span>{project}</span>
        </div>
        <div className="home-recording-page">
          <div className="home-paper-date">
            {new Date(session.started_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          {failed ? (
            <p className="home-preview-notice">
              Preview unavailable. Open this session to inspect its history.
            </p>
          ) : lines === null ? (
            <p className="home-preview-notice">Loading recorded activity…</p>
          ) : !lines.length ? (
            <p className="home-preview-notice">No recorded events yet.</p>
          ) : (
            lines.map((line, i) => (
              <div className="home-preview-entry" key={i}>
                <strong>{line.kind}</strong>
                <p>{line.text}</p>
              </div>
            ))
          )}
        </div>
        <div className="home-card-bottom">
          <span className={'home-session-status ' + session.status}>
            <span />
            {session.status.replaceAll('_', ' ')}
          </span>
          <span className="home-view-session">
            View session
            <HomeIcon name="arrow" />
          </span>
        </div>
      </button>
      <button
        className="home-rename-session"
        title="Name this session"
        aria-label={`Rename session ${session.id.slice(0, 8)}`}
        disabled={!canRename}
        onClick={() => onRename(session.id)}
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
      </button>
    </article>
  );
}
