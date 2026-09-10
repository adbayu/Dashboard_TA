import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { buildApp } from './app.js';
import { migrate } from './db.js';
import { hash, passwordHash, secret, connectionStatus } from './domain.js';

test('Sprint 1: PostgreSQL-backed pilot isolation and persistence', async context => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const schema = 'pilot_test_' + randomUUID().replaceAll('-', '');
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 5 });
  const origin = 'http://localhost:5173';
  const invitations = new Map<string, string>();
  let rejectMail = false;
  const options = { pool, origin, sendInvite: async (email: string, token: string) => {
    if (rejectMail) throw new Error('SMTP unavailable');
    invitations.set(email, token);
  } };
  let app = await buildApp(options);
  context.after(async () => { await app.close(); await pool.end(); await control.query('DROP SCHEMA ' + schema + ' CASCADE'); await control.end(); });
  await migrate(pool);
  await migrate(pool);
  const adminId = randomUUID();
  const password = 'Pilot-test-password-2026';
  await pool.query("INSERT INTO users(id,email,password_hash,role) VALUES($1,'admin@example.test',$2,'admin')", [adminId, await passwordHash(password)]);
  const login = async (email: string) => {
    const response = await app.inject({ method: 'POST', url: '/api/session/login', headers: { origin }, payload: { email, password } });
    assert.equal(response.statusCode, 200, response.body);
    return String(response.headers['set-cookie']).split(';')[0];
  };
  const admin = await login('admin@example.test');
  const request = (method: 'GET' | 'POST', url: string, session: string, payload?: object) => app.inject({ method, url, headers: { origin, cookie: session }, payload });
  let userA = ''; let userB = ''; let accountA = ''; let accountB = '';
  let water: any; let environment: any; let measuredAt = ''; let message: any;

  await context.test('Invitations verify email once; SMTP failures do not create active accounts', async () => {
    for (const address of ['a@example.test', 'b@example.test']) {
      assert.equal((await request('POST', '/api/admin/invitations', admin, { email: address })).statusCode, 200);
      const token = invitations.get(address)!;
      const response = await app.inject({ method: 'POST', url: '/api/invitations/accept', headers: { origin }, payload: { token, password } });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal((await app.inject({ method: 'POST', url: '/api/invitations/accept', headers: { origin }, payload: { token, password } })).statusCode, 400);
    }
    rejectMail = true;
    assert.equal((await request('POST', '/api/admin/invitations', admin, { email: 'failed@example.test' })).statusCode, 503);
    assert.equal((await pool.query("SELECT id FROM users WHERE email='failed@example.test'")).rowCount, 0);
    rejectMail = false;
    userA = await login('a@example.test'); userB = await login('b@example.test');
    accountA = (await request('GET', '/api/session', userA)).json().user.id;
    accountB = (await request('GET', '/api/session', userB)).json().user.id;
    assert.equal((await request('GET', '/api/admin/users', userA)).statusCode, 403);
  });
  await context.test('S1-01: new account has no fixture telemetry', async () => {
    assert.deepEqual((await request('GET', '/api/devices', userA)).json(), { devices: [] });
  });
  await context.test('S1-02/03: allocation is account-bound; concurrent one-time pairing', async () => {
    water = (await request('POST', '/api/admin/devices', admin, { userId: accountA, name: 'Air A', model: 'water-v1' })).json();
    environment = (await request('POST', '/api/admin/devices', admin, { userId: accountA, name: 'Lingkungan A', model: 'environment-v1' })).json();
    assert.ok(water.deviceId); assert.notEqual(water.activationCode, water.credential);
    assert.equal((await request('POST', '/api/devices/pair', userB, { code: water.activationCode })).statusCode, 400);
    assert.equal((await request('POST', '/api/devices/pair', userA, { code: secret() })).statusCode, 400);
    const responses = await Promise.all([request('POST', '/api/devices/pair', userA, { code: water.activationCode }), request('POST', '/api/devices/pair', userA, { code: water.activationCode })]);
    assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 400]);
    assert.equal((await request('POST', '/api/devices/pair', userA, { code: environment.activationCode })).statusCode, 200);
    assert.equal((await request('GET', '/api/devices', userA)).json().devices.length, 2);
  });
  await context.test('S1-04: direct IDs, history and admin do not bypass ownership', async () => {
    for (const session of [userB, admin]) {
      for (const suffix of ['', '/history']) assert.equal((await request('GET', '/api/devices/' + water.deviceId + suffix, session)).statusCode, 404);
      assert.equal((await request('POST', '/api/devices/' + water.deviceId + '/release', session)).statusCode, 404);
    }
    assert.equal((await app.inject({ url: '/api/devices/' + water.deviceId })).statusCode, 401);
  });
  const ingest = (unit: any, payload: object, credential = unit.credential) => app.inject({ method: 'POST', url: '/api/ingest', headers: { authorization: 'Bearer ' + credential }, payload });
  await context.test('S1-05: both device models use their own sensor definitions', async () => {
    await pool.query("UPDATE ownerships SET started_at=now()-interval '1 hour'");
    await pool.query("UPDATE devices SET credential_since=now()-interval '1 hour'");
    measuredAt = new Date().toISOString();
    message = { version: 1, deviceId: water.deviceId, model: 'water-v1', messageId: randomUUID(), measuredAt, readings: { water_temperature: 27, ph: 7, ec: 1.2 } };
    assert.equal((await ingest(water, message)).statusCode, 200);
    const airMessage = { ...message, deviceId: environment.deviceId, model: 'environment-v1', messageId: randomUUID(), readings: { air_temperature: 28, humidity: 65 } };
    assert.equal((await ingest(environment, airMessage)).statusCode, 200);
    const detail = (await request('GET', '/api/devices/' + water.deviceId, userA)).json().device;
    assert.equal(detail.sensors.length, 3); assert.equal(detail.sensors[2].unit, 'mS/cm'); assert.equal(detail.source, 'simulator');
    assert.equal((await request('GET', '/api/devices/' + environment.deviceId, userA)).json().device.sensors.length, 2);
  });
  await context.test('S1-06: invalid credentials, unknown sensors, coercion, timestamps and extra properties rejected', async () => {
    assert.equal((await ingest(water, message, secret())).statusCode, 401);
    assert.equal((await ingest(water, message, water.activationCode)).statusCode, 401);
    for (const payload of [
      { ...message, readings: { ...message.readings, ph: 15 } },
      { ...message, readings: { ...message.readings, ph: '7' } },
      { ...message, readings: { ...message.readings, oxygen: 5 } },
      { ...message, measuredAt: new Date(Date.now() + 120000).toISOString() },
      { ...message, measuredAt: 'yesterday' },
      { ...message, ownerId: accountB },
      { ...message, version: 2 },
      { ...message, model: 'environment-v1' },
    ]) assert.equal((await ingest(water, payload)).statusCode, 400);
    assert.equal(Number((await pool.query('SELECT count(*) FROM readings')).rows[0].count), 2);
  });
  await context.test('S1-07: duplicate retry idempotency; conflicting ID returns 409', async () => {
    const results = await Promise.all([ingest(water, message), ingest(water, message)]);
    for (const response of results) assert.deepEqual(response.json(), { accepted: true, duplicate: true });
    assert.equal((await ingest(water, { ...message, readings: { ...message.readings, ph: 8 } })).statusCode, 409);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history', userA)).json().readings.length, 1);
  });
  await context.test('S1-08: buffered historical measurements never overwrite latest', async () => {
    const historical = { ...message, messageId: randomUUID(), measuredAt: new Date(Date.now() - 300000).toISOString(), readings: { ...message.readings, ph: 6 } };
    assert.equal((await ingest(water, historical)).statusCode, 200);
    const detail = (await request('GET', '/api/devices/' + water.deviceId, userA)).json().device;
    assert.equal(detail.readings.ph, 7); assert.equal(detail.measured_at, measuredAt);
    const history = (await request('GET', '/api/devices/' + water.deviceId + '/history', userA)).json();
    assert.equal(history.readings[1].measured_at, historical.measuredAt);
    const now = Date.now();
    assert.equal(connectionStatus(null, null, now), 'offline');
    assert.equal(connectionStatus(new Date(now - 90000).toISOString(), new Date(now).toISOString(), now), 'stale');
    assert.equal(connectionStatus(new Date(now).toISOString(), new Date(now - 180000).toISOString(), now), 'offline');
  });
  await context.test('History pagination preserves equal-time messages without leaking account B', async () => {
    const ownership = (await pool.query('SELECT id FROM ownerships WHERE device_id=$1', [water.deviceId])).rows[0].id;
    for (let index = 0; index < 105; index++) await pool.query('INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings) VALUES($1,$2,$3,$4,$5)', [water.deviceId, randomUUID(), ownership, measuredAt, JSON.stringify(message.readings)]);
    const first = (await request('GET', '/api/devices/' + water.deviceId + '/history', userA)).json();
    assert.equal(first.readings.length, 100); assert.ok(first.nextCursor);
    const second = (await request('GET', '/api/devices/' + water.deviceId + '/history?cursor=' + first.nextCursor, userA)).json();
    assert.equal(second.readings.length, 7); assert.equal(second.nextCursor, null);
    assert.equal(new Set([...first.readings, ...second.readings].map(row => row.message_id)).size, 107);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history?cursor=bad', userA)).statusCode, 400);
  });
  await context.test('S1-11: API restart preserves sessions, ownership and telemetry', async () => {
    await app.close(); app = await buildApp(options);
    assert.equal((await request('GET', '/api/devices', userA)).json().devices.length, 2);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history', userA)).json().readings.length, 100);
  });
  await context.test('Transfer rotates device credentials and isolates previous owner history', async () => {
    assert.equal((await request('POST', '/api/admin/devices', admin, { userId: accountB, name: 'Air B', model: 'water-v1', deviceId: water.deviceId })).statusCode, 409);
    assert.equal((await request('POST', '/api/devices/' + water.deviceId + '/release', userA)).statusCode, 200);
    const transferred = (await request('POST', '/api/admin/devices', admin, { userId: accountB, name: 'Air B', model: 'water-v1', deviceId: water.deviceId })).json();
    assert.equal((await request('POST', '/api/devices/pair', userB, { code: transferred.activationCode })).statusCode, 200);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history', userB)).json().readings.length, 0);
    assert.equal((await ingest(water, message)).statusCode, 401);
    assert.equal((await ingest(transferred, { ...message, messageId: randomUUID() })).statusCode, 401);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal((await ingest(transferred, { ...message, messageId: randomUUID(), measuredAt: new Date().toISOString() })).statusCode, 200);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history', userB)).json().readings.length, 1);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId, userA)).statusCode, 404);
    assert.equal((await request('GET', '/api/devices/' + water.deviceId + '/history', userA)).json().readings.length, 100);
  });
  await context.test('CSRF, session expiry and logout enforcement', async () => {
    assert.equal((await app.inject({ method: 'POST', url: '/api/session/logout', headers: { cookie: userA, origin: 'https://evil.test' } })).statusCode, 403);
    assert.equal((await request('POST', '/api/session/logout', userA)).statusCode, 200);
    assert.equal((await request('GET', '/api/devices', userA)).statusCode, 401);
    await pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [hash(userB.split('=')[1])]);
    assert.equal((await request('GET', '/api/devices', userB)).statusCode, 401);
  });
  await context.test('Pilot limits: 10 total accounts, including pending invitations', async () => {
    const count = Number((await pool.query('SELECT count(*) FROM users')).rows[0].count);
    for (let index = count; index < 10; index++) await pool.query("INSERT INTO users(id,email,role) VALUES($1,$2,'user')", [randomUUID(), 'pending' + index + '@example.test']);
    assert.equal((await request('POST', '/api/admin/invitations', admin, { email: 'over-limit@example.test' })).statusCode, 409);
    assert.equal(Number((await pool.query('SELECT count(*) FROM users')).rows[0].count), 10);
  });
  await context.test('Pilot unit limit remains atomic under concurrent allocations', async () => {
    const count = Number((await pool.query('SELECT count(*) FROM devices')).rows[0].count);
    for (let index = count; index < 19; index++) await pool.query("INSERT INTO devices(id,name,model,credential_hash,allocated_to) VALUES($1,$2,'water-v1',$3,$4)", [randomUUID(), 'Reserved ' + index, hash(secret()), accountA]);
    const payload = { userId: accountA, name: 'Final available unit', model: 'water-v1' };
    const responses = await Promise.all([request('POST', '/api/admin/devices', admin, payload), request('POST', '/api/admin/devices', admin, payload)]);
    assert.deepEqual(responses.map(response => response.statusCode).sort(), [200, 409]);
    assert.equal(Number((await pool.query('SELECT count(*) FROM devices')).rows[0].count), 20);
  });
  await context.test('S1-10: database unavailable returns visible structured error, never fixture data', async () => {
    const unavailable = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema });
    await unavailable.end();
    const offline = await buildApp({ ...options, pool: unavailable });
    try {
      const response = await offline.inject({ url: '/api/health' });
      assert.equal(response.statusCode, 503); assert.equal(response.json().error.code, 'UNAVAILABLE');
    } finally { await offline.close(); }
  });
});
