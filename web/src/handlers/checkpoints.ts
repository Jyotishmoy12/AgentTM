import type { Checkpoint, Page } from '../types';
import { get } from './http.ts';
export function getCheckpoint(id: string, signal?: AbortSignal) {
  return get<Checkpoint>(`/checkpoints/${id}`, signal);
}
export function listSessionCheckpoints(sessionID: string, cursor: number | null) {
  return get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints?cursor=${cursor}`);
}
export function initialSessionCheckpoints(sessionID: string, signal: AbortSignal) {
  return get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints`, signal);
}
export function pollSessionCheckpoints(sessionID: string, cursor: number, signal: AbortSignal) {
  return get<Page<Checkpoint>>(`/sessions/${sessionID}/checkpoints?cursor=${cursor}`, signal);
}
