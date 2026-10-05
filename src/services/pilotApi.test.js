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
