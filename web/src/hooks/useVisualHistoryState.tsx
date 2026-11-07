import { useEffect, useMemo, useRef, useState } from 'react';
import { checkpointName, failed } from '../data/VisualHistory';
import { eventDensity, eventGroupKey } from '../history-presentation';
import { changedPaths, eventTitle } from '../state';
import type { Checkpoint, RecordedEvent } from '../types';
import { chronological } from '../utils/chronological';

export function useVisualHistoryState({
  model: viewModel,
}: {
  model: { events: RecordedEvent[]; checkpoints: Checkpoint[] };
}) {
  const { events, checkpoints } = viewModel;
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(80);
  const [operations, setOperations] = useState(false);
  const [windowStart, setWindowStart] = useState(0);
  const [jump, setJump] = useState<{ id: string; bin: number } | null>(null);
  const [compact, setCompact] = useState(false);
  const scroll = useRef<HTMLElement>(null);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chronological(events, checkpoints).filter((row) => {
      if ((filter === 'events' && !row.event) || (filter === 'checkpoints' && !row.cp))
        return false;
      if (
        (status === 'partial' && !row.cp?.partial) ||
        (status === 'failures' && (!row.event || !failed(row.event)))
      )
        return false;
      const text = row.cp
        ? checkpointName(row.cp) + ' ' + row.cp.id
        : eventTitle(row.event!) + ' ' + row.event!.kind + ' ' + changedPaths(row.event!).join(' ');
      return !needle || text.toLowerCase().includes(needle);
    });
  }, [events, checkpoints, filter, query, status]);
  const density = useMemo(() => eventDensity(events), [events]);
  const visible = useMemo(() => {
    const result: { rows: typeof rows; group: string }[] = [];
    for (const row of rows.slice(windowStart, windowStart + limit)) {
      const key = row.event ? eventGroupKey(row.event) : '';
      const previous = result.at(-1);
      if (key && previous?.group === key && row.event?.kind !== 'item.started')
        previous.rows.push(row);
      else result.push({ rows: [row], group: key });
    }
    return result;
  }, [rows, windowStart, limit]);
  useEffect(() => {
    if (!jump) return;
    const frame = requestAnimationFrame(() => {
      const node = scroll.current?.querySelector<HTMLElement>(
        '[data-event-id="' + CSS.escape(jump.id) + '"]',
      );
      const group = node?.closest<HTMLDetailsElement>('.history-event-group');
      if (group) group.open = true;
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [jump, windowStart, filter, status, query, operations]);
  return {
    filter,
    setFilter,
    query,
    setQuery,
    status,
    setStatus,
    limit,
    setLimit,
    operations,
    setOperations,
    windowStart,
    setWindowStart,
    jump,
    setJump,
    compact,
    setCompact,
    scroll,
    rows,
    density,
    visible,
  };
}
