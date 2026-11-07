import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { rowHeight } from '../../data/HistoryRail';
import { eventTitle, filterEvents, record } from '../../state';
import type { Checkpoint, RecordedEvent } from '../../types';
import type { Item } from '../../types/HistoryRail';
import { HistoryRailTimelinePanel } from './HistoryRailTimelinePanel';

export const HistoryRail = memo(function HistoryRail({
  events,
  checkpoints,
  selectedEvent,
  selectedCheckpoint,
  mode,
  onMode,
  onEvent,
  onCheckpoint,
  loading,
  moreEvents,
  moreCheckpoints,
  busy,
  loadEvents,
  loadCheckpoints,
}: {
  events: RecordedEvent[];
  checkpoints: Checkpoint[];
  selectedEvent: string;
  selectedCheckpoint: string;
  mode: 'events' | 'checkpoints';
  onMode: (mode: 'events' | 'checkpoints') => void;
  onEvent: (id: string) => void;
  onCheckpoint: (id: string) => void;
  loading: boolean;
  moreEvents: boolean;
  moreCheckpoints: boolean;
  busy: boolean;
  loadEvents: () => void;
  loadCheckpoints: () => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [tool, setTool] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(450);
  const positions = useRef({ events: 0, checkpoints: 0 });
  const pendingFocus = useRef<number | null>(null);
  const previousSelection = useRef('');
  useEffect(() => {
    if (!list.current) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (next) setHeight(next);
    });
    observer.observe(list.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (list.current) {
      list.current.scrollTop = positions.current[mode];
      setScroll(positions.current[mode]);
    }
  }, [mode]);
  const checkpointIndex = useMemo(
    () => new Map(checkpoints.map((cp) => [cp.id, cp])),
    [checkpoints],
  );
  const items = useMemo<Item[]>(
    () =>
      mode === 'events'
        ? filterEvents(events, query, kind, tool).map((event) => {
            const checkpoint = checkpointIndex.get(event.checkpoint_id || '');
            const payload = record(event.payload);
            const item = record(payload.item);
            return {
              id: event.id,
              title: eventTitle(event),
              kind: event.kind.replace('agenttm.', '').replaceAll('.', ' / ').replaceAll('_', ' '),
              time: event.received_at,
              checkpoint: event.checkpoint_id || '',
              sequence: event.sequence,
              status: checkpoint?.partial
                ? 'Partial'
                : event.kind.includes('failed') ||
                    event.kind === 'error' ||
                    item.status === 'failed'
                  ? 'Failed'
                  : payload.error
                    ? 'Warning'
                    : 'Recorded',
            };
          })
        : checkpoints
            .filter((cp) =>
              [cp.kind, cp.id].some((value) => value.toLowerCase().includes(query.toLowerCase())),
            )
            .map((cp) => ({
              id: cp.id,
              title: cp.kind.replaceAll('_', ' ') + ' workspace',
              kind: 'CHECKPOINT · ' + cp.id.slice(0, 8),
              time: cp.created_at,
              checkpoint: cp.id,
              status: cp.partial
                ? 'Partial'
                : cp.potentially_inconsistent
                  ? 'Observed'
                  : 'Captured',
            })),
    [events, checkpoints, checkpointIndex, mode, query, kind, tool],
  );
  const selected = mode === 'events' ? selectedEvent : selectedCheckpoint;
  const select = mode === 'events' ? onEvent : onCheckpoint;
  const virtual = items.length > 150;
  const start = virtual ? Math.max(0, Math.floor(scroll / rowHeight) - 5) : 0;
  const end = virtual
    ? Math.min(items.length, Math.ceil((scroll + height) / rowHeight) + 5)
    : items.length;
  useLayoutEffect(() => {
    const key = mode + ':' + selected;
    if (previousSelection.current === key || !list.current) return;
    previousSelection.current = key;
    const index = items.findIndex((item) => item.id === selected);
    if (index < 0) return;
    const top = index * rowHeight;
    if (top < list.current.scrollTop) list.current.scrollTop = top;
    else if (top + rowHeight > list.current.scrollTop + height)
      list.current.scrollTop = top + rowHeight - height;
    setScroll(list.current.scrollTop);
    positions.current[mode] = list.current.scrollTop;
  }, [selected, mode, items, height]);
  useLayoutEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    const target = list.current?.querySelector<HTMLButtonElement>(
      '[data-history-index="' + index + '"]',
    );
    if (target) {
      target.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [start, end, selected]);
  const reset = () => {
    if (list.current) list.current.scrollTop = 0;
    setScroll(0);
    positions.current[mode] = 0;
  };
  return (
    <HistoryRailTimelinePanel
      model={{
        mode,
        items,
        onMode,
        query,
        setQuery,
        reset,
        kind,
        setKind,
        events,
        tool,
        setTool,
        list,
        setScroll,
        positions,
        selected,
        pendingFocus,
        select,
        height,
        loading,
        start,
        end,
        moreEvents,
        moreCheckpoints,
        loadEvents,
        loadCheckpoints,
        busy,
      }}
    />
  );
});
