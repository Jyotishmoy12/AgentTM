import test from 'node:test';
import assert from 'node:assert/strict';
import { codexError } from '../src/codexErrors.ts';

test('nested model errors become a readable account-access message', () => {
  const detail = "The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.";
  const api = {
    error: { code: 'model_not_found', message: detail, type: 'invalid_request_error' },
  };
  const result = codexError(
    JSON.stringify({
      codexErrorInfo: 'other',
      message: JSON.stringify(api),
      additionalDetails: null,
    }),
  );
  assert.equal(result.title, 'Choose a different model');
  assert.equal(result.detail, detail);
  assert.match(result.action, /Select a model/);
  assert.ok(!result.detail.includes('additionalDetails'));
});

test('plain errors and RPC-wrapped errors remain readable', () => {
  assert.equal(codexError('Cannot reach Codex').detail, 'Cannot reach Codex');
  assert.equal(
    codexError('Codex turn/start: {"message":"Please sign in"}').detail,
    'Please sign in',
  );
  assert.equal(codexError('{not valid JSON').detail, '{not valid JSON');
});
