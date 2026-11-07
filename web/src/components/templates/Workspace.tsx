import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkpointNear } from '../../state';
import type { Checkpoint } from '../../types';
import type { WorkspaceProps } from '../../types/WorkspaceProps';
import { WorkspaceWorkbenchBody } from '../organisms/WorkspaceWorkbenchBody';
import { WorkspaceWorkbenchToolbar } from '../organisms/WorkspaceWorkbenchToolbar';

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
}: WorkspaceProps) {
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
      <WorkspaceWorkbenchToolbar
        model={{
          railOpen,
          setRailOpen,
          id,
          onCheckpoint,
          checkpoints,
          checkpointMore,
          loadCheckpoints,
          focus,
          setFocus,
          detailsToggle,
          showDetails,
          narrow,
          setDrawer,
          setDetailsOpen,
          canRestore,
          onRestore,
        }}
      />
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
      <WorkspaceWorkbenchBody
        model={{
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
        }}
      />
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
