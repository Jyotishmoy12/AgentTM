import { useCallback, useEffect, useRef, useState } from 'react';
import type { Checkpoint, Health, RecordedEvent, Session } from '../types';
import type { AppPage } from '../types/NavigationPages';

export function useWorkspaceState() {
  const [compactNavigation, setCompactNavigation] = useState(
    () => matchMedia('(min-width:651px) and (max-width:800px)').matches,
  );
  const [sidebarPreference, setSidebarPreference] = useState<boolean | null>(null);
  const sidebarCollapsed = sidebarPreference ?? compactNavigation;
  const toggleSidebar = useCallback(
    () => setSidebarPreference((current) => !(current ?? compactNavigation)),
    [compactNavigation],
  );
  useEffect(() => {
    const media = matchMedia('(min-width:651px) and (max-width:800px)');
    const update = () => setCompactNavigation(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [commandOpen, setCommandOpen] = useState(false);
  const [page, setPage] = useState<AppPage>('overview');
  const [exploring, setExploring] = useState('');
  const [explorerMode, setExplorerMode] = useState<'file' | 'diff'>('file');
  const inspectCheckpoint = useCallback((id: string, mode: 'file' | 'diff' = 'file') => {
    setExplorerMode(mode);
    setExploring(id);
  }, []);
  const [resumeSession, setResumeSession] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCursor, setSessionCursor] = useState<number | null>(null);
  const [sessionID, setSessionID] = useState('');
  const loadedSession = useRef('');
  const activeSession = useRef(sessionID);
  activeSession.current = sessionID;
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [eventCursor, setEventCursor] = useState<number | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointCursor, setCheckpointCursor] = useState<number | null>(null);
  const [checkpointTail, setCheckpointTail] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [forkID, setForkID] = useState('');
  const [renameID, setRenameID] = useState('');
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
  };
}
