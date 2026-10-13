import assert from 'node:assert/strict';
import { test } from 'node:test';
import type pg from 'pg';
import { buildApp } from './app.js';

const origin = 'http://localhost:5173';
const pool = { query: async () => ({ rows: [] }) } as unknown as pg.Pool;

async function observedClientIp(trustProxyHops: number, remoteAddress: string, forwardedFor: string) {
  const app = await buildApp({ pool, origin, trustProxyHops, sendInvite: async () => undefined });
  let clientIp: string | undefined;
  app.get('/__test/client-ip', {
    onRequest: async request => {
      clientIp = request.ip;
    },
  }, async request => ({ ip: request.ip }));

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/__test/client-ip',
      remoteAddress,
      headers: { 'x-forwarded-for': forwardedFor },
    });
    assert.equal(response.statusCode, 401, response.body);
    assert.ok(clientIp);
    return clientIp;
  } finally {
    await app.close();
  }
}

test('TRUST_PROXY_HOPS=0 ignores forwarded client IPs', async () => {
  assert.equal(
    await observedClientIp(0, '192.0.2.10', '198.51.100.20'),
    '192.0.2.10',
  );
});

test('TRUST_PROXY_HOPS=1 trusts only the nearest proxy hop', async () => {
  assert.equal(
    await observedClientIp(1, '10.0.0.2', '198.51.100.20, 203.0.113.30'),
    '203.0.113.30',
  );
});
