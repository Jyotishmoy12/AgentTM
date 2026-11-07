import { useState } from 'react';
import { HomeIcon } from '../components/atoms/HomeIcon';
import { SessionCard } from '../components/molecules/SessionCard';
import { desktopBridge } from '../handlers/native';
import type { Health, Session } from '../types';
import type { AppPage } from '../types/NavigationPages';

export function Overview({
  sessions,
  health,
  more,
  onOpen,
  navigate,
  onRename,
}: {
  sessions: Session[];
  health: Health | null;
  more: boolean;
  onOpen: (id: string) => void;
  navigate: (page: AppPage) => void;
  onRename: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'recent' | 'active' | 'completed'>('recent');
  const desktopChat = !!desktopBridge() && 'StartChat' in desktopBridge()!;
  const filtered = sessions.filter((session) => filter === 'recent' || session.status === filter);
  const recent = [...filtered]
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
    .slice(0, 8);
  return (
    <div className="page-scroll home-overview">
      <header className="home-heading">
        <div>
          <h1>Overview</h1>
        </div>
        <div className="home-actions">
          <button className="home-new" onClick={() => navigate(desktopChat ? 'chat' : 'setup')}>
            <HomeIcon name="chat" />
            {desktopChat ? 'New conversation' : 'Set up recording'}
          </button>
          <button className="home-guide" onClick={() => navigate('setup')}>
            <HomeIcon name="book" />
            Recording guide
          </button>
        </div>
      </header>

      <div className="home-library-heading">
        <div
          className="home-filters"
          role="tablist"
          aria-label="Recent session filter"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const values = ['recent', 'active', 'completed'] as const;
            const index = values.indexOf(filter);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? 2
                  : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            setFilter(values[next]);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next].focus();
          }}
        >
          {(['recent', 'active', 'completed'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              tabIndex={filter === value ? 0 : -1}
              onClick={() => setFilter(value)}
            >
              {value === 'recent' ? 'Recents' : value === 'active' ? 'Active' : 'Completed'}
            </button>
          ))}
        </div>
        <button className="home-view-all" onClick={() => navigate('sessions')}>
          All sessions
          <HomeIcon name="arrow" />
        </button>
      </div>

      <section className="home-library" aria-label="Recent sessions">
        {recent.length ? (
          <div className="home-session-grid">
            {recent.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                project={health?.project || 'Current project'}
                onOpen={onOpen}
                onRename={onRename}
                canRename={!!health?.csrf_token}
              />
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <span className="home-empty-icon">
              <HomeIcon name="session" />
            </span>
            <h2>
              {sessions.length
                ? 'No ' + filter + ' sessions in loaded history'
                : 'Your history starts with a run'}
            </h2>
            <p>
              {sessions.length
                ? 'Choose Recents to browse your other recordings.'
                : 'Set up Codex, start a conversation, and your recordings will appear here.'}
            </p>
            <button
              onClick={() =>
                sessions.length ? setFilter('recent') : navigate(desktopChat ? 'chat' : 'setup')
              }
            >
              {sessions.length
                ? 'Show recents'
                : desktopChat
                  ? 'Start a conversation'
                  : 'Set up recording'}
              <HomeIcon name="arrow" />
            </button>
          </div>
        )}
        {filtered.length > 8 || more ? (
          <button className="home-more" onClick={() => navigate('sessions')}>
            Browse more sessions
            <HomeIcon name="arrow" />
          </button>
        ) : null}
      </section>

      <footer className="home-footer">
        <span>
          <span className="status-dot" />
          History stored on this device
        </span>
        <span>
          {health?.prompt_mode === 'sanitized'
            ? 'Sanitized prompt capture enabled'
            : 'Prompt text capture off'}
        </span>
        <span>
          {sessions.length}
          {more ? '+' : ''} loaded sessions
        </span>
      </footer>
    </div>
  );
}
