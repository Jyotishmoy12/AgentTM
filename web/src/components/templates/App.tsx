import { message } from '../../api';
import { short } from '../../data/App';
import { getCheckpoint, listSessionCheckpoints } from '../../handlers/checkpoints';
import { listSessionsAfter } from '../../handlers/sessions';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { ChatPage } from '../../pages/ChatPage';
import { Overview } from '../../pages/Overview';
import { RestoredWorkspaces } from '../../pages/RestoredWorkspaces';
import { SettingsPage } from '../../pages/SettingsPage';
import { StoragePage } from '../../pages/StoragePage';
import { ErrorBox } from '../atoms/ErrorBox';
import { AppHistoryExperience } from '../organisms/AppHistoryExperience';
import { AppSessionBar } from '../organisms/AppSessionBar';
import { AppSidebar } from '../organisms/AppSidebar';
import { AppTopbar } from '../organisms/AppTopbar';
import { CommandMenu } from '../organisms/CommandMenu';
import { ForkDialog } from '../organisms/ForkDialog';
import { PageHeading } from '../organisms/PageHeading';
import { SessionNameDialog } from '../organisms/SessionNameDialog';
import { SidebarTooltip } from '../organisms/SidebarTooltip';

export function App() {
  const view = useAppNavigation();
  async function moreSessions() {
    try {
      const page = await listSessionsAfter(view.sessionCursor);
      view.setSessions((previous) => [
        ...previous,
        ...page.items.filter((s) => !previous.some((p) => p.id === s.id)),
      ]);
      view.setSessionCursor(page.next_cursor);
    } catch (e) {
      view.setError(message(e));
    }
  }
  async function moreCheckpoints() {
    try {
      const page = await listSessionCheckpoints(view.sessionID, view.checkpointCursor);
      if (view.activeSession.current !== view.sessionID) return;
      view.setCheckpoints((previous) => [
        ...previous,
        ...page.items.filter((cp) => !previous.some((p) => p.id === cp.id)),
      ]);
      view.setCheckpointCursor(page.next_cursor);
      if (page.last_cursor)
        view.setCheckpointTail((previous) => Math.max(previous, page.last_cursor!));
    } catch (e) {
      view.setError(message(e));
    }
  }

  const sessionSelector = <AppSessionBar model={{ ...view, moreSessions }} />;
  return (
    <div
      className={`app-shell navigation-shell refreshed-shell library-shell ${view.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      <AppSidebar model={view} />
      <main className={`app-main ${view.page === 'chat' ? 'chat-layout' : ''}`}>
        <AppTopbar model={view} />
        {!(
          view.page === 'overview' ||
          view.page === 'chat' ||
          view.page === 'checkpoints' ||
          view.page === 'sessions' ||
          view.page === 'restores' ||
          view.page === 'storage' ||
          view.page === 'setup'
        ) && <PageHeading page={view.page} />}
        {view.error && (
          <div className="global-error">
            <ErrorBox>
              {view.error}{' '}
              <button className="text-button" onClick={() => view.setRevision((n) => n + 1)}>
                Retry
              </button>
            </ErrorBox>
          </div>
        )}
        {view.page === 'overview' && (
          <Overview
            sessions={view.sessions}
            health={view.health}
            more={view.sessionCursor !== null}
            onOpen={view.openSession}
            navigate={view.navigate}
            onRename={view.setRenameID}
          />
        )}
        {view.page === 'setup' && <SettingsPage health={view.health} />}
        {view.page === 'chat' && (
          <ChatPage
            resume={view.resumeSession}
            project={view.health?.project || 'Workspace'}
            promptMode={view.health?.prompt_mode || 'metadata_only'}
            onInspect={view.openSession}
            sessions={view.sessions}
            onRecorded={() => view.setRevision((n) => n + 1)}
          />
        )}
        {view.page === 'storage' && <StoragePage />}
        {view.page === 'restores' && (
          <RestoredWorkspaces
            revision={view.revision}
            onInspect={async (id) => {
              const checkpoint = await getCheckpoint(id);
              view.setSessionID(checkpoint.session_id);
              view.setExplorerMode('file');
              view.setPage('sessions');
              view.setExploring(id);
            }}
            onCheckpoints={() => {
              view.setExploring('');
              view.setPage('sessions');
            }}
          />
        )}
        {(view.page === 'sessions' || view.page === 'checkpoints') && (
          <AppHistoryExperience model={{ ...view, sessionSelector, moreCheckpoints }} />
        )}
      </main>
      <footer className="shell-status">
        <span>
          <span className="status-dot" />
          Local history <span className="status-divider">/</span>{' '}
          {view.health?.version || 'AgentTM'}
        </span>
        <span>
          {view.currentSession
            ? `${short(view.currentSession.id)} · ${view.currentSession.status.replaceAll('_', ' ')}`
            : 'No session selected'}
        </span>
        <button onClick={() => view.setCommandOpen(true)}>
          <kbd>Ctrl K</kbd> Commands
        </button>
      </footer>
      <SidebarTooltip />
      <CommandMenu
        open={view.commandOpen}
        close={() => view.setCommandOpen(false)}
        commands={view.commands}
      />
      {view.renameID &&
        view.health &&
        view.sessions.some((session) => session.id === view.renameID) && (
          <SessionNameDialog
            key={view.renameID}
            session={view.sessions.find((session) => session.id === view.renameID)!}
            token={view.health.csrf_token}
            onClose={() => view.setRenameID('')}
            onSaved={(id, title) => {
              view.setSessions((previous) =>
                previous.map((session) => (session.id === id ? { ...session, title } : session)),
              );
              view.setRenameID('');
            }}
          />
        )}
      {view.forkID && view.health && (
        <ForkDialog
          key={view.forkID}
          id={view.forkID}
          token={view.health.csrf_token}
          onViewRestores={() => {
            view.setForkID('');
            view.setPage('restores');
            view.setRevision((n) => n + 1);
          }}
          onClose={() => {
            view.setForkID('');
            view.setRevision((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
