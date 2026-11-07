import test from 'node:test';
import assert from 'node:assert/strict';
import { APIError } from '../src/handlers/errors.ts';
import { listSessionEventsAfter, listChatEvents } from '../src/handlers/events.ts';
import { getCheckpoint } from '../src/handlers/checkpoints.ts';
import { renameSession } from '../src/handlers/sessions.ts';
import { previewCheckpointRestore, restoreCheckpoint } from '../src/handlers/restores.ts';

test('history handlers preserve cursors, cancellation and same-origin credentials', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ items: [], next_cursor: null }) };
  });
  const controller = new AbortController();
  await listSessionEventsAfter('session-1', 42, controller.signal);
  await listChatEvents('session-1', 43);
  await getCheckpoint('checkpoint-1', controller.signal);
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      '/api/sessions/session-1/events?cursor=42',
      '/api/sessions/session-1/events?cursor=43&limit=200',
      '/api/checkpoints/checkpoint-1',
    ],
  );
  assert.equal(requests[0].options.signal, controller.signal);
  assert(requests.every((request) => request.options.credentials === 'same-origin'));
});

test('write and restore handlers preserve confirmation, escaping, CSRF and failures', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({}) };
  });
  await renameSession('session-1', 'Parser review', 'csrf-token');
  await previewCheckpointRestore('checkpoint-1', 'review & tests', new AbortController().signal);
  await restoreCheckpoint('checkpoint-1', 'review', true, 'csrf-token');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers['X-AgentTM-CSRF'], 'csrf-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), { title: 'Parser review' });
  assert.equal(requests[1].url, '/api/checkpoints/checkpoint-1/fork?name=review%20%26%20tests');
  assert.deepEqual(JSON.parse(requests[2].options.body), {
    name: 'review',
    allow_partial: true,
    confirmed: true,
  });
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    json: async () => ({ error: { code: 'recording_active', message: 'Recording in progress' } }),
  }));
  await assert.rejects(
    getCheckpoint('checkpoint-1'),
    (error) =>
      error instanceof APIError &&
      error.code === 'recording_active' &&
      error.message === 'Recording in progress',
  );
});
