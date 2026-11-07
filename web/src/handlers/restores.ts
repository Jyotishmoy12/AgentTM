import type { ForkPlan, ForkResult, Page, RestoredWorkspace } from '../types';
import { get, post } from './http.ts';
export function previewCheckpointRestore(checkpointID: string, name: string, signal: AbortSignal) {
  return get<ForkPlan>(
    `/checkpoints/${checkpointID}/fork?name=${encodeURIComponent(name)}`,
    signal,
  );
}

export function restoreCheckpoint(
  checkpointID: string,
  name: string,
  allowPartial: boolean,
  token: string,
) {
  return post<ForkResult>(
    `/checkpoints/${checkpointID}/fork`,
    { name: name, allow_partial: allowPartial, confirmed: true },
    token,
  );
}

export function listRestoredWorkspaces(signal: AbortSignal) {
  return get<Page<RestoredWorkspace>>('/forks', signal);
}

export function moreRestoredWorkspaces(cursor: number) {
  return get<Page<RestoredWorkspace>>('/forks?cursor=' + cursor);
}
