import { Fragment } from 'react';
import { navigation } from '../../data/NavigationPages';
import type { Health, Session } from '../../types';
import type { AppPage } from '../../types/NavigationPages';
import { NavIcon } from '../atoms/NavIcon';
import { ProjectMenu } from './ProjectMenu';

export function AppSidebar({
  model: viewModel,
}: {
  model: {
    setPage: import('react').Dispatch<import('react').SetStateAction<AppPage>>;
    health: Health | null;
    sidebarCollapsed: boolean;
    setCommandOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    page: AppPage;
    navigate: (destination: AppPage) => void;
    sessions: Session[];
    sessionCursor: number | null;
  };
}) {
  const {
    setPage,
    health,
    sidebarCollapsed,
    setCommandOpen,
    page,
    navigate,
    sessions,
    sessionCursor,
  } = viewModel;
  return (
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
          <svg className="app-icon" viewBox="0 0 28 28">
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
  );
}
