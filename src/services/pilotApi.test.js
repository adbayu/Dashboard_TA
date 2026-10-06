import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pilotApi } from './pilotApi.js';

test('pilotApi menerima respons tanpa isi dari route DELETE 204', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    assert.equal(await pilotApi('/v1/keys/key-1', { method: 'DELETE' }), undefined);
  } finally {
    globalThis.fetch = originalFetch;
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
