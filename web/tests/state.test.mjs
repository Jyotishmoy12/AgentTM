import assert from 'node:assert/strict';
import test from 'node:test';
import { checkpointNear, changedPaths, filterEvents, eventTitle } from '../src/state.ts';

const events = [
  { id: 'start', sequence: 1, kind: 'turn.started', payload: null },
  {
    id: 'baseline',
    sequence: 2,
    kind: 'agenttm.snapshot.baseline',
    checkpoint_id: 'cp1',
    payload: {},
  },
  {
    id: 'tool',
    sequence: 3,
    kind: 'item.completed',
    tool_name: 'command_execution',
    payload: {
      item: { command: 'echo hello', changes: [{ path: 'src/a.go' }, null, { path: 123 }] },
    },
  },
  {
    id: 'final',
    sequence: 4,
    kind: 'agenttm.snapshot.final',
    checkpoint_id: 'cp2',
    payload: { changed_paths: ['src/a.go', 'src/a.go', 12] },
  },
];
test('events before any snapshot never display future workspace', () =>
  assert.equal(checkpointNear(events, 'start'), null));
test('a tool event displays the preceding state with explicit uncertainty', () =>
  assert.deepEqual(checkpointNear(events, 'tool'), { id: 'cp1', exact: false }));
test('linked snapshot event resolves its own state', () =>
  assert.deepEqual(checkpointNear(events, 'final'), { id: 'cp2', exact: true }));
test('unknown event IDs never inherit the last checkpoint', () =>
  assert.equal(checkpointNear(events, 'missing'), null));
test('path filters handle malformed payloads and remove duplicate paths', () => {
  assert.deepEqual(changedPaths(events[3]), ['src/a.go']);
  assert.deepEqual(changedPaths(events[0]), []);
  assert.equal(filterEvents(events, 'src/a.go', '', '').length, 2);
  assert.equal(filterEvents(events, '', 'item.completed', 'command_execution').length, 1);
  assert.equal(eventTitle(events[2]), 'echo hello');
});
