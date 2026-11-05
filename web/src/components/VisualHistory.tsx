import { useEffect, useMemo, useRef, useState } from 'react';
import { changedPaths, eventTitle, record } from '../state';
import type { Checkpoint, RecordedEvent, Session } from '../types';
import { NavIcon } from './NavigationPages';
import { Operations } from './Operations';
import {
  activityKind,
  eventDensity,
  eventFailed,
  eventGroupKey,
  historyDate,
  historyTime,
  plural,
} from '../history-presentation';

export const checkpointName = (cp: Checkpoint) => {
  const names: Record<string, string> = {
    baseline: 'Starting workspace',
    final: 'Final workspace',
    manual: 'Manual capture',
    operation_before: 'Before operation',
    operation_after: 'After operation',
    observed: 'Observed workspace',
  };
  return (
    names[cp.kind] || cp.kind.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase())
  );
};
const time = historyTime;
const failed = eventFailed;
function chronological(events: RecordedEvent[], checkpoints: Checkpoint[]) {
  return [
    ...events.map((event) => ({
      key: 'e' + event.id,
      at: event.received_at,
      event,
      cp: undefined as Checkpoint | undefined,
    })),
    ...checkpoints.map((cp) => ({
      key: 'c' + cp.id,
      at: cp.created_at,
      event: undefined as RecordedEvent | undefined,
      cp,
    })),
  ].sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) || (a.event?.sequence ?? 0) - (b.event?.sequence ?? 0),
  );
}

function ActivityIcon({ kind }: { kind: string }) {
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
      {kind === 'prompt' || kind === 'reply' ? (
        <>
          <path d="M4 4h16v12H9l-5 4V4Z" />
          {kind === 'reply' && <path d="M8 8h8M8 12h5" />}
        </>
      ) : kind === 'command' ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="m7 9 3 3-3 3M13 15h4" />
        </>
      ) : kind === 'capture' ? (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
        </>
      ) : kind === 'failure' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 17h.01" />
        </>
      ) : kind === 'file' ? (
        <>
          <path d="M6 3h8l4 4v14H6V3ZM14 3v5h4M9 12h6M9 16h4" />
        </>
      ) : kind === 'tool' ? (
        <>
          <path d="m7 5-4 7 4 7M17 5l4 7-4 7M14 4l-4 16" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  );
}

function EventObservation({
  event,
  inspect,
}: {
  event: RecordedEvent;
  inspect: (id: string, mode?: 'file' | 'diff') => void;
}) {
  const activity = activityKind(event);
  const title = eventTitle(event);
  const meaningful =
    title !== event.kind.replaceAll('.', ' · ').replaceAll('_', ' ') &&
    title !== record(event.payload).upstream_type;
  return (
    <details
      className={'history-event ' + (failed(event) ? 'event-failed' : '')}
      data-event-id={event.id}
      tabIndex={-1}
    >
      <summary>
        <span className="event-kind-label">{activity.label}</span>
        <strong>{meaningful ? title.slice(0, 180) : activity.hint}</strong>
        {failed(event) && <span className="capture-partial">Failure / interruption recorded</span>}
      </summary>
      <div className="history-event-details">
        <p>
          Event #{event.sequence}
          {event.tool_name ? ' · ' + event.tool_name : ''} · Received{' '}
          {historyDate(event.received_at)}
        </p>
        <code>{event.kind}</code>
        {event.checkpoint_id ? (
          <button onClick={() => inspect(event.checkpoint_id!)}>Inspect linked checkpoint</button>
        ) : (
          <p>This event has no linked checkpoint. No workspace state is inferred.</p>
        )}
        <details>
          <summary>Recorded payload</summary>
          <pre>{JSON.stringify(event.payload, null, 2)}</pre>
        </details>
      </div>
    </details>
  );
}

export function VisualHistory({
  session,
  events,
  checkpoints,
  loading,
  eventMore,
  checkpointMore,
  busy,
  loadEvents,
  loadCheckpoints,
  inspect,
}: {
  session?: Session;
  events: RecordedEvent[];
  checkpoints: Checkpoint[];
  loading: boolean;
  eventMore: boolean;
  checkpointMore: boolean;
  busy: boolean;
  loadEvents: () => void;
  loadCheckpoints: () => void;
  inspect: (id: string, mode?: 'file' | 'diff') => void;
}) {
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
  function jumpToBin(index: number) {
    const bin = density.bins[index];
    if (!bin.count) return;
    const all = chronological(events, checkpoints);
    const at = all.findIndex((row) => row.key === 'e' + bin.eventID);
    setFilter('all');
    setStatus('all');
    setQuery('');
    setOperations(false);
    setLimit(80);
    setWindowStart(Math.max(0, at - 8));
    setJump({ id: bin.eventID, bin: index });
  }
  if (!session)
    return (
      <div className="history-empty">
        <NavIcon name="sessions" />
        <h2>Your history starts with a run</h2>
        <p>
          Record a task in Chat with Codex, then explore its events and captured workspaces here.
        </p>
      </div>
    );
  return (
    <div className="visual-history-frame">
      <div
        className={'history-sticky-summary ' + (compact ? 'is-visible' : '')}
        aria-hidden={!compact}
      >
        <div>
          <strong>{session.title || 'Session history'}</strong>
          <span>
            {historyDate(session.started_at)} · {session.status.replaceAll('_', ' ')}
          </span>
        </div>
      </div>
      <section
        ref={scroll}
        className="visual-history"
        aria-label="Visual History"
        onScroll={(e) => setCompact(e.currentTarget.scrollTop > 150)}
      >
        <div className="history-intro">
          <span className="editorial-kicker">RECORDED WORKSPACE HISTORY</span>
          <h1>{session.title || 'The story of this session.'}</h1>
          <p>
            {historyDate(session.started_at)} <span>·</span> {session.agent} <span>·</span>{' '}
            <span className={'history-session-status ' + session.status}>
              {session.status.replaceAll('_', ' ')}
            </span>
          </p>
        </div>
        <div className="history-statline">
          <span>
            <strong>
              {events.length}
              {eventMore ? '+' : ''}
            </strong>{' '}
            recorded {plural(events.length === 1 && !eventMore ? 1 : 2, 'event')}
          </span>
          <span>
            <strong>
              {checkpoints.length}
              {checkpointMore ? '+' : ''}
            </strong>{' '}
            captured {plural(checkpoints.length === 1 && !checkpointMore ? 1 : 2, 'state')}
          </span>
          <span>Workspace observations · not atomic snapshots</span>
        </div>
        {density.count >= 20 && density.end > density.start && (
          <figure className="activity-density" aria-label="Recorded event density">
            <figcaption>
              Session activity <span>{density.count} loaded events · equal time intervals</span>
            </figcaption>
            <div className="density-bars">
              {density.bins.map((bin, index) => {
                const start = density.start + ((density.end - density.start) * index) / 48;
                return (
                  <button
                    key={index}
                    className="density-bar"
                    disabled={!bin.count}
                    aria-label={
                      bin.count +
                      ' recorded ' +
                      plural(bin.count, 'event') +
                      ' from ' +
                      time(new Date(start).toISOString()) +
                      '; jump to timeline'
                    }
                    aria-pressed={jump?.bin === index}
                    title={
                      bin.count +
                      ' recorded ' +
                      plural(bin.count, 'event') +
                      ' · ' +
                      time(new Date(start).toISOString())
                    }
                    onClick={() => jumpToBin(index)}
                  >
                    <span
                      style={{
                        height:
                          (bin.count ? Math.max(7, (bin.count / density.max) * 100) : 2) + '%',
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="density-times">
              <time>{time(new Date(density.start).toISOString())}</time>
              <span>{eventMore ? 'Loaded portion of the recording' : 'Recorded timestamps'}</span>
              <time>{time(new Date(density.end).toISOString())}</time>
            </div>
          </figure>
        )}
        <div className="history-filterbar">
          <div className="history-filters" role="group" aria-label="History content">
            {['all', 'events', 'checkpoints'].map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setLimit(80);
                  setWindowStart(0);
                  setJump(null);
                  setOperations(false);
                }}
              >
                {value === 'all' ? 'Everything' : value === 'events' ? 'Events' : 'Checkpoints'}
              </button>
            ))}
          </div>
          <button
            className="history-operations-toggle"
            aria-expanded={operations}
            onClick={() => setOperations((value) => !value)}
          >
            {operations ? 'Back to timeline' : 'View operation boundaries'}
          </button>
        </div>
        {operations ? (
          <Operations session={session.id} inspect={inspect} />
        ) : (
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
                Showing the recorded activity selected above. Timeline filters were reset to
                Everything.
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
              <ol className="chronology" aria-label="Chronological observations">
                {visible.map(({ rows: groupRows, group }) => {
                  const row = groupRows[0],
                    grouped = groupRows.length > 1;
                  const activity = row.event
                    ? activityKind(row.event)
                    : { icon: 'capture', label: 'Workspace captured' };
                  const canCompare =
                    !!row.cp?.parent_id &&
                    checkpoints.some((cp) => cp.id === row.cp!.parent_id && cp.id !== row.cp!.id);
                  return (
                    <li
                      key={row.key}
                      className={
                        (row.cp ? 'chronology-row milestone' : 'chronology-row') +
                        (row.event && failed(row.event) ? ' failed-row' : '')
                      }
                    >
                      <time dateTime={row.at} title={historyDate(row.at)}>
                        {time(row.at)}
                      </time>
                      <span
                        className={'timeline-marker marker-' + activity.icon}
                        aria-hidden="true"
                      >
                        <ActivityIcon kind={activity.icon} />
                      </span>
                      {row.cp ? (
                        <div className="milestone-content">
                          <div>
                            <span className="editorial-kicker">
                              WORKSPACE CAPTURED <time dateTime={row.at}>{time(row.at)}</time>
                            </span>
                            <h2>{checkpointName(row.cp)}</h2>
                            <p>
                              {row.cp.file_count} captured {plural(row.cp.file_count, 'file')}{' '}
                              <span>·</span>{' '}
                              <span className={row.cp.partial ? 'capture-partial' : ''}>
                                {row.cp.partial
                                  ? 'Partial · ' +
                                    row.cp.omission_count +
                                    ' omitted ' +
                                    plural(row.cp.omission_count, 'path')
                                  : 'Complete within capture policy'}
                              </span>
                              {row.cp.potentially_inconsistent && (
                                <span className="capture-partial"> · scan may be inconsistent</span>
                              )}
                            </p>
                          </div>
                          <div className="milestone-actions">
                            <button
                              onClick={() => inspect(row.cp!.id)}
                              aria-label={'Inspect checkpoint ' + row.cp.id.slice(0, 8)}
                            >
                              Inspect checkpoint <span aria-hidden="true">↗</span>
                            </button>
                            {canCompare && (
                              <button
                                className="checkpoint-compare"
                                onClick={() => inspect(row.cp!.id, 'diff')}
                                aria-label={
                                  'Compare checkpoint ' + row.cp.id.slice(0, 8) + ' with previous'
                                }
                              >
                                Compare with previous
                              </button>
                            )}
                          </div>
                        </div>
                      ) : grouped ? (
                        <details className="history-event-group">
                          <summary>
                            <strong>
                              {group.startsWith('turn:') ? 'Agent turn' : 'Tool activity'}
                            </strong>
                            <span>
                              {groupRows.length} recorded events <span aria-hidden="true">·</span>{' '}
                              {time(groupRows.at(-1)!.at)}
                            </span>
                          </summary>
                          <p className="group-explanation">
                            Grouped by an explicit recorded{' '}
                            {group.startsWith('turn:') ? 'turn' : 'tool-call'} identifier.
                          </p>
                          <div className="grouped-observations">
                            {groupRows.map((child) => (
                              <div key={child.key} className="grouped-event">
                                <time>{time(child.at)}</time>
                                <EventObservation event={child.event!} inspect={inspect} />
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <EventObservation event={row.event!} inspect={inspect} />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {rows.length > windowStart + limit && (
              <button className="history-load" onClick={() => setLimit((value) => value + 80)}>
                Show next observations ({rows.length - windowStart - limit} remaining)
              </button>
            )}
          </>
        )}
        {(eventMore || checkpointMore) && (
          <div className="history-pagination">
            <p>
              Showing loaded history. Load remaining pages for a fuller timeline and activity
              distribution.
            </p>
            {eventMore && (
              <button disabled={busy || loading} onClick={loadEvents}>
                Load more events
              </button>
            )}
            {checkpointMore && (
              <button disabled={busy || loading} onClick={loadCheckpoints}>
                Load more checkpoints
              </button>
            )}
          </div>
        )}
        <p className="history-footnote">
          Events describe received activity. Captured states are separate observations; proximity
          does not establish who authored a change.
        </p>
      </section>
    </div>
  );
}
