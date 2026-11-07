import type { Page } from '../types';
import type { Operation } from '../types/Operations';
import { get } from './http.ts';
export function listSessionOperations(sessionID: string, signal: AbortSignal) {
  return get<Page<Operation>>(`/sessions/${sessionID}/operations`, signal);
}

export function moreSessionOperations(sessionID: string, cursor: number | null) {
  return get<Page<Operation>>(`/sessions/${sessionID}/operations?cursor=${cursor}`);
}
