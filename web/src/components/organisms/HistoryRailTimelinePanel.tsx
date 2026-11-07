import type { RecordedEvent } from '../../types';
import type { Item } from '../../types/HistoryRail';
import { HistoryRailTimelineFilters } from './HistoryRailTimelineFilters';
import { HistoryRailTimelineList } from './HistoryRailTimelineList';

export function HistoryRailTimelinePanel({
  model: viewModel,
}: {
  model: {
    mode: 'events' | 'checkpoints';
    items: Item[];
    onMode: (mode: 'events' | 'checkpoints') => void;
    query: string;
    setQuery: import('react').Dispatch<import('react').SetStateAction<string>>;
    reset: () => void;
    kind: string;
    setKind: import('react').Dispatch<import('react').SetStateAction<string>>;
    events: RecordedEvent[];
    tool: string;
    setTool: import('react').Dispatch<import('react').SetStateAction<string>>;
    list: import('react').RefObject<HTMLDivElement | null>;
    setScroll: import('react').Dispatch<import('react').SetStateAction<number>>;
    positions: import('react').RefObject<{
      events: number;
      checkpoints: number;
    }>;
    selected: string;
    pendingFocus: import('react').RefObject<number | null>;
    select: (id: string) => void;
    height: number;
    loading: boolean;
    start: number;
    end: number;
    moreEvents: boolean;
    moreCheckpoints: boolean;
    loadEvents: () => void;
    loadCheckpoints: () => void;
    busy: boolean;
  };
}) {
  const {
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
  } = viewModel;
  return (
    <aside className="timeline-panel history-rail" aria-label="History navigation">
      <div className="panel-heading">
        <h2>{mode === 'events' ? 'Timeline' : 'Checkpoints'}</h2>
        <span className="count">{items.length}</span>
      </div>
      <div
        className="history-type"
        role="tablist"
        aria-label="History type"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const next = mode === 'events' ? 'checkpoints' : 'events';
          onMode(next);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('button')
            [next === 'events' ? 0 : 1].focus();
        }}
      >
        <button
          role="tab"
          aria-selected={mode === 'events'}
          tabIndex={mode === 'events' ? 0 : -1}
          onClick={() => onMode('events')}
        >
          Timeline
        </button>
        <button
          role="tab"
          aria-selected={mode === 'checkpoints'}
          tabIndex={mode === 'checkpoints' ? 0 : -1}
          onClick={() => onMode('checkpoints')}
        >
          Checkpoints
        </button>
      </div>
      <HistoryRailTimelineFilters
        model={{ mode, query, setQuery, reset, kind, setKind, events, tool, setTool }}
      />
      <HistoryRailTimelineList
        model={{
          list,
          setScroll,
          positions,
          mode,
          items,
          selected,
          pendingFocus,
          select,
          height,
          loading,
          query,
          start,
          end,
        }}
      />
      <div className="history-load">
        {(mode === 'events' ? moreEvents : moreCheckpoints) && (
          <button onClick={mode === 'events' ? loadEvents : loadCheckpoints} disabled={busy}>
            {busy ? 'Loading…' : 'Load more ' + mode}
          </button>
        )}
      </div>
      <div className="timeline-footer">
        {mode === 'events'
          ? 'Receipt order · workspace observations'
          : 'Captured states · not atomic snapshots'}
        <span>↑ ↓ to select</span>
      </div>
    </aside>
  );
}
