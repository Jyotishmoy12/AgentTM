import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityKind,
  eventFailed,
  eventDensity,
  eventGroupKey,
  historyDate,
  plural,
} from '../src/history-presentation.ts';
const event = (kind, payload = {}, rest = {}) => ({
  id: kind,
  kind,
  payload,
  received_at: '2026-11-05T10:31:06Z',
  sequence: 1,
  ...rest,
});
test('activity labels distinguish notifications without claiming a started command executed', () => {
  assert.equal(activityKind(event('agenttm.chat.prompt')).label, 'Prompt received');
  assert.equal(
    activityKind(event('item.started', { item: { type: 'command_execution' } })).label,
    'Command started',
  );
  assert.equal(
    activityKind(event('item.completed', { item: { type: 'command_execution', exit_code: 1 } }))
      .icon,
    'failure',
  );
  assert.equal(
    eventFailed(event('item.completed', { item: { type: 'error', message: 'failed' } })),
    true,
  );
  assert.equal(activityKind(event('agenttm.snapshot.baseline')).icon, 'capture');
});
test('grouping requires explicit retained identifiers and leaves failures and checkpoints separate', () => {
  assert.equal(eventGroupKey(event('item.started', {}, { tool_call_id: 'tool-1' })), 'tool:tool-1');
  assert.equal(eventGroupKey(event('item.completed', { turn_id: 'turn-1' })), 'turn:turn-1');
  assert.equal(eventGroupKey(event('item.started')), '');
  assert.equal(
    eventGroupKey(event('item.completed', { item: { exit_code: 1 } }, { tool_call_id: 'tool-1' })),
    '',
  );
  assert.equal(
    eventGroupKey(
      event('item.completed', {}, { tool_call_id: 'tool-1', checkpoint_id: 'capture' }),
    ),
    '',
  );
  assert.equal(eventGroupKey(event('item.started', {}, { tool_call_id: '[REDACTED]' })), '');
});
test('density uses actual timestamps, excludes invalid times and retains each bin navigation target', () => {
  const values = [
    event('item.started', {}, { id: 'late', received_at: '2026-11-05T10:51:06Z' }),
    event('item.started', {}, { id: 'first' }),
    event('item.completed', {}, { id: 'second' }),
    event('unknown', {}, { received_at: 'bad' }),
  ];
  const density = eventDensity(values);
  assert.equal(density.count, 3);
  assert.equal(density.bins[0].count, 2);
  assert.equal(density.bins[0].eventID, 'first');
  assert.equal(density.bins[47].eventID, 'late');
  assert.equal(density.bins.filter((bin) => bin.count).length, 2);
  assert.equal(eventDensity([]).count, 0);
});
test('editorial dates and counts are internationally readable and grammatically correct', () => {
  assert.match(historyDate('2026-11-05T12:00:00Z'), /5 Nov 2026/);
  assert.equal(plural(1, 'state'), 'state');
  assert.equal(plural(0, 'state'), 'states');
  assert.equal(plural(11, 'event'), 'events');
});
