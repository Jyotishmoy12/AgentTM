import { rowHeight } from '../../data/HistoryRail';
import type { Item } from '../../types/HistoryRail';
import { Row } from '../molecules/Row';

export function HistoryRailTimelineList({
  model: viewModel,
}: {
  model: {
    list: import('react').RefObject<HTMLDivElement | null>;
    setScroll: import('react').Dispatch<import('react').SetStateAction<number>>;
    positions: import('react').RefObject<{
      events: number;
      checkpoints: number;
    }>;
    mode: 'events' | 'checkpoints';
    items: Item[];
    selected: string;
    pendingFocus: import('react').RefObject<number | null>;
    select: (id: string) => void;
    height: number;
    loading: boolean;
    query: string;
    start: number;
    end: number;
  };
}) {
  const {
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
  } = viewModel;
  return (
    <div
      className="timeline-list virtual-history"
      ref={list}
      role="list"
      aria-label="Events in receipt order"
      onScroll={(event) => {
        setScroll(event.currentTarget.scrollTop);
        positions.current[mode] = event.currentTarget.scrollTop;
      }}
      onKeyDown={(event) => {
        if (!(event.target instanceof HTMLElement) || !event.target.closest('[data-history-index]'))
          return;
        const current = items.findIndex((item) => item.id === selected);
        let index: number;
        if (event.key === 'ArrowDown') index = Math.min(items.length - 1, current + 1);
        else if (event.key === 'ArrowUp') index = Math.max(0, current - 1);
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = items.length - 1;
        else return;
        event.preventDefault();
        const item = items[index];
        if (!item) return;
        pendingFocus.current = index;
        const mounted = list.current?.querySelector<HTMLButtonElement>(
          '[data-history-index="' + index + '"]',
        );
        if (mounted) {
          mounted.focus({ preventScroll: true });
          pendingFocus.current = null;
        }
        select(item.id);
        if (list.current) {
          const top = index * rowHeight;
          if (top < list.current.scrollTop) list.current.scrollTop = top;
          else if (top + rowHeight > list.current.scrollTop + height)
            list.current.scrollTop = top + rowHeight - height;
          setScroll(list.current.scrollTop);
          positions.current[mode] = list.current.scrollTop;
        }
      }}
    >
      {loading && !items.length ? (
        <p className="loading-inline">Loading history…</p>
      ) : !items.length ? (
        <p className="panel-padding muted">
          {query ? 'No history matches this filter.' : 'No recorded items available.'}
        </p>
      ) : (
        <>
          <div role="presentation" style={{ height: start * rowHeight }} />
          {items.slice(start, end).map((item, index) => (
            <Row
              key={item.id}
              item={item}
              index={start + index}
              selected={item.id === selected}
              select={select}
            />
          ))}
          <div role="presentation" style={{ height: (items.length - end) * rowHeight }} />
        </>
      )}
    </div>
  );
}
