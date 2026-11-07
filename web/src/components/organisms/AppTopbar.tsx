import { navigation } from '../../data/NavigationPages';
import type { Health } from '../../types';
import type { AppPage } from '../../types/NavigationPages';
import { NavIcon } from '../atoms/NavIcon';
import { Onboarding } from './Onboarding';

export function AppTopbar({
  model: viewModel,
}: {
  model: {
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    health: Health | null;
    page: AppPage;
    setCommandOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    setRevision: import('react').Dispatch<import('react').SetStateAction<number>>;
  };
}) {
  const { sidebarCollapsed, toggleSidebar, health, page, setCommandOpen, setRevision } = viewModel;
  return (
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
  );
}
