import type { RecordedEvent } from './types.ts';

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
export function changedPaths(event: RecordedEvent): string[] {
  const payload = record(event.payload);
  const paths = strings(payload.changed_paths);
  const changes = record(payload.item).changes;
  if (Array.isArray(changes))
    for (const change of changes) {
      const path = record(change).path;
      if (typeof path === 'string') paths.push(path);
    }
  return [...new Set(paths)];
}
export function checkpointNear(
  events: RecordedEvent[],
  selectedID: string,
): { id: string; exact: boolean } | null {
  let id = '';
  for (const event of events) {
    if (event.checkpoint_id) id = event.checkpoint_id;
    if (event.id === selectedID) return id ? { id, exact: !!event.checkpoint_id } : null;
  }
  return null;
}
export function filterEvents(
  events: RecordedEvent[],
  query: string,
  kind: string,
  tool: string,
): RecordedEvent[] {
  const needle = query.trim().toLowerCase();
  return events.filter(
    (e) =>
      (!kind || e.kind === kind) &&
      (!tool || e.tool_name === tool) &&
      (!needle ||
        [e.kind, e.tool_name ?? '', ...changedPaths(e)].some((v) =>
          v.toLowerCase().includes(needle),
        )),
  );
}
export function eventTitle(event: RecordedEvent): string {
  const payload = record(event.payload);
  const item = record(payload.item);
  if (event.kind.startsWith('agenttm.snapshot.'))
    return `${event.kind.split('.').at(-1)} workspace scan`;
  if (typeof item.command === 'string') return item.command;
  if (typeof item.text === 'string') return item.text;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof item.type === 'string') return item.type.replaceAll('_', ' ');
  return event.kind.replaceAll('.', ' · ').replaceAll('_', ' ');
}
