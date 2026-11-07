import { NavIcon } from '../components/atoms/NavIcon';
import { Operations } from '../components/organisms/Operations';
import { VisualHistoryActivityDensity } from '../components/organisms/VisualHistoryActivityDensity';
import { VisualHistoryContent } from '../components/organisms/VisualHistoryContent';
import { historyDate, plural } from '../history-presentation';
import { useVisualHistoryState } from '../hooks/useVisualHistoryState';
import type { Checkpoint, RecordedEvent, Session } from '../types';
import { chronological } from '../utils/chronological';

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
  const view = useVisualHistoryState({ model: { events, checkpoints } });
  function jumpToBin(index: number) {
    const bin = view.density.bins[index];
    if (!bin.count) return;
    const all = chronological(events, checkpoints);
    const at = all.findIndex((row) => row.key === 'e' + bin.eventID);
    view.setFilter('all');
    view.setStatus('all');
    view.setQuery('');
    view.setOperations(false);
    view.setLimit(80);
    view.setWindowStart(Math.max(0, at - 8));
    view.setJump({ id: bin.eventID, bin: index });
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
        className={'history-sticky-summary ' + (view.compact ? 'is-visible' : '')}
        aria-hidden={!view.compact}
      >
        <div>
          <strong>{session.title || 'Session history'}</strong>
          <span>
            {historyDate(session.started_at)} · {session.status.replaceAll('_', ' ')}
          </span>
        </div>
      </div>
      <section
        ref={view.scroll}
        className="visual-history"
        aria-label="Visual History"
        onScroll={(e) => view.setCompact(e.currentTarget.scrollTop > 150)}
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
        {view.density.count >= 20 && view.density.end > view.density.start && (
          <VisualHistoryActivityDensity
            model={{ density: view.density, jump: view.jump, jumpToBin, eventMore }}
          />
        )}
        <div className="history-filterbar">
          <div className="history-filters" role="group" aria-label="History content">
            {['all', 'events', 'checkpoints'].map((value) => (
              <button
                key={value}
                aria-pressed={view.filter === value}
                onClick={() => {
                  view.setFilter(value);
                  view.setLimit(80);
                  view.setWindowStart(0);
                  view.setJump(null);
                  view.setOperations(false);
                }}
              >
                {value === 'all' ? 'Everything' : value === 'events' ? 'Events' : 'Checkpoints'}
              </button>
            ))}
          </div>
          <button
            className="history-operations-toggle"
            aria-expanded={view.operations}
            onClick={() => view.setOperations((value) => !value)}
          >
            {view.operations ? 'Back to timeline' : 'View operation boundaries'}
          </button>
        </div>
        {view.operations ? (
          <Operations session={session.id} inspect={inspect} />
        ) : (
          <VisualHistoryContent model={{ ...view, loading, events, checkpoints, inspect }} />
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
