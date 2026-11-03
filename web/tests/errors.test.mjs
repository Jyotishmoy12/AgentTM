import test from 'node:test';
import assert from 'node:assert/strict';
import { message } from '../src/api.ts';

test('native Wails rejection strings retain the actual diagnostic', () => {
  assert.equal(message('could not start Codex App Server; install Codex CLI and check PATH'), 'could not start Codex App Server; install Codex CLI and check PATH');
  assert.equal(message({ message: 'Codex model/list: please sign in' }), 'Codex model/list: please sign in');
  assert.equal(message(new Error('timeout')), 'timeout');
  assert.ok(!message(null).includes('recorded history'));
});
