import type { Change, Page } from '../types';
import { get } from './http.ts';
export function listCheckpointChanges(checkpointID: string, signal: AbortSignal) {
  return get<Page<Change>>('/checkpoints/' + checkpointID + '/diff', signal);
}

export function moreCheckpointChanges(checkpointID: string, cursor: number | null) {
  return get<Page<Change>>('/checkpoints/' + checkpointID + '/diff?cursor=' + cursor);
}
