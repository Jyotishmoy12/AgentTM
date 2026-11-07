import { useEffect } from 'react';
import { message } from '../api';
import { getHealth } from '../handlers/health';
import { listSessions } from '../handlers/sessions';
import { useWorkspaceState } from './useWorkspaceState';

export function useProjectHistory() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    commandOpen,
    setCommandOpen,
    page,
    setPage,
    exploring,
    setExploring,
    explorerMode,
    setExplorerMode,
    inspectCheckpoint,
    resumeSession,
    setResumeSession,
    health,
    setHealth,
    sessions,
    setSessions,
    sessionCursor,
    setSessionCursor,
    sessionID,
    setSessionID,
    loadedSession,
    activeSession,
    events,
    setEvents,
    eventCursor,
    setEventCursor,
    checkpoints,
    setCheckpoints,
    checkpointCursor,
    setCheckpointCursor,
    checkpointTail,
    setCheckpointTail,
    error,
    setError,
    loading,
    setLoading,
    revision,
    setRevision,
    refreshing,
    setRefreshing,
    forkID,
    setForkID,
    renameID,
    setRenameID,
  } = useWorkspaceState();

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
    Promise.all([getHealth(controller.signal), listSessions(controller.signal)])
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
  return {
    sidebarCollapsed,
    toggleSidebar,
    commandOpen,
    setCommandOpen,
    page,
    setPage,
    exploring,
    setExploring,
    explorerMode,
    setExplorerMode,
    inspectCheckpoint,
    resumeSession,
    setResumeSession,
    health,
    sessions,
    setSessions,
    sessionCursor,
    setSessionCursor,
    sessionID,
    setSessionID,
    loadedSession,
    activeSession,
    events,
    setEvents,
    eventCursor,
    setEventCursor,
    checkpoints,
    setCheckpoints,
    checkpointCursor,
    setCheckpointCursor,
    checkpointTail,
    setCheckpointTail,
    error,
    setError,
    loading,
    setLoading,
    revision,
    setRevision,
    refreshing,
    setRefreshing,
    forkID,
    setForkID,
    renameID,
    setRenameID,
  };
}
