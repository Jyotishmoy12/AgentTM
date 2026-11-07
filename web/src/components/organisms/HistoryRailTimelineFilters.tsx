import type { RecordedEvent } from '../../types';

export function HistoryRailTimelineFilters({
  model: viewModel,
}: {
  model: {
    mode: 'events' | 'checkpoints';
    query: string;
    setQuery: import('react').Dispatch<import('react').SetStateAction<string>>;
    reset: () => void;
    kind: string;
    setKind: import('react').Dispatch<import('react').SetStateAction<string>>;
    events: RecordedEvent[];
    tool: string;
    setTool: import('react').Dispatch<import('react').SetStateAction<string>>;
  };
}) {
  const { mode, query, setQuery, reset, kind, setKind, events, tool, setTool } = viewModel;
  return (
    <div className="timeline-filters">
      <input
        aria-label="Search event kinds, tools or file paths"
        placeholder={mode === 'events' ? 'Search activity or files…' : 'Find a checkpoint…'}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          reset();
        }}
      />
      {mode === 'events' && (
        <div className="filter-row">
          <select
            aria-label="Filter by event kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              reset();
            }}
          >
            <option value="">All events</option>
            {[...new Set(events.map((event) => event.kind))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Filter by tool"
            value={tool}
            onChange={(event) => {
              setTool(event.target.value);
              reset();
            }}
          >
            <option value="">All tools</option>
            {[...new Set(events.map((event) => event.tool_name).filter(Boolean))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
