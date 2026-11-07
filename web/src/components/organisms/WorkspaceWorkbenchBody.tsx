import type { Checkpoint, RecordedEvent } from '../../types';
import { ContextPanel } from './ContextPanel';
import { HistoricalInspector } from './HistoricalInspector';
import { HistoryRail } from './HistoryRail';
import { Operations } from './Operations';
import { WorkspaceDivider } from './WorkspaceDivider';

export function WorkspaceWorkbenchBody({
  model: viewModel,
}: {
  model: {
    events: RecordedEvent[];
    checkpoints: Checkpoint[];
    selectedID: string;
    id: string;
    railMode: 'events' | 'checkpoints';
    setRailMode: import('react').Dispatch<import('react').SetStateAction<'events' | 'checkpoints'>>;
    selectEvent: (id: string) => void;
    selectCheckpoint: (id: string) => void;
    loading: boolean;
    eventMore: boolean;
    checkpointMore: boolean;
    loadingMore: boolean;
    loadEvents: () => void;
    loadCheckpoints: () => void;
    mode: 'file' | 'diff' | 'operations';
    setView: (next: 'file' | 'diff' | 'operations') => void;
    split: boolean;
    setSplit: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    receive: (checkpoint: Checkpoint) => void;
    fail: (id: string, text: string) => void;
    sessionID: string;
    showDetails: boolean;
    focus: boolean;
    selected: RecordedEvent | undefined;
    checkpoint: Checkpoint | undefined;
    near: { id: string; exact: boolean } | null;
    overrideCP: string;
    metadataError: { id: string; text: string } | undefined;
    canRestore: boolean;
    onRestore: (id: string) => void;
    closeDetails: () => void;
  };
}) {
  const {
    events,
    checkpoints,
    selectedID,
    id,
    railMode,
    setRailMode,
    selectEvent,
    selectCheckpoint,
    loading,
    eventMore,
    checkpointMore,
    loadingMore,
    loadEvents,
    loadCheckpoints,
    mode,
    setView,
    split,
    setSplit,
    receive,
    fail,
    sessionID,
    showDetails,
    focus,
    selected,
    checkpoint,
    near,
    overrideCP,
    metadataError,
    canRestore,
    onRestore,
    closeDetails,
  } = viewModel;
  return (
    <div className="workbench-body">
      <HistoryRail
        events={events}
        checkpoints={checkpoints}
        selectedEvent={selectedID}
        selectedCheckpoint={id}
        mode={railMode}
        onMode={setRailMode}
        onEvent={selectEvent}
        onCheckpoint={selectCheckpoint}
        loading={loading}
        moreEvents={eventMore}
        moreCheckpoints={checkpointMore}
        busy={loadingMore}
        loadEvents={loadEvents}
        loadCheckpoints={loadCheckpoints}
      />
      <WorkspaceDivider side="history" />
      <div className="workbench-inspection">
        <div className="inspection-toolbar">
          <div role="tablist" aria-label="Inspection mode">
            {(['file', 'diff', 'operations'] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={mode === value}
                onClick={() => setView(value)}
                onKeyDown={(event) => {
                  const values = ['file', 'diff', 'operations'] as const;
                  const index = values.indexOf(value);
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const next = (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                    setView(values[next]);
                    event.currentTarget.parentElement
                      ?.querySelectorAll<HTMLButtonElement>('button')
                      [next].focus();
                  }
                }}
                tabIndex={mode === value ? 0 : -1}
              >
                {value === 'file' ? 'Files' : value === 'diff' ? 'Changes' : 'Operations'}
              </button>
            ))}
          </div>
          {mode === 'diff' && (
            <div className="diff-mode-switch" role="group" aria-label="Diff layout">
              <button aria-pressed={!split} onClick={() => setSplit(false)}>
                Inline
              </button>
              <button aria-pressed={split} onClick={() => setSplit(true)}>
                Split
              </button>
            </div>
          )}
        </div>
        <div className="inspector-host" hidden={mode === 'operations'}>
          <HistoricalInspector
            id={id}
            mode={mode === 'diff' ? 'diff' : 'file'}
            split={split}
            onCheckpoint={receive}
            onError={fail}
          />
        </div>
        {mode === 'operations' && <Operations session={sessionID} inspect={selectCheckpoint} />}
      </div>
      <WorkspaceDivider side="details" />
      <div className="workbench-context" aria-hidden={!showDetails || focus}>
        <ContextPanel
          event={selected}
          checkpoint={checkpoint}
          checkpointID={id}
          exact={!!near?.exact}
          manual={!!overrideCP}
          error={metadataError?.id === id ? metadataError.text : ''}
          canRestore={canRestore}
          onRestore={() => onRestore(id)}
          onClose={closeDetails}
        />
      </div>
    </div>
  );
}
