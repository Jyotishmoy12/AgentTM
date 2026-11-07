import { useCallback } from 'react';
import { message } from '../api';
import { short } from '../data/App';
import { navigation } from '../data/NavigationPages';
import { listSessionEventsAfter } from '../handlers/events';
import type { AppCommand } from '../types/CommandMenu';
import type { AppPage } from '../types/NavigationPages';
import { useHistoryPolling } from './useHistoryPolling';
import { useSessionHistory } from './useSessionHistory';

export function useAppNavigation() {
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
  } = useSessionHistory();

  const loadEvents = useCallback(async () => {
    if (eventCursor === null || refreshing) return;
    setRefreshing(true);
    try {
      const page = await listSessionEventsAfter(sessionID, eventCursor);
      if (activeSession.current !== sessionID) return;
      setEvents((previous) => [
        ...previous,
        ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
      ]);
      setEventCursor(page.next_cursor);
      setError('');
    } catch (e) {
      setError(message(e));
    } finally {
      setRefreshing(false);
    }
  }, [sessionID, eventCursor, refreshing]);

  const { currentSession, openSession } = useHistoryPolling({
    model: {
      sessionID,
      eventCursor,
      loading,
      events,
      checkpointTail,
      setEvents,
      setEventCursor,
      setCheckpoints,
      setCheckpointCursor,
      setCheckpointTail,
      setSessions,
      setError,
      sessions,
      setSessionID,
      setPage,
      setExploring,
    },
  });
  const navigate = (destination: AppPage) => {
    setPage(destination === 'checkpoints' ? 'sessions' : destination);
    setExploring('');
  };
  const commands: AppCommand[] = [
    ...navigation.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.hint,
      icon: item.icon,
      run: () => navigate(item.id),
    })),
    {
      id: 'refresh',
      title: 'Refresh history',
      detail: 'Reload recorded sessions and workspace observations',
      icon: 'refresh',
      run: () => setRevision((n) => n + 1),
    },
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      title: session.title || `Open session ${short(session.id)}`,
      detail: `${short(session.id)} · ${new Date(session.started_at).toLocaleString()} · ${session.status.replaceAll('_', ' ')}`,
      icon: 'sessions',
      run: () => openSession(session.id),
    })),
  ];
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
    eventCursor,
    checkpoints,
    setCheckpoints,
    checkpointCursor,
    setCheckpointCursor,
    setCheckpointTail,
    error,
    setError,
    loading,
    revision,
    setRevision,
    refreshing,
    forkID,
    setForkID,
    renameID,
    setRenameID,
    loadEvents,
    currentSession,
    openSession,
    navigate,
    commands,
  };
}
