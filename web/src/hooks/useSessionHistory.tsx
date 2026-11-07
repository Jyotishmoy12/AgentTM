import { useEffect } from 'react';
import { message } from '../api';
import { initialSessionCheckpoints } from '../handlers/checkpoints';
import { listSessionEvents } from '../handlers/events';
import { useProjectHistory } from './useProjectHistory';

export function useSessionHistory() {
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
  } = useProjectHistory();

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
      listSessionEvents(sessionID, controller.signal),
      initialSessionCheckpoints(sessionID, controller.signal),
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
