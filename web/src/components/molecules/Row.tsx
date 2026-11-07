import { memo } from 'react';
import { rowHeight } from '../../data/HistoryRail';
import type { Item } from '../../types/HistoryRail';

export const Row = memo(function Row({
  item,
  selected,
  index,
  select,
}: {
  item: Item;
  selected: boolean;
  index: number;
  select: (id: string) => void;
}) {
  return (
    <div role="listitem" className="history-row" style={{ height: rowHeight }}>
      <button
        data-history-index={index}
        className={'event-card ' + (selected ? 'selected' : '')}
        aria-pressed={selected}
        tabIndex={selected || index === 0 ? 0 : -1}
        onClick={() => select(item.id)}
      >
        <span
          className={'history-node ' + (item.checkpoint ? 'has-checkpoint' : '')}
          aria-hidden="true"
        />
        <span className="event-content">
          <span className="event-topline">
            <span className="event-kind">{item.kind}</span>
            <span className={'history-status ' + item.status.toLowerCase()}>{item.status}</span>
          </span>
          <span className="event-title" title={item.title}>
            {item.title}
          </span>
          <span className="event-bottom">
            <time dateTime={item.time}>
              {new Date(item.time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </time>
            <span>
              {item.checkpoint
                ? item.checkpoint.slice(0, 8)
                : item.sequence
                  ? '#' + item.sequence
                  : '—'}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
});
