import type { Checkpoint, RecordedEvent } from '../types';

export function chronological(events: RecordedEvent[], checkpoints: Checkpoint[]) {
  return [
    ...events.map((event) => ({
      key: 'e' + event.id,
      at: event.received_at,
      event,
      cp: undefined as Checkpoint | undefined,
    })),
    ...checkpoints.map((cp) => ({
      key: 'c' + cp.id,
      at: cp.created_at,
      event: undefined as RecordedEvent | undefined,
      cp,
    })),
  ].sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) || (a.event?.sequence ?? 0) - (b.event?.sequence ?? 0),
  );
}
