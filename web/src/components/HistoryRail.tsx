import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { eventTitle, filterEvents, record } from "../state";
import type { Checkpoint, RecordedEvent } from "../types";

type Item = {
  id: string;
  title: string;
  kind: string;
  time: string;
  status: string;
  checkpoint: string;
  sequence?: number;
};
const rowHeight = 84;
const Row = memo(function Row({
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
        className={"event-card " + (selected ? "selected" : "")}
        aria-pressed={selected}
        tabIndex={selected || index === 0 ? 0 : -1}
        onClick={() => select(item.id)}
      >
        <span
          className={
            "history-node " + (item.checkpoint ? "has-checkpoint" : "")
          }
          aria-hidden="true"
        />
        <span className="event-content">
          <span className="event-topline">
            <span className="event-kind">{item.kind}</span>
            <span className={"history-status " + item.status.toLowerCase()}>
              {item.status}
            </span>
          </span>
          <span className="event-title" title={item.title}>
            {item.title}
          </span>
          <span className="event-bottom">
            <time dateTime={item.time}>
              {new Date(item.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
            <span>
              {item.checkpoint
                ? item.checkpoint.slice(0, 8)
                : item.sequence
                  ? "#" + item.sequence
                  : "—"}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
});

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
  mode: "events" | "checkpoints";
  onMode: (mode: "events" | "checkpoints") => void;
  onEvent: (id: string) => void;
  onCheckpoint: (id: string) => void;
  loading: boolean;
  moreEvents: boolean;
  moreCheckpoints: boolean;
  busy: boolean;
  loadEvents: () => void;
  loadCheckpoints: () => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [tool, setTool] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(450);
  const positions = useRef({ events: 0, checkpoints: 0 });
  const pendingFocus = useRef<number | null>(null);
  const previousSelection = useRef("");
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
      mode === "events"
        ? filterEvents(events, query, kind, tool).map((event) => {
            const checkpoint = checkpointIndex.get(event.checkpoint_id || "");
            const payload = record(event.payload);
            const item = record(payload.item);
            return {
              id: event.id,
              title: eventTitle(event),
              kind: event.kind
                .replace("agenttm.", "")
                .replaceAll(".", " / ")
                .replaceAll("_", " "),
              time: event.received_at,
              checkpoint: event.checkpoint_id || "",
              sequence: event.sequence,
              status: checkpoint?.partial
                ? "Partial"
                : event.kind.includes("failed") ||
                    event.kind === "error" ||
                    item.status === "failed"
                  ? "Failed"
                  : payload.error
                    ? "Warning"
                    : "Recorded",
            };
          })
        : checkpoints
            .filter((cp) =>
              [cp.kind, cp.id].some((value) =>
                value.toLowerCase().includes(query.toLowerCase()),
              ),
            )
            .map((cp) => ({
              id: cp.id,
              title: cp.kind.replaceAll("_", " ") + " workspace",
              kind: "CHECKPOINT · " + cp.id.slice(0, 8),
              time: cp.created_at,
              checkpoint: cp.id,
              status: cp.partial
                ? "Partial"
                : cp.potentially_inconsistent
                  ? "Observed"
                  : "Captured",
            })),
    [events, checkpoints, checkpointIndex, mode, query, kind, tool],
  );
  const selected = mode === "events" ? selectedEvent : selectedCheckpoint;
  const select = mode === "events" ? onEvent : onCheckpoint;
  const virtual = items.length > 150;
  const start = virtual ? Math.max(0, Math.floor(scroll / rowHeight) - 5) : 0;
  const end = virtual
    ? Math.min(items.length, Math.ceil((scroll + height) / rowHeight) + 5)
    : items.length;
  useLayoutEffect(() => {
    const key = mode + ":" + selected;
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
    <aside
      className="timeline-panel history-rail"
      aria-label="History navigation"
    >
      <div className="panel-heading">
        <h2>{mode === "events" ? "Timeline" : "Checkpoints"}</h2>
        <span className="count">{items.length}</span>
      </div>
      <div
        className="history-type"
        role="tablist"
        aria-label="History type"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = mode === "events" ? "checkpoints" : "events";
          onMode(next);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>("button")
            [next === "events" ? 0 : 1].focus();
        }}
      >
        <button
          role="tab"
          aria-selected={mode === "events"}
          tabIndex={mode === "events" ? 0 : -1}
          onClick={() => onMode("events")}
        >
          Timeline
        </button>
        <button
          role="tab"
          aria-selected={mode === "checkpoints"}
          tabIndex={mode === "checkpoints" ? 0 : -1}
          onClick={() => onMode("checkpoints")}
        >
          Checkpoints
        </button>
      </div>
      <div className="timeline-filters">
        <input
          aria-label="Search event kinds, tools or file paths"
          placeholder={
            mode === "events"
              ? "Search activity or files…"
              : "Find a checkpoint…"
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            reset();
          }}
        />
        {mode === "events" && (
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
              {[
                ...new Set(
                  events.map((event) => event.tool_name).filter(Boolean),
                ),
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        )}
      </div>
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
          if (
            !(event.target instanceof HTMLElement) ||
            !event.target.closest("[data-history-index]")
          )
            return;
          const current = items.findIndex((item) => item.id === selected);
          let index: number;
          if (event.key === "ArrowDown")
            index = Math.min(items.length - 1, current + 1);
          else if (event.key === "ArrowUp") index = Math.max(0, current - 1);
          else if (event.key === "Home") index = 0;
          else if (event.key === "End") index = items.length - 1;
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
            {query
              ? "No history matches this filter."
              : "No recorded items available."}
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
            <div
              role="presentation"
              style={{ height: (items.length - end) * rowHeight }}
            />
          </>
        )}
      </div>
      <div className="history-load">
        {(mode === "events" ? moreEvents : moreCheckpoints) && (
          <button
            onClick={mode === "events" ? loadEvents : loadCheckpoints}
            disabled={busy}
          >
            {busy ? "Loading…" : "Load more " + mode}
          </button>
        )}
      </div>
      <div className="timeline-footer">
        {mode === "events"
          ? "Receipt order · workspace observations"
          : "Captured states · not atomic snapshots"}
        <span>↑ ↓ to select</span>
      </div>
    </aside>
  );
});
