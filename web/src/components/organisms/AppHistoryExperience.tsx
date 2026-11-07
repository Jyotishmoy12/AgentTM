import { VisualHistory } from '../../pages/VisualHistory';
import type { Checkpoint, Health, RecordedEvent, Session } from '../../types';
import { CheckpointExplorer } from '../templates/CheckpointExplorer';

export function AppHistoryExperience({
  model: viewModel,
}: {
  model: {
    exploring: string;
    sessionSelector: import('react/jsx-runtime').JSX.Element;
    sessionID: string;
    currentSession: Session | undefined;
    events: RecordedEvent[];
    checkpoints: Checkpoint[];
    loading: boolean;
    eventCursor: number | null;
    checkpointCursor: number | null;
    refreshing: boolean;
    loadEvents: () => Promise<void>;
    moreCheckpoints: () => Promise<void>;
    inspectCheckpoint: (id: string, mode?: 'file' | 'diff') => void;
    explorerMode: 'file' | 'diff';
    setExploring: import('react').Dispatch<import('react').SetStateAction<string>>;
    setForkID: import('react').Dispatch<import('react').SetStateAction<string>>;
    health: Health | null;
  };
}) {
  const {
    exploring,
    sessionSelector,
    sessionID,
    currentSession,
    events,
    checkpoints,
    loading,
    eventCursor,
    checkpointCursor,
    refreshing,
    loadEvents,
    moreCheckpoints,
    inspectCheckpoint,
    explorerMode,
    setExploring,
    setForkID,
    health,
  } = viewModel;
  return (
    <div className="history-experience">
      <div className="history-discovery" hidden={!!exploring}>
        {sessionSelector}
        <VisualHistory
          key={sessionID}
          session={currentSession}
          events={events}
          checkpoints={checkpoints}
          loading={loading}
          eventMore={eventCursor !== null}
          checkpointMore={checkpointCursor !== null}
          busy={refreshing}
          loadEvents={loadEvents}
          loadCheckpoints={moreCheckpoints}
          inspect={inspectCheckpoint}
        />
      </div>
      {exploring && (
        <CheckpointExplorer
          key={sessionID}
          id={exploring}
          initialMode={explorerMode}
          checkpoints={checkpoints}
          onCheckpoint={setExploring}
          onBack={() => {
            const id = exploring;
            setExploring('');
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLButtonElement>(
                  '[aria-label="Inspect checkpoint ' + id.slice(0, 8) + '"]',
                )
                ?.focus({ preventScroll: true }),
            );
          }}
          onRestore={setForkID}
          canRestore={!!health?.csrf_token}
          more={checkpointCursor !== null}
          loadMore={moreCheckpoints}
        />
      )}
    </div>
  );
}
