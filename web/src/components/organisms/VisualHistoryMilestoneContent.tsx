import { checkpointName, time } from '../../data/VisualHistory';
import { plural } from '../../history-presentation';
import type { Checkpoint, RecordedEvent } from '../../types';

export function VisualHistoryMilestoneContent({
  model: viewModel,
}: {
  model: {
    row:
      | { key: string; at: string; event: RecordedEvent; cp: Checkpoint | undefined }
      | { key: string; at: string; event: RecordedEvent | undefined; cp: Checkpoint };
    inspect: (id: string, mode?: 'file' | 'diff') => void;
    canCompare: boolean;
  };
}) {
  const { row, inspect, canCompare } = viewModel;
  if (!row.cp) return null;
  return (
    <div className="milestone-content">
      <div>
        <span className="editorial-kicker">
          WORKSPACE CAPTURED <time dateTime={row.at}>{time(row.at)}</time>
        </span>
        <h2>{checkpointName(row.cp)}</h2>
        <p>
          {row.cp.file_count} captured {plural(row.cp.file_count, 'file')} <span>·</span>{' '}
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
            aria-label={'Compare checkpoint ' + row.cp.id.slice(0, 8) + ' with previous'}
          >
            Compare with previous
          </button>
        )}
      </div>
    </div>
  );
}
