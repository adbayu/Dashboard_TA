import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeveloperApi } from './developerApi.js';

test('adapter Developer memakai route key dan usage yang tersedia', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return path === '/v1/keys' ? { keys: [] } : { usage: { totalRequests: 0 } };
  };
  const api = createDeveloperApi({ request });

  await api.getKeys();
  await api.createKey({ name: 'Pengujian', environment: 'test', scopes: ['devices:read'] });
  await api.revokeKey('key/id');
  await api.getUsage('key/id');

  assert.deepEqual(calls, [
    { path: '/v1/keys', options: undefined },
    { path: '/v1/keys', options: { method: 'POST', body: { name: 'Pengujian', environment: 'test', scopes: ['devices:read'] } } },
    { path: '/v1/keys/key%2Fid', options: { method: 'DELETE' } },
    { path: '/v1/keys/key%2Fid/usage?days=7', options: undefined },
  ]);
});
