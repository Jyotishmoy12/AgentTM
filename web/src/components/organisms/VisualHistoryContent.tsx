import type { Checkpoint, RecordedEvent } from '../../types';
import { NavIcon } from '../atoms/NavIcon';
import { VisualHistoryChronology } from './VisualHistoryChronology';

export function VisualHistoryContent({
  model: viewModel,
}: {
  model: {
    query: string;
    setQuery: import('react').Dispatch<import('react').SetStateAction<string>>;
    setLimit: import('react').Dispatch<import('react').SetStateAction<number>>;
    setWindowStart: import('react').Dispatch<import('react').SetStateAction<number>>;
    setJump: import('react').Dispatch<
      import('react').SetStateAction<{
        id: string;
        bin: number;
      } | null>
    >;
    status: string;
    setStatus: import('react').Dispatch<import('react').SetStateAction<string>>;
    windowStart: number;
    jump: { id: string; bin: number } | null;
    loading: boolean;
    rows: (
      | { key: string; at: string; event: RecordedEvent; cp: Checkpoint | undefined }
      | { key: string; at: string; event: RecordedEvent | undefined; cp: Checkpoint }
    )[];
    events: RecordedEvent[];
    checkpoints: Checkpoint[];
    visible: {
      rows: (
        | { key: string; at: string; event: RecordedEvent; cp: Checkpoint | undefined }
        | { key: string; at: string; event: RecordedEvent | undefined; cp: Checkpoint }
      )[];
      group: string;
    }[];
    inspect: (id: string, mode?: 'file' | 'diff') => void;
    limit: number;
  };
}) {
  const {
    query,
    setQuery,
    setLimit,
    setWindowStart,
    setJump,
    status,
    setStatus,
    windowStart,
    jump,
    loading,
    rows,
    events,
    checkpoints,
    visible,
    inspect,
    limit,
  } = viewModel;
  return (
    <>
      <div className="history-search">
        <NavIcon name="search" />
        <input
          aria-label="Search history"
          placeholder="Find an event, command, or file…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(80);
            setWindowStart(0);
            setJump(null);
          }}
        />
        <select
          aria-label="Filter history status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setLimit(80);
            setWindowStart(0);
            setJump(null);
          }}
        >
          <option value="all">All statuses</option>
          <option value="partial">Partial captures</option>
          <option value="failures">Failures & cancellations</option>
        </select>
      </div>
      {windowStart > 0 && (
        <button
          className="history-load"
          onClick={() => {
            setWindowStart((value) => Math.max(0, value - 80));
            setJump(null);
          }}
        >
          Show earlier observations
        </button>
      )}
      {jump && (
        <p className="activity-jump-note" role="status">
          Showing the recorded activity selected above. Timeline filters were reset to Everything.
        </p>
      )}
      {loading && !rows.length ? (
        <p role="status" className="history-empty">
          Loading recorded history…
        </p>
      ) : !rows.length ? (
        <div className="history-empty">
          <h2>
            {events.length || checkpoints.length
              ? 'No matching observations'
              : 'No observations recorded yet'}
          </h2>
          <p>
            {events.length || checkpoints.length
              ? 'Try a different filter or search.'
              : 'Received events and captured workspace states will appear here.'}
          </p>
        </div>
      ) : (
        <VisualHistoryChronology model={{ visible, checkpoints, inspect }} />
      )}
      {rows.length > windowStart + limit && (
        <button className="history-load" onClick={() => setLimit((value) => value + 80)}>
          Show next observations ({rows.length - windowStart - limit} remaining)
        </button>
      )}
    </>
  );
}
