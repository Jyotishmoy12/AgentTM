import { APIError } from './errors.ts';
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal, credentials: 'same-origin' });
  const body = await response.json();
  if (!response.ok)
    throw new APIError(
      body.error?.code ?? 'request_failed',
      body.error?.message ?? `Request failed (${response.status})`,
    );
  return body as T;
}

export async function post<T>(path: string, body: unknown, token: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-AgentTM-CSRF': token },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new APIError(data.error?.code ?? 'request_failed', data.error?.message ?? 'Fork failed.');
  return data as T;
}
