import type { Page, RecordedEvent } from '../types';
import { get } from './http.ts';
export function previewSessionEvents(sessionID: string, signal: AbortSignal) {
  return get<Page<RecordedEvent>>('/sessions/' + sessionID + '/events?limit=12', signal);
}
export function listSessionEvents(sessionID: string, signal: AbortSignal) {
  return get<Page<RecordedEvent>>(`/sessions/${sessionID}/events`, signal);
}
export function listSessionEventsAfter(sessionID: string, cursor: number, signal?: AbortSignal) {
  return get<Page<RecordedEvent>>(`/sessions/${sessionID}/events?cursor=${cursor}`, signal);
}
export function listChatEvents(sessionID: string, cursor: number, signal?: AbortSignal) {
  return get<Page<RecordedEvent>>(
    `/sessions/${sessionID}/events?cursor=${cursor}&limit=200`,
    signal,
  );
}
