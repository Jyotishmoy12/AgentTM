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
export function message(error: unknown): string {
  // Wails rejects native calls with strings, while fetch and browser APIs
  // generally reject with Error objects. Preserve both forms of useful detail.
  if (typeof error === 'string' && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'The operation could not be completed. Please try again.';
}
export async function post<T>(path: string,body: unknown,token: string):Promise<T>{
  const response=await fetch(`/api${path}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-AgentTM-CSRF':token},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new APIError(data.error?.code??'request_failed',data.error?.message??'Fork failed.');return data as T;
}
