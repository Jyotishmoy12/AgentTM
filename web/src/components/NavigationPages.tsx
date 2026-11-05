import type { Session } from '../types';

export type AppPage =
  | 'overview'
  | 'chat'
  | 'sessions'
  | 'checkpoints'
  | 'restores'
  | 'storage'
  | 'setup';
export const navigation: {
  id: AppPage;
  title: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: 'overview',
    title: 'Overview',
    hint: 'Your starting point',
    icon: 'home',
  },
  {
    id: 'chat',
    title: 'Chat with Codex',
    hint: 'Record & continue',
    icon: 'chat',
  },
  {
    id: 'sessions',
    title: 'History',
    hint: 'Sessions & captured workspaces',
    icon: 'sessions',
  },
  {
    id: 'restores',
    title: 'Restored workspaces',
    hint: 'Separate working copies',
    icon: 'restores',
  },
  {
    id: 'storage',
    title: 'Storage & backups',
    hint: 'Protect & clean up history',
    icon: 'storage',
  },
  {
    id: 'setup',
    title: 'Settings',
    hint: 'Recording setup & help',
    icon: 'setup',
  },
];
const descriptions: Record<AppPage, string> = {
  overview: 'Record a run, explore its history, then restore the workspace you need.',
  chat: 'Chat with Codex in this project. Start a new conversation or continue a recorded one.',
  sessions:
    'A session is one recorded agent run. Open one to explore its timeline, files, and changes.',
  checkpoints:
    'A checkpoint captures project files at a moment in a recording. Inspect it or restore a separate copy.',
  restores:
    'Find the separate Git worktrees created from your checkpoints. Your original workspace stays in place.',
  storage:
    'Create encrypted history backups, restore into a clean clone, and safely reclaim unused blob storage.',
  setup: 'Check your recording setup and learn what each part of AgentTM does.',
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      )}
      {name === 'refresh' && (
        <>
          <path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6" />
        </>
      )}
      {name === 'sidebar' && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M9 4v16M5.5 8h1M5.5 12h1" />
        </>
      )}
      {['sidebar-expand', 'sidebar-collapse'].includes(name) && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M9 4v16" />
          {name === 'sidebar-expand' ? <path d="m13 9 3 3-3 3" /> : <path d="m16 9-3 3 3 3" />}
        </>
      )}
      {name === 'home' && (
        <>
          <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
        </>
      )}
      {!['search', 'refresh', 'sidebar', 'sidebar-expand', 'sidebar-collapse', 'home'].includes(
        name,
      ) && (
        <>
          {name === 'chat' ? (
            <>
              <path d="M4 4h16v12H9l-5 4V4Z" />
              <path d="M8 8h8M8 12h5" />
            </>
          ) : name === 'storage' ? (
            <>
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
            </>
          ) : name === 'overview' ? (
            <>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </>
          ) : name === 'sessions' ? (
            <>
              <path d="M7 4h14M7 12h14M7 20h14" />
              <circle cx="3" cy="4" r="1" />
              <circle cx="3" cy="12" r="1" />
              <circle cx="3" cy="20" r="1" />
            </>
          ) : name === 'checkpoints' ? (
            <>
              <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
            </>
          ) : name === 'restores' ? (
            <>
              <circle cx="6" cy="5" r="2" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="18" cy="5" r="2" />
              <path d="M6 7v10M18 7v1a6 6 0 0 1-6 6H6" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

export function PageHeading({ page, children }: { page: AppPage; children?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">YOUR WORKSPACE HISTORY</span>
        <h1>{navigation.find((n) => n.id === page)?.title}</h1>
        <p>{descriptions[page]}</p>
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  );
}

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

export { Overview } from './Overview';
