import type { Page, SnapshotFile } from '../types';
import { get } from './http.ts';
export function listCheckpointFiles(checkpointID: string, signal: AbortSignal) {
  return get<Page<SnapshotFile>>('/checkpoints/' + checkpointID + '/tree', signal);
}

export function moreCheckpointFiles(checkpointID: string, cursor: number | null) {
  return get<Page<SnapshotFile>>('/checkpoints/' + checkpointID + '/tree?cursor=' + cursor);
}
