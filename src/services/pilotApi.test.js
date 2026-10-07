import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pilotApi } from './pilotApi.js';
import { iotRequestGovernor } from './iotRequestGovernor.js';

test('pilotApi menerima respons tanpa isi dari route DELETE 204', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    assert.equal(await pilotApi('/v1/keys/key-1', { method: 'DELETE' }), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pilotApi memberi prioritas latest pada GET dan user pada mutasi tanpa override', async () => {
  const originalFetch = globalThis.fetch;
  const originalRun = iotRequestGovernor.run;
  const priorities = [];
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  iotRequestGovernor.run = (operation, options) => {
    priorities.push(options.priority);
    return operation(options.signal);
  };
  try {
    await pilotApi('/v1/session');
    await pilotApi('/v1/session/logout', { method: 'POST' });
    assert.deepEqual(priorities, ['latest', 'user']);
  } finally {
    globalThis.fetch = originalFetch;
    iotRequestGovernor.run = originalRun;
  }
});

test('pilotApi mempertahankan timeout request sambil meneruskan pembatalan pemanggil', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let requestSignal;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    requestSignal.addEventListener('abort', () => reject(requestSignal.reason), { once: true });
  });
  try {
    const pending = pilotApi('/v1/readings', { signal: controller.signal });
    await Promise.resolve();
    assert.ok(requestSignal);
    assert.equal(requestSignal.aborted, false);
    controller.abort();
    assert.equal(requestSignal.aborted, true);
    await assert.rejects(pending);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
