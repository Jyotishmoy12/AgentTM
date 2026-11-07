import { failed } from '../../data/VisualHistory';
import { activityKind, historyDate } from '../../history-presentation';
import { eventTitle, record } from '../../state';
import type { RecordedEvent } from '../../types';

export function EventObservation({
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
