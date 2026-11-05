import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkpointNear } from '../state';
import type { Checkpoint, RecordedEvent } from '../types';
import { HistoryRail } from './HistoryRail';
import { HistoricalInspector } from './HistoricalInspector';
import { ContextPanel } from './ContextPanel';
import { WorkspaceDivider } from './WorkspaceDivider';
import { Operations } from './Operations';

function PanelIcon({ type }: { type: 'history' | 'details' | 'focus' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'history' ? (
        <>
          <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />
        </>
      ) : type === 'details' ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M15 4v16M18 8h.01M18 12h.01" />
        </>
      ) : (
        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
      )}
    </svg>
  );
}

export function Workspace({
  sessionID,
  events,
  checkpoints,
  loading,
  selectedID,
  overrideCP,
  onSelect,
  onCheckpoint,
  canRestore,
  onRestore,
  checkpointMore,
  eventMore,
  loadingMore,
  loadEvents,
  loadCheckpoints,
  initialCheckpoints,
}: {
  sessionID: string;
  events: RecordedEvent[];
  checkpoints: Checkpoint[];
  loading: boolean;
  selectedID: string;
  overrideCP: string;
  onSelect: (id: string) => void;
  onCheckpoint: (id: string) => void;
  canRestore: boolean;
  onRestore: (id: string) => void;
  checkpointMore: boolean;
  eventMore: boolean;
  loadingMore: boolean;
  loadEvents: () => void;
  loadCheckpoints: () => void;
  initialCheckpoints: boolean;
}) {
  const [railMode, setRailMode] = useState<'events' | 'checkpoints'>(
    initialCheckpoints ? 'checkpoints' : 'events',
  );
  const [mode, setMode] = useState<'file' | 'diff' | 'operations'>('file');
  const [split, setSplit] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [focus, setFocus] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width:1050px)').matches);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width:650px)').matches);
  const [cp, setCP] = useState<Checkpoint>();
  const [metadataError, setMetadataError] = useState<{
    id: string;
    text: string;
  }>();
  const detailsToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia('(max-width:1050px)');
    const phone = matchMedia('(max-width:650px)');
    const update = () => {
      setNarrow(media.matches);
      setMobile(phone.matches);
    };
    media.addEventListener('change', update);
    phone.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      phone.removeEventListener('change', update);
    };
  }, []);
  const near = useMemo(() => checkpointNear(events, selectedID), [events, selectedID]);
  const id = overrideCP || near?.id || '';
  const selected = events.find((event) => event.id === selectedID);
  const checkpoint = cp?.id === id ? cp : undefined;
  const receive = useCallback((checkpoint: Checkpoint) => {
    setCP(checkpoint);
    setMetadataError(undefined);
  }, []);
  const fail = useCallback((id: string, text: string) => setMetadataError({ id, text }), []);
  const selectEvent = useCallback(
    (id: string) => {
      onSelect(id);
      if (mobile) setRailOpen(false);
    },
    [onSelect, mobile],
  );
  const selectCheckpoint = useCallback(
    (id: string) => {
      onCheckpoint(id);
      setMode('file');
      if (mobile) setRailOpen(false);
    },
    [onCheckpoint, mobile],
  );
  const showDetails = narrow ? drawer : detailsOpen;
  const closeDetails = () => {
    if (narrow) setDrawer(false);
    else setDetailsOpen(false);
    detailsToggle.current?.focus();
  };
  const index = events.findIndex((event) => event.id === selectedID);
  const setView = (next: 'file' | 'diff' | 'operations') => setMode(next);
  return (
    <section
      className={
        'history-workbench ' +
        (!railOpen ? 'history-hidden ' : '') +
        (!showDetails ? 'details-hidden ' : '') +
        (narrow ? 'compact-workbench ' : '') +
        (focus ? 'inspection-focused ' : '') +
        (mobile && railOpen ? 'mobile-history-open' : '')
      }
      aria-label="Recorded workspace"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && drawer) {
          event.stopPropagation();
          closeDetails();
        }
      }}
    >
      <div className="workbench-toolbar">
        <div className="workbench-left-actions">
          <button
            aria-label={railOpen ? 'Hide history panel' : 'Show history panel'}
            aria-expanded={railOpen}
            onClick={() => setRailOpen((value) => !value)}
          >
            <PanelIcon type="history" /> <span>History</span>
          </button>
          <select
            aria-label="Select checkpoint"
            value={id}
            onChange={(event) => onCheckpoint(event.target.value)}
          >
            <option value="" disabled>
              No known checkpoint
            </option>
            {id && !checkpoints.some((cp) => cp.id === id) && (
              <option value={id}>{id.slice(0, 8)}</option>
            )}
            {checkpoints.map((checkpoint) => (
              <option key={checkpoint.id} value={checkpoint.id}>
                {checkpoint.kind} · {checkpoint.id.slice(0, 8)}
                {checkpoint.partial ? ' · partial' : ''}
              </option>
            ))}
          </select>
          {checkpointMore && <button onClick={loadCheckpoints}>More</button>}
        </div>
        <div className="workbench-right-actions">
          <button
            aria-label={focus ? 'Exit full-width inspection' : 'Full-width inspection'}
            aria-pressed={focus}
            onClick={() => setFocus((value) => !value)}
          >
            <PanelIcon type="focus" /> <span>{focus ? 'Exit focus' : 'Focus'}</span>
          </button>
          <button
            ref={detailsToggle}
            aria-label={showDetails ? 'Hide details panel' : 'Show details panel'}
            aria-expanded={showDetails}
            onClick={() =>
              narrow ? setDrawer((value) => !value) : setDetailsOpen((value) => !value)
            }
          >
            <PanelIcon type="details" /> <span>Details</span>
          </button>
          <button
            className="primary-button"
            disabled={!id || !canRestore}
            onClick={() => onRestore(id)}
          >
            Restore checkpoint
          </button>
        </div>
      </div>
      <div className={'state-note ' + (!overrideCP && near && !near.exact ? 'last-known' : '')}>
        {overrideCP
          ? 'Manually selected checkpoint'
          : near
            ? near.exact
              ? 'Checkpoint linked to this observation'
              : 'Last known workspace · this event has no checkpoint'
            : 'No checkpoint observed at or before this event'}
        <span>READ-ONLY HISTORY</span>
      </div>
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
      <div className="workbench-status">
        <span>
          {railMode === 'events'
            ? events.length + ' loaded events'
            : checkpoints.length + ' loaded checkpoints'}{' '}
          · receipt-order observations
        </span>
        <div>
          <button disabled={index <= 0} onClick={() => onSelect(events[index - 1].id)}>
            ← Previous event
          </button>
          <button
            disabled={index < 0 || index >= events.length - 1}
            onClick={() => onSelect(events[index + 1].id)}
          >
            Next event →
          </button>
        </div>
      </div>
    </section>
  );
}
