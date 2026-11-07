import test from 'node:test';
import assert from 'node:assert/strict';
import { desktopBridge } from '../src/handlers/native.ts';

test('native handler preserves capabilities, receiver binding and bridge identity', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
  globalThis.window = {};
  assert.equal(desktopBridge(), undefined);
  const native = {
    name: 'native bridge',
    CopyText(text) {
      return Promise.resolve(`${this.name}: ${text}`);
    },
  };
  window.go = { main: { Desktop: native } };
  const bridge = desktopBridge();
  assert.equal(desktopBridge(), bridge);
  assert.equal('StartChat' in bridge, false);
  const copy = bridge.CopyText;
  return assert.doesNotReject(async () => {
    assert.equal(await copy('path'), 'native bridge: path');
  });
});
