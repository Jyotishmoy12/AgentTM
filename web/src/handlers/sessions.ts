import type { Page, Session } from '../types';
import { get, post } from './http.ts';
export function renameSession(id: string, title: string, token: string) {
  return post<{ id: string; title: string }>(`/sessions/${id}/title`, { title }, token);
}
export function listSessionsAfter(cursor: number | null) {
  return get<Page<Session>>(`/sessions?cursor=${cursor}`);
}
export function listSessions(signal: AbortSignal) {
  return get<Page<Session>>('/sessions', signal);
}
export function peekSessions(signal: AbortSignal) {
  return get<Page<Session>>('/sessions?limit=1', signal);
}
