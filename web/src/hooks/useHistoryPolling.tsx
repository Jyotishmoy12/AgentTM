import { useEffect } from 'react';
import { message } from '../api';
import { pollSessionCheckpoints } from '../handlers/checkpoints';
import { listSessionEventsAfter } from '../handlers/events';
import { listSessions } from '../handlers/sessions';
import type { Checkpoint, RecordedEvent, Session } from '../types';
import type { AppPage } from '../types/NavigationPages';

export function useHistoryPolling({
  model: viewModel,
}: {
  model: {
    sessionID: string;
    eventCursor: number | null;
    loading: boolean;
    events: RecordedEvent[];
    checkpointTail: number;
    setEvents: import('react').Dispatch<import('react').SetStateAction<RecordedEvent[]>>;
    setEventCursor: import('react').Dispatch<import('react').SetStateAction<number | null>>;
    setCheckpoints: import('react').Dispatch<import('react').SetStateAction<Checkpoint[]>>;
    setCheckpointCursor: import('react').Dispatch<import('react').SetStateAction<number | null>>;
    setCheckpointTail: import('react').Dispatch<import('react').SetStateAction<number>>;
    setSessions: import('react').Dispatch<import('react').SetStateAction<Session[]>>;
    setError: import('react').Dispatch<import('react').SetStateAction<string>>;
    sessions: Session[];
    setSessionID: import('react').Dispatch<import('react').SetStateAction<string>>;
    setPage: import('react').Dispatch<import('react').SetStateAction<AppPage>>;
    setExploring: import('react').Dispatch<import('react').SetStateAction<string>>;
  };
}) {
  const {
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
  } = viewModel;
  useEffect(() => {
    if (!sessionID || eventCursor !== null || loading) return;
    const controller = new AbortController();
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const [page, cps, newest] = await Promise.all([
          listSessionEventsAfter(sessionID, events.at(-1)?.sequence ?? 0, controller.signal),
          pollSessionCheckpoints(sessionID, checkpointTail, controller.signal),
          listSessions(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setEvents((previous) => [
          ...previous,
          ...page.items.filter((e) => !previous.some((p) => p.id === e.id)),
        ]);
        setEventCursor(page.next_cursor);
        setCheckpoints((previous) => [
          ...previous,
          ...cps.items.filter((cp) => !previous.some((p) => p.id === cp.id)),
        ]);
        setCheckpointCursor(cps.next_cursor);
        if (cps.last_cursor) setCheckpointTail(cps.last_cursor);
        setSessions((previous) => [
          ...newest.items,
          ...previous.filter((s) => !newest.items.some((n) => n.id === s.id)),
        ]);
      } catch (e) {
        if (!controller.signal.aborted) setError(`Refresh failed: ${message(e)}`);
      } finally {
        busy = false;
      }
    }, 4000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [sessionID, events, eventCursor, checkpointTail, loading]);

  const currentSession = sessions.find((s) => s.id === sessionID);
  const openSession = (id: string) => {
    setSessionID(id);
    setPage('sessions');
    setExploring('');
  };
  return { currentSession, openSession };
}
