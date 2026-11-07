import { eventFailed, historyTime } from '../history-presentation';
import type { Checkpoint } from '../types';

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

export const time = historyTime;

export const failed = eventFailed;
