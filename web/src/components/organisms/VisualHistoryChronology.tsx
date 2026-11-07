import { failed, time } from '../../data/VisualHistory';
import { activityKind, historyDate } from '../../history-presentation';
import type { Checkpoint, RecordedEvent } from '../../types';
import { ActivityIcon } from '../atoms/ActivityIcon';
import { EventObservation } from '../molecules/EventObservation';
import { VisualHistoryMilestoneContent } from './VisualHistoryMilestoneContent';

export function VisualHistoryChronology({
  model: viewModel,
}: {
  model: {
    visible: {
      rows: (
        | { key: string; at: string; event: RecordedEvent; cp: Checkpoint | undefined }
        | { key: string; at: string; event: RecordedEvent | undefined; cp: Checkpoint }
      )[];
      group: string;
    }[];
    checkpoints: Checkpoint[];
    inspect: (id: string, mode?: 'file' | 'diff') => void;
  };
}) {
  const { visible, checkpoints, inspect } = viewModel;
  return (
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
            <span className={'timeline-marker marker-' + activity.icon} aria-hidden="true">
              <ActivityIcon kind={activity.icon} />
            </span>
            {row.cp ? (
              <VisualHistoryMilestoneContent model={{ row, inspect, canCompare }} />
            ) : grouped ? (
              <details className="history-event-group">
                <summary>
                  <strong>{group.startsWith('turn:') ? 'Agent turn' : 'Tool activity'}</strong>
                  <span>
                    {groupRows.length} recorded events <span aria-hidden="true">·</span>{' '}
                    {time(groupRows.at(-1)!.at)}
                  </span>
                </summary>
                <p className="group-explanation">
                  Grouped by an explicit recorded {group.startsWith('turn:') ? 'turn' : 'tool-call'}{' '}
                  identifier.
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
  );
}
