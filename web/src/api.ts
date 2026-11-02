export class APIError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal, credentials: 'same-origin' });
  const body = await response.json();
  if (!response.ok) throw new APIError(body.error?.code ?? 'request_failed', body.error?.message ?? `Request failed (${response.status})`);
  return body as T;
}
export function message(error: unknown): string { return error instanceof Error ? error.message : 'Unable to load recorded history.'; }
