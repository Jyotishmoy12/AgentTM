import type { Health } from '../types';
import { get } from './http.ts';
export function getHealth(signal: AbortSignal) {
  return get<Health>('/health', signal);
}
