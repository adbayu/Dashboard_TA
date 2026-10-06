import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { migrate } from './db.js';
import { buildApp } from './app.js';
import { hash, passwordHash, secret } from './domain.js';
import { authenticateApiKey, parseApiKey } from './auth/api-key.js';
import { authenticateSession } from './auth/session.js';
import { HEARTBEAT_INTERVAL_MS, StreamHub, type StreamClock } from './v1/stream.js';

test('serializer request hanya mencatat method, bukan URL, body, atau header', async () => {
  const request = {
    method: 'POST',
    url: '/api/v1/devices/rotation?c=one-time-token',
    body: { credential: 'one-time-credential' },
    headers: { authorization: 'Bearer one-time-credential' },
  };
  const { serializeRequestForLog } = await import('./app.js');
  const serialized = serializeRequestForLog(request);
  assert.deepEqual(serialized, { method: 'POST' });
  assert.equal(Object.hasOwn(serialized, 'url'), false);
  assert.doesNotMatch(JSON.stringify(serialized), /one-time-credential|one-time-token/);
});

test('V1 migration upgrades an existing pilot schema and backfills IoT metadata once', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');

  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const version = Number((await control.query("SELECT current_setting('server_version_num') AS version")).rows[0].version);
  assert.ok(Math.floor(version / 10000) >= 17, 'TEST_DATABASE_URL must point to PostgreSQL 17 or newer');

  const schema = 'v1_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 5 });

  try {
    await pool.query(`
      CREATE TABLE schema_migrations (version integer PRIMARY KEY);
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email text NOT NULL UNIQUE,
        password_hash text,
        role text NOT NULL CHECK (role IN ('admin', 'user')),
        invite_hash text UNIQUE,
        invite_expires timestamptz
      );
      CREATE TABLE sessions (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id),
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE devices (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        model text NOT NULL CHECK (model IN ('water-v1', 'environment-v1')),
        credential_hash text NOT NULL UNIQUE,
        credential_since timestamptz NOT NULL DEFAULT clock_timestamp(),
        allocated_to uuid NOT NULL REFERENCES users(id),
        activation_hash text UNIQUE,
        activation_expires timestamptz
      );
      CREATE TABLE ownerships (
        id uuid PRIMARY KEY,
        device_id uuid NOT NULL REFERENCES devices(id),
        user_id uuid NOT NULL REFERENCES users(id),
        started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        ended_at timestamptz,
        CHECK (ended_at IS NULL OR ended_at >= started_at)
      );
      CREATE UNIQUE INDEX one_device_owner ON ownerships(device_id) WHERE ended_at IS NULL;
      CREATE INDEX owner_devices ON ownerships(user_id, device_id);
      CREATE TABLE readings (
        device_id uuid NOT NULL REFERENCES devices(id),
        message_id uuid NOT NULL,
        ownership_id uuid NOT NULL REFERENCES ownerships(id),
        measured_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        readings jsonb NOT NULL,
        PRIMARY KEY (device_id, message_id)
      );
      CREATE INDEX reading_history ON readings(ownership_id, measured_at DESC, message_id DESC);
      CREATE INDEX reading_received ON readings(ownership_id, received_at DESC);
      INSERT INTO schema_migrations(version) VALUES (1);
    `);

    const ownerId = randomUUID();
    const waterId = randomUUID();
    const environmentId = randomUUID();
    await pool.query("INSERT INTO users(id,email,role) VALUES ($1,'water@example.test','user'),($2,'environment@example.test','user')", [ownerId, randomUUID()]);
    await pool.query("INSERT INTO devices(id,name,model,credential_hash,allocated_to) VALUES ($1,'Pilot water','water-v1','water-credential',$3),($2,'Pilot environment','environment-v1','environment-credential',$3)", [waterId, environmentId, ownerId]);

    await migrate(pool);
    await migrate(pool);

    assert.deepEqual(
      (await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version),
      [1, 2, 3, 4, 5],
    );
    assert.equal((await pool.query("SELECT to_regclass('api_keys_prefix_lookup') AS name")).rows[0].name, 'api_keys_prefix_lookup');
    assert.equal((await pool.query("SELECT to_regclass('device_events_state_lookup') AS name")).rows[0].name, 'device_events_state_lookup');
    assert.match((await pool.query('SELECT indexdef FROM pg_indexes WHERE indexname=$1', ['device_events_state_lookup'])).rows[0].indexdef, /device_id, sensor_code, id DESC/);
    assert.equal((await pool.query('SELECT sandbox_scenario FROM devices WHERE id=$1', [waterId])).rows[0].sandbox_scenario, 'normal');
    await assert.rejects(pool.query("UPDATE devices SET sandbox_scenario='invalid' WHERE id=$1", [waterId]), { code: '23514' });

    const seedCounts = await pool.query(`
      SELECT
        (SELECT count(*) FROM sensor_types) AS sensors,
        (SELECT count(*) FROM device_types) AS types,
        (SELECT count(*) FROM device_type_sensors) AS type_sensors,
        (SELECT count(*) FROM devices WHERE legacy_id IS NOT NULL) AS legacy_devices
    `);
    assert.deepEqual(seedCounts.rows[0], { sensors: '6', types: '6', type_sensors: '11', legacy_devices: '3' });

    const legacyDevices = [
      ['IOT-001', 'AQ-PH-001', 'AQ-PH'],
      ['IOT-002', 'AQ-TMP-002', 'AQ-TMP'],
      ['IOT-003', 'AQ-TDS-003', 'AQ-TDS'],
    ];
    for (const [legacyId, code, typeCode] of legacyDevices) {
      const byLegacyId = await pool.query('SELECT id, code, type_id, model, credential_hash, allocated_to, area_ref FROM devices WHERE legacy_id=$1', [legacyId]);
      const byCode = await pool.query('SELECT id FROM devices WHERE code=$1', [code]);
      assert.equal(byLegacyId.rowCount, 1);
      assert.equal(byLegacyId.rows[0].id, byCode.rows[0]?.id);
      assert.equal(byLegacyId.rows[0].code, code);
      assert.equal(byLegacyId.rows[0].area_ref, 'AR-01');
      assert.equal(byLegacyId.rows[0].type_id, (await pool.query('SELECT id FROM device_types WHERE code=$1', [typeCode])).rows[0].id);
      assert.equal(byLegacyId.rows[0].model, null);
      assert.equal(byLegacyId.rows[0].credential_hash, null);
      assert.equal(byLegacyId.rows[0].allocated_to, null);
    }
    assert.equal(Number((await pool.query('SELECT count(*) FROM readings r JOIN devices d ON d.id=r.device_id WHERE d.legacy_id IS NOT NULL')).rows[0].count), 0);

    const pilotTypes = await pool.query(`
      SELECT d.model, t.code AS type_code, d.credential_hash, d.allocated_to
      FROM devices d JOIN device_types t ON t.id=d.type_id
      WHERE d.id IN ($1, $2)
      ORDER BY d.model
    `, [waterId, environmentId]);
    assert.deepEqual(pilotTypes.rows.map(row => [row.model, row.type_code]), [
      ['environment-v1', 'PILOT-ENV-V1'],
      ['water-v1', 'PILOT-WATER-V1'],
    ]);
    assert.deepEqual(pilotTypes.rows.map(row => [row.credential_hash, row.allocated_to]), [
      ['environment-credential', ownerId],
      ['water-credential', ownerId],
    ]);
  } finally {
    await pool.end();
    await control.query('DROP SCHEMA ' + schema + ' CASCADE');
    await control.end();
  }
});

test('V1 device management contracts', async context => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = 'v1_api_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 5 });
  const origin = 'http://localhost:5173';
  const password = 'Farm-v1-integration-test';
  const adminId = randomUUID();
  const userId = randomUUID();
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    await migrate(pool);
    const encodedPassword = await passwordHash(password);
    await pool.query("INSERT INTO users(id,email,password_hash,role) VALUES ($1,'admin-v1@example.test',$2,'admin'),($3,'user-v1@example.test',$2,'user')", [adminId, encodedPassword, userId]);
    app = await buildApp({ pool, origin, sendInvite: async () => undefined });

    const login = async (email: string) => {
      const response = await app!.inject({ method: 'POST', url: '/api/session/login', headers: { origin }, payload: { email, password } });
      assert.equal(response.statusCode, 200, response.body);
      return String(response.headers['set-cookie']).split(';')[0];
    };
    const admin = await login('admin-v1@example.test');
    const user = await login('user-v1@example.test');
    const request = async (method: 'GET' | 'POST' | 'PATCH', url: string, cookie?: string, payload?: object, headers: Record<string, string> = {}) => {
      const response = await app!.inject({ method, url, headers: { ...(cookie ? { cookie } : {}), ...(cookie && method !== 'GET' ? { origin } : {}), ...headers }, payload });
      return response;
    };
    const createDevice = async (typeCode: string, name: string) => {
      const response = await request('POST', '/api/v1/devices', admin, { typeCode, name, areaRef: null, allocatedTo: null });
      assert.equal(response.statusCode, 201, response.body);
      return response.json();
    };

    await context.test('OpenAPI JSON memuat endpoint IoT v1', async () => {
      const response = await app!.inject({ method: 'GET', url: '/docs/openapi.json' });
      assert.equal(response.statusCode, 200, response.body);
      const spec = response.json();
      assert.equal(spec.openapi, '3.1.0');
      assert.ok(spec.paths['/api/v1/sensor-types']);
      assert.ok(spec.paths['/api/v1/devices']);
      for (const path of [
        '/api/v1/devices/{id}/credentials/rotate',
        '/api/v1/devices/{id}/latest',
        '/api/v1/devices/{id}/readings',
        '/api/v1/sensors/{code}/overview',
        '/api/v1/events',
        '/api/v1/areas/{ref}/thresholds',
        '/api/v1/stream',
        '/api/v1/sandbox/devices',
        '/api/v1/sandbox/devices/{id}/scenario',
      ]) assert.ok(spec.paths[path], path);
    });

    await context.test('V1-02 rejects a single type with two sensors', async () => {
      const response = await request('POST', '/api/v1/device-types', admin, {
        code: 'TEST-SINGLE-BAD', name: 'Tipe satuan tidak valid', kind: 'satuan', description: '',
        sensors: [{ code: 'ph', label: 'pH' }, { code: 'tds', label: 'TDS' }],
      });
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('V1-03 rejects a package type with one sensor', async () => {
      const response = await request('POST', '/api/v1/device-types', admin, {
        code: 'TEST-PACKAGE-BAD', name: 'Tipe paket tidak valid', kind: 'paket', description: '',
        sensors: [{ code: 'ph', label: 'pH' }],
      });
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('V1-04 rejects sensor changes after a type is used', async () => {
      const type = (await pool.query('SELECT id FROM device_types WHERE code=$1', ['AQ-PH'])).rows[0];
      const response = await request('PATCH', '/api/v1/device-types/' + type.id, admin, {
        sensors: [{ code: 'tds', label: 'Probe TDS' }],
      });
      assert.equal(response.statusCode, 409, response.body);
      assert.equal(response.json().error.code, 'CONFLICT');
    });

    await context.test('V1-25 finds the same migrated device by legacy ID and code', async () => {
      const byLegacy = await request('GET', '/api/v1/devices?legacyId=IOT-001', admin);
      assert.equal(byLegacy.statusCode, 200, byLegacy.body);
      const device = byLegacy.json().devices[0];
      assert.equal(device.code, 'AQ-PH-001');
      const preview = await request('GET', '/api/v1/devices?code=AQ-PH-001');
      assert.equal(preview.statusCode, 200, preview.body);
      assert.equal(preview.json().device.code, device.code);
      assert.equal(preview.json().device.name, device.name);
      assert.equal(preview.json().device.claimed, false);
      for (const privateField of ['legacyId', 'areaRef', 'readings', 'credential', 'activationCode', 'allocatedTo', 'ownerId']) {
        assert.equal(Object.hasOwn(preview.json().device, privateField), false, privateField + ' must not be public');
      }
    });

    await context.test('V1 QR lookup and activation endpoints enforce their access boundaries', async () => {
      const created = await createDevice('AQ-TDS', 'Sensor QR uji');
      const deniedQr = await request('POST', '/api/v1/devices/' + created.device.id + '/qr?format=svg', user, { activationCode: created.activationCode });
      assert.equal(deniedQr.statusCode, 403, deniedQr.body);
      assert.equal(deniedQr.json().error.code, 'FORBIDDEN_SCOPE');
      const qr = await request('POST', '/api/v1/devices/' + created.device.id + '/qr?format=svg', admin, { activationCode: created.activationCode });
      assert.equal(qr.statusCode, 200, qr.body);
      assert.match(String(qr.headers['content-type']), /image\/svg\+xml/);
      const preview = await request('GET', '/api/v1/devices?code=' + created.device.code + '&c=' + created.activationCode);
      assert.equal(preview.statusCode, 200, preview.body);
      assert.equal(preview.json().device.activationValid, true);
    });

    await context.test('V1-28 reissue invalidates the old activation code and the new one claims once', async () => {
      const created = await createDevice('AQ-PH', 'Sensor aktivasi uji');
      assert.equal(created.device.code, 'AQ-PH-002');
      const reissued = await request('POST', '/api/v1/devices/' + created.device.id + '/activation', admin);
      assert.equal(reissued.statusCode, 200, reissued.body);
      assert.notEqual(reissued.json().activationCode, created.activationCode);
      const oldClaim = await request('POST', '/api/v1/devices/claim', user, { code: created.device.code, activationCode: created.activationCode });
      assert.equal(oldClaim.statusCode, 400, oldClaim.body);
      assert.equal(oldClaim.json().error.code, 'VALIDATION_FAILED');
      const claim = await request('POST', '/api/v1/devices/claim', user, { code: created.device.code, activationCode: reissued.json().activationCode });
      assert.equal(claim.statusCode, 200, claim.body);
      const legacyList = await request('GET', '/api/devices', user);
      assert.equal(legacyList.statusCode, 200, legacyList.body);
      assert.deepEqual(legacyList.json().devices, []);
      const secondClaim = await request('POST', '/api/v1/devices/claim', user, { code: created.device.code, activationCode: reissued.json().activationCode });
      assert.equal(secondClaim.statusCode, 409, secondClaim.body);
      assert.equal(secondClaim.json().error.code, 'CONFLICT');
    });

    await context.test('V1-29 generates package numbers from the highest existing prefix value', async () => {
      const codes = [];
      for (const name of ['Paket satu', 'Paket dua', 'Paket tiga']) {
        codes.push((await createDevice('AQ-WATER-01', name)).device.code);
      }
      assert.deepEqual(codes, ['AQ-PKT-001', 'AQ-PKT-002', 'AQ-PKT-003']);
    });

    await context.test('CSRF applies only to cookie requests and mixed credentials are rejected', async () => {
      const keyOnly = await app!.inject({
        method: 'POST', url: '/api/v1/devices',
        headers: { authorization: 'Bearer jf_live_' + 'a'.repeat(64) },
        payload: { typeCode: 'AQ-PH', name: 'Akses tanpa cookie', areaRef: null, allocatedTo: null },
      });
      assert.equal(keyOnly.statusCode, 401, keyOnly.body);
      assert.equal(keyOnly.json().error.code, 'UNAUTHENTICATED');
      const mixed = await app!.inject({
        method: 'POST', url: '/api/v1/devices',
        headers: { origin, cookie: admin, authorization: 'Bearer jf_live_' + 'a'.repeat(64) }, payload: {},
      });
      assert.equal(mixed.statusCode, 400, mixed.body);
      assert.equal(mixed.json().error.code, 'AMBIGUOUS_AUTH');
      const cookieWithoutOrigin = await app!.inject({ method: 'POST', url: '/api/v1/devices', headers: { cookie: admin }, payload: {} });
      assert.equal(cookieWithoutOrigin.statusCode, 403, cookieWithoutOrigin.body);
      assert.equal(cookieWithoutOrigin.json().error.code, 'ORIGIN_REJECTED');
    });

    await context.test('Sandbox devices do not consume the v1 pilot limit of 20 live units', async () => {
      const typeId = (await pool.query("SELECT id FROM device_types WHERE code='AQ-PH'")).rows[0].id;
      for (let index = 1; index <= 5; index++) {
        await pool.query(
          `INSERT INTO devices(id,name,code,type_id,is_sandbox)
           VALUES($1,$2,$3,$4,true)`,
          [randomUUID(), 'Sandbox capacity ' + index, `AQ-SBX-CAP-${String(index).padStart(3, '0')}`, typeId],
        );
      }
      let liveCount = Number((await pool.query('SELECT count(*) FROM devices WHERE is_sandbox=false')).rows[0].count);
      while (liveCount < 19) {
        await pool.query('INSERT INTO devices(id,name,is_sandbox) VALUES($1,$2,false)', [randomUUID(), 'Live capacity ' + liveCount]);
        liveCount++;
      }
      const lastLive = await request('POST', '/api/v1/devices', admin, {
        typeCode: 'AQ-PH', name: 'Unit live ke-20', areaRef: null, allocatedTo: null,
      });
      assert.equal(lastLive.statusCode, 201, lastLive.body);
      const overLimit = await request('POST', '/api/v1/devices', admin, {
        typeCode: 'AQ-PH', name: 'Unit live ke-21', areaRef: null, allocatedTo: null,
      });
      assert.equal(overLimit.statusCode, 409, overLimit.body);
      assert.equal(overLimit.json().error.code, 'CONFLICT');
      assert.equal(Number((await pool.query('SELECT count(*) FROM devices WHERE is_sandbox=false')).rows[0].count), 20);
      assert.equal(Number((await pool.query('SELECT count(*) FROM devices WHERE is_sandbox=true')).rows[0].count), 5);
    });
  } finally {
    await app?.close();
    await pool.end();
    await control.query('DROP SCHEMA ' + schema + ' CASCADE');
    await control.end();
  }
});

test('V1 API key contracts and access controls', async context => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = 'v1_keys_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 5 });
  const origin = 'http://localhost:5173';
  const password = 'Farm-keys-integration-test';
  const adminId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const noKeyUserId = randomUUID();
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  const sandboxHub = new StreamHub(pool);
  let userSandboxId = '';
  let otherSandboxId = '';
  let adminSandboxId = '';
  let existingTestKey = '';

  try {
    await migrate(pool);
    const encodedPassword = await passwordHash(password);
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role) VALUES ($1,'admin-keys@example.test',$2,'admin'),($3,'user-keys@example.test',$2,'user'),($4,'other-keys@example.test',$2,'user'),($5,'no-key-sandbox@example.test',$2,'user')",
      [adminId, encodedPassword, userId, otherUserId, noKeyUserId],
    );
    app = await buildApp({ pool, origin, sendInvite: async () => undefined, streamHub: sandboxHub });

    const login = async (email: string) => {
      const response = await app!.inject({ method: 'POST', url: '/api/session/login', headers: { origin }, payload: { email, password } });
      assert.equal(response.statusCode, 200, response.body);
      return String(response.headers['set-cookie']).split(';')[0];
    };
    const admin = await login('admin-keys@example.test');
    const user = await login('user-keys@example.test');
    const otherUser = await login('other-keys@example.test');
    const noKeyUser = await login('no-key-sandbox@example.test');
    const request = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, cookie?: string, payload?: object, headers: Record<string, string> = {}, remoteAddress = '127.0.0.1') => app!.inject({
      method,
      url,
      remoteAddress,
      headers: { ...(cookie ? { cookie } : {}), ...(cookie && method !== 'GET' ? { origin } : {}), ...headers },
      payload,
    });
    const createKey = async (cookie: string, environment: 'live' | 'test', scopes: string[], name = 'Kunci uji') => {
      const response = await request('POST', '/api/v1/keys', cookie, { name, environment, scopes });
      return { response, value: response.json() };
    };
    const fixtureDevice = async (isSandbox: boolean, ownerId: string | null, options: { activationCode?: string; code?: string } = {}) => {
      const id = randomUUID();
      const code = options.code ?? (isSandbox ? 'AQ-SBX-' : 'AQ-LIVE-') + id.slice(0, 8).toUpperCase();
      const typeId = (await pool.query("SELECT id FROM device_types WHERE code='AQ-PH'")).rows[0].id;
      const activationCode = options.activationCode;
      await pool.query(
        `INSERT INTO devices(id,name,model,credential_hash,allocated_to,code,type_id,is_sandbox,activation_hash,activation_expires)
         VALUES($1,$2,NULL,NULL,$3,$4,$5,$6,$7,CASE WHEN $7::text IS NULL THEN NULL ELSE now()+interval '24 hours' END)`,
        [id, 'Fixture ' + code, ownerId, code, typeId, isSandbox, activationCode ? hash(activationCode) : null],
      );
      if (!activationCode && ownerId) await pool.query('INSERT INTO ownerships(id,device_id,user_id) VALUES($1,$2,$3)', [randomUUID(), id, ownerId]);
      return { id, code, activationCode };
    };

    await context.test('Tambahan: API key mensyaratkan minimal satu scope', async () => {
      const emptyScopes = await createKey(user, 'test', []);
      assert.equal(emptyScopes.response.statusCode, 400, emptyScopes.response.body);
      assert.equal(emptyScopes.response.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('Sandbox: dua POST key test paralel membuat satu device; panel memprovisikan key lama dengan kode global', async () => {
      const [firstKey, secondKey] = await Promise.all([
        createKey(user, 'test', ['devices:read'], 'Sandbox race A'),
        createKey(user, 'test', ['devices:write'], 'Sandbox race B'),
      ]);
      assert.equal(firstKey.response.statusCode, 201, firstKey.response.body);
      assert.equal(secondKey.response.statusCode, 201, secondKey.response.body);
      const provisioned = await pool.query(
        `SELECT d.id,d.code FROM devices d JOIN ownerships o ON o.device_id=d.id
         WHERE d.is_sandbox=true AND o.user_id=$1 AND o.ended_at IS NULL`,
        [userId],
      );
      assert.equal(provisioned.rowCount, 1);
      userSandboxId = provisioned.rows[0].id;
      assert.match(provisioned.rows[0].code, /^AQ-SBX-[0-9]{3,}$/);

      existingTestKey = 'jf_test_' + secret();
      await pool.query(
        'INSERT INTO api_keys(id,user_id,name,prefix,key_hash,scopes,environment) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), otherUserId, 'Key test lama', existingTestKey.slice(0, 12), hash(existingTestKey), ['devices:read'], 'test'],
      );
      const panel = await request('GET', '/api/v1/sandbox/devices', undefined, undefined, { authorization: 'Bearer ' + existingTestKey });
      assert.equal(panel.statusCode, 200, panel.body);
      assert.equal(panel.json().devices.length, 1);
      otherSandboxId = panel.json().devices[0].id;
      assert.notEqual(panel.json().devices[0].code, provisioned.rows[0].code);
      const reopened = await request('GET', '/api/v1/sandbox/devices', otherUser);
      assert.equal(reopened.statusCode, 200, reopened.body);
      assert.equal(reopened.json().devices.length, 1);
      assert.equal(reopened.json().devices[0].id, otherSandboxId);
      assert.equal(Number((await pool.query('SELECT count(*) FROM devices WHERE is_sandbox=true AND allocated_to=$1', [otherUserId])).rows[0].count), 1);
    });

    await context.test('V1-33: sesi tanpa key test memprovisikan satu sandbox saat membuka daftar', async () => {
      assert.equal(Number((await pool.query("SELECT count(*) FROM api_keys WHERE user_id=$1 AND environment='test'", [noKeyUserId])).rows[0].count), 0);
      const response = await request('GET', '/api/v1/sandbox/devices', noKeyUser);
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().devices.length, 1);
      assert.match(response.json().devices[0].code, /^AQ-SBX-[0-9]{3,}$/);
      const mapped = await pool.query(
        `SELECT d.id FROM sandbox_accounts s
         JOIN devices d ON d.id=s.device_id AND d.is_sandbox=true
         JOIN ownerships o ON o.device_id=d.id AND o.user_id=s.user_id AND o.ended_at IS NULL
         WHERE s.user_id=$1`,
        [noKeyUserId],
      );
      assert.equal(mapped.rowCount, 1);
      assert.equal(mapped.rows[0].id, response.json().devices[0].id);
    });

    await context.test('Sandbox scenario hanya mengubah device milik actor; ph_turun melewati batas efektif dalam satu siklus', async () => {
      const userDevice = await pool.query('SELECT id FROM devices WHERE id=$1 AND is_sandbox=true', [userSandboxId]);
      assert.equal(userDevice.rowCount, 1);
      const liveDevice = await fixtureDevice(false, userId);
      const nonSandbox = await request('PUT', `/api/v1/sandbox/devices/${liveDevice.id}/scenario`, user, { scenario: 'ph_turun' });
      assert.equal(nonSandbox.statusCode, 404, nonSandbox.body);
      assert.equal(nonSandbox.json().error.code, 'NOT_FOUND');
      const foreignSandbox = await request('PUT', `/api/v1/sandbox/devices/${otherSandboxId}/scenario`, user, { scenario: 'ph_turun' });
      assert.equal(foreignSandbox.statusCode, 404, foreignSandbox.body);
      assert.equal(foreignSandbox.json().error.code, 'NOT_FOUND');

      const adminSandboxList = await request('GET', '/api/v1/sandbox/devices', admin);
      assert.equal(adminSandboxList.statusCode, 200, adminSandboxList.body);
      adminSandboxId = adminSandboxList.json().devices[0].id as string;
      const liveKey = await createKey(admin, 'live', ['devices:read']);
      assert.equal(liveKey.response.statusCode, 201, liveKey.response.body);
      const liveKeyScenario = await request('PUT', `/api/v1/sandbox/devices/${adminSandboxId}/scenario`, undefined, { scenario: 'ph_turun' }, { authorization: 'Bearer ' + liveKey.value.secret });
      assert.equal(liveKeyScenario.statusCode, 404, liveKeyScenario.body);
      assert.equal(liveKeyScenario.json().error.code, 'NOT_FOUND');

      const scenario = await request('PUT', `/api/v1/sandbox/devices/${userSandboxId}/scenario`, user, { scenario: 'ph_turun' });
      assert.equal(scenario.statusCode, 200, scenario.body);
      const { runSandboxCycle } = await import('./sandbox/runner.js');
      await runSandboxCycle(pool, sandboxHub, new Date());
      const sample = (await pool.query(
        `SELECT (r.readings->>'ph')::double precision AS ph,
           COALESCE(at.warn_low,st.warn_low) AS low
         FROM readings r JOIN devices d ON d.id=r.device_id
         JOIN device_type_sensors dts ON dts.type_id=d.type_id AND dts.sensor_code='ph'
         JOIN sensor_types st ON st.code=dts.sensor_code
         LEFT JOIN area_thresholds at ON at.area_ref=d.area_ref AND at.sensor_code=st.code
         WHERE r.device_id=$1 ORDER BY r.measured_at DESC,r.message_id DESC LIMIT 1`,
        [userSandboxId],
      )).rows[0];
      assert.ok(Number(sample.ph) < Number(sample.low), `pH ${sample.ph} must be below effective low ${sample.low}`);
      assert.equal(Number((await pool.query("SELECT count(*) FROM device_events WHERE device_id=$1 AND sensor_code='ph' AND type='threshold_low'", [userSandboxId])).rows[0].count), 1);
    });

    await context.test('V1-32: retensi menjaga event state terakhir sandbox dan tidak menyentuh readings/events live', async () => {
      const { cleanupSandboxRetention, runSandboxCycle } = await import('./sandbox/runner.js');
      const sandboxDevice = await fixtureDevice(true, userId);
      const liveDevice = await fixtureDevice(false, userId);
      await pool.query("UPDATE devices SET sandbox_scenario='ph_turun' WHERE id=$1", [sandboxDevice.id]);
      const sandboxOwnership = (await pool.query('SELECT id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [sandboxDevice.id])).rows[0].id;
      const liveOwnership = (await pool.query('SELECT id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [liveDevice.id])).rows[0].id;
      const oldAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const sandboxMessageId = randomUUID();
      const liveMessageId = randomUUID();
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,received_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,$4,'{"ph":6.0}'::jsonb,2,'AQ-PH','{}'::jsonb),
               ($5,$6,$7,$4,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [sandboxDevice.id, sandboxMessageId, sandboxOwnership, oldAt, liveDevice.id, liveMessageId, liveOwnership],
      );
      const priorLow = (await pool.query("INSERT INTO device_events(device_id,type,sensor_code,at) VALUES($1,'threshold_low','ph',$2) RETURNING id", [sandboxDevice.id, oldAt])).rows[0].id;
      const cleared = (await pool.query("INSERT INTO device_events(device_id,type,sensor_code,at) VALUES($1,'threshold_clear','ph',$2) RETURNING id", [sandboxDevice.id, oldAt])).rows[0].id;
      const retainedLow = (await pool.query("INSERT INTO device_events(device_id,type,sensor_code,at) VALUES($1,'threshold_low','ph',$2) RETURNING id", [sandboxDevice.id, oldAt])).rows[0].id;
      const priorOffline = (await pool.query("INSERT INTO device_events(device_id,type,at) VALUES($1,'offline',$2) RETURNING id", [sandboxDevice.id, oldAt])).rows[0].id;
      const retainedOnline = (await pool.query("INSERT INTO device_events(device_id,type,at) VALUES($1,'online',$2) RETURNING id", [sandboxDevice.id, oldAt])).rows[0].id;
      const liveEventId = (await pool.query("INSERT INTO device_events(device_id,type,at) VALUES($1,'offline',$2) RETURNING id", [liveDevice.id, oldAt])).rows[0].id;
      const result = await cleanupSandboxRetention(pool, 7, new Date());
      assert.equal(result.readingsDeleted, 1);
      assert.equal(result.eventsDeleted, 3);
      assert.equal(Number((await pool.query('SELECT count(*) FROM readings WHERE device_id=$1 AND message_id=$2', [sandboxDevice.id, sandboxMessageId])).rows[0].count), 0);
      assert.equal(Number((await pool.query('SELECT count(*) FROM device_events WHERE id=ANY($1::bigint[])', [[priorLow, cleared, priorOffline]])).rows[0].count), 0);
      assert.equal(Number((await pool.query('SELECT count(*) FROM device_events WHERE id=ANY($1::bigint[])', [[retainedLow, retainedOnline]])).rows[0].count), 2);
      assert.equal(Number((await pool.query('SELECT count(*) FROM readings WHERE device_id=$1 AND message_id=$2', [liveDevice.id, liveMessageId])).rows[0].count), 1);
      assert.equal(Number((await pool.query('SELECT count(*) FROM device_events WHERE id=$1', [liveEventId])).rows[0].count), 1);
      await runSandboxCycle(pool, sandboxHub, new Date());
      assert.equal(Number((await pool.query("SELECT count(*) FROM device_events WHERE device_id=$1 AND sensor_code='ph' AND type='threshold_low'", [sandboxDevice.id])).rows[0].count), 1);
    });

    await context.test('Sandbox runner tidak overlap; app.close membersihkan timer siklus dan retensi', async () => {
      const { createNonOverlappingTask, SANDBOX_CYCLE_INTERVAL_MS, SANDBOX_RETENTION_INTERVAL_MS } = await import('./sandbox/runner.js');
      let runs = 0;
      let unblock!: () => void;
      const gate = new Promise<void>(resolve => { unblock = resolve; });
      const guarded = createNonOverlappingTask(async () => { runs++; await gate; });
      const first = guarded.run();
      const overlapping = guarded.run();
      await Promise.resolve();
      assert.equal(runs, 1);
      unblock();
      await Promise.all([first, overlapping]);
      await guarded.run();
      assert.equal(runs, 2);

      const timers: Array<{ callback: () => void; delayMs: number; cancelled: boolean }> = [];
      const scheduler = {
        every(callback: () => void, delayMs: number) {
          const timer = { callback, delayMs, cancelled: false };
          timers.push(timer);
          return () => { timer.cancelled = true; };
        },
      };
      const lifecycleOptions = {
        pool,
        origin,
        sendInvite: async () => undefined,
        streamHub: sandboxHub,
        enableSandbox: true,
        sandboxRetentionDays: 7,
        sandboxScheduler: scheduler,
      };
      const lifecycleApp = await buildApp(lifecycleOptions);
      try {
        assert.equal(timers.length, 2);
        assert.deepEqual(timers.map(timer => timer.delayMs).sort((a, b) => a - b), [SANDBOX_CYCLE_INTERVAL_MS, SANDBOX_RETENTION_INTERVAL_MS].sort((a, b) => a - b));
      } finally {
        await lifecycleApp.close();
      }
      assert.equal(timers.every(timer => timer.cancelled), true);

      const retentionTimers: Array<{ callback: () => void; delayMs: number; cancelled: boolean }> = [];
      const retentionScheduler = {
        every(callback: () => void, delayMs: number) {
          const timer = { callback, delayMs, cancelled: false };
          retentionTimers.push(timer);
          return () => { timer.cancelled = true; };
        },
      };
      const disabledOptions = { ...lifecycleOptions, enableSandbox: false, sandboxScheduler: retentionScheduler };
      const disabledApp = await buildApp(disabledOptions);
      try {
        assert.equal(retentionTimers.length, 1);
        assert.equal(retentionTimers[0].delayMs, SANDBOX_RETENTION_INTERVAL_MS);
      } finally {
        await disabledApp.close();
      }
      assert.equal(retentionTimers[0].cancelled, true);
    });

    await context.test('V1-31: rotasi credential dibatasi admin, memotong credential lama, dan terserialisasi dengan ingest', async () => {
      const created = await request('POST', '/api/v1/devices', admin, {
        typeCode: 'AQ-PH', name: 'Device credential rotation', areaRef: null, allocatedTo: userId,
      });
      assert.equal(created.statusCode, 201);
      const { device, credential: originalCredential, activationCode } = created.json();
      const claim = await request('POST', '/api/v1/devices/claim', user, { code: device.code, activationCode });
      assert.equal(claim.statusCode, 200);
      await pool.query("UPDATE devices SET credential_since=clock_timestamp()-interval '10 minutes' WHERE id=$1", [device.id]);
      await pool.query("UPDATE ownerships SET started_at=clock_timestamp()-interval '10 minutes' WHERE device_id=$1 AND ended_at IS NULL", [device.id]);

      const rotatePath = `/api/v1/devices/${device.id}/credentials/rotate`;
      const deniedUser = await request('POST', rotatePath, user);
      assert.equal(deniedUser.statusCode, 403);
      assert.equal(deniedUser.json().error.code, 'FORBIDDEN_SCOPE');
      const readOnlyAdminKey = await createKey(admin, 'live', ['devices:read']);
      const deniedScope = await request('POST', rotatePath, undefined, undefined, { authorization: 'Bearer ' + readOnlyAdminKey.value.secret });
      assert.equal(deniedScope.statusCode, 403);
      assert.equal(deniedScope.json().error.code, 'FORBIDDEN_SCOPE');
      const adminKey = await createKey(admin, 'live', ['admin']);
      const rotated = await request('POST', rotatePath, undefined, undefined, { authorization: 'Bearer ' + adminKey.value.secret });
      assert.equal(rotated.statusCode, 200);
      const firstCredential = rotated.json().credential as string;
      assert.match(firstCredential, /^[a-f0-9]{64}$/);
      assert.notEqual(firstCredential, originalCredential);
      assert.equal(typeof rotated.json().credentialSince, 'string');
      const firstSince = Date.parse(rotated.json().credentialSince);
      assert.ok(Number.isFinite(firstSince));
      const firstStored = (await pool.query('SELECT credential_hash,credential_since FROM devices WHERE id=$1', [device.id])).rows[0];
      assert.equal(firstStored.credential_hash, hash(firstCredential));
      assert.equal(new Date(firstStored.credential_since).toISOString(), rotated.json().credentialSince);

      const ingest = (deviceCredential: string, messageId: string) => app!.inject({
        method: 'POST', url: '/api/ingest',
        headers: { authorization: 'Bearer ' + deviceCredential },
        payload: {
          version: 2, deviceId: device.id, type: 'AQ-PH', messageId,
          measuredAt: new Date(Date.now() + 30_000).toISOString(), readings: { ph: 7.0 },
        },
      });
      const oldCredential = await ingest(originalCredential, randomUUID());
      assert.equal(oldCredential.statusCode, 401);
      assert.equal(oldCredential.json().error.code, 'UNAUTHENTICATED');
      const newCredential = await ingest(firstCredential, randomUUID());
      assert.equal(newCredential.statusCode, 200);

      const lockHolder = await pool.connect();
      await lockHolder.query('BEGIN');
      await lockHolder.query('SELECT id FROM devices WHERE id=$1 FOR UPDATE', [device.id]);
      const concurrentRotation = request('POST', rotatePath, undefined, undefined, { authorization: 'Bearer ' + adminKey.value.secret });
      const concurrentIngest = ingest(firstCredential, randomUUID());
      let lockWaiters = 0;
      const lockDeadline = Date.now() + 3000;
      try {
        while (Date.now() < lockDeadline && lockWaiters < 2) {
          lockWaiters = Number((await pool.query(
            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'",
          )).rows[0].count);
          if (lockWaiters < 2) await new Promise(resolve => setTimeout(resolve, 10));
        }
      } finally {
        await lockHolder.query('ROLLBACK');
        lockHolder.release();
      }
      const [rotatedAgain, racedIngest] = await Promise.all([concurrentRotation, concurrentIngest]);
      assert.ok(lockWaiters >= 2, `Expected both requests to wait on the device row lock, saw ${lockWaiters}`);
      assert.equal(rotatedAgain.statusCode, 200);
      const secondCredential = rotatedAgain.json().credential as string;
      assert.match(secondCredential, /^[a-f0-9]{64}$/);
      assert.notEqual(secondCredential, firstCredential);
      assert.ok(racedIngest.statusCode === 200 || racedIngest.statusCode === 401);
      if (racedIngest.statusCode === 401) assert.equal(racedIngest.json().error.code, 'UNAUTHENTICATED');
      const oldAfterRace = await ingest(firstCredential, randomUUID());
      assert.equal(oldAfterRace.statusCode, 401);
      assert.equal(oldAfterRace.json().error.code, 'UNAUTHENTICATED');
      const currentCredential = await ingest(secondCredential, randomUUID());
      assert.equal(currentCredential.statusCode, 200);
      const finalStored = (await pool.query('SELECT credential_hash,credential_since FROM devices WHERE id=$1', [device.id])).rows[0];
      assert.equal(finalStored.credential_hash, hash(secondCredential));
      assert.equal(new Date(finalStored.credential_since).toISOString(), rotatedAgain.json().credentialSince);

      const visibleDevice = await request('GET', `/api/v1/devices/${device.id}`, user);
      assert.equal(visibleDevice.statusCode, 200);
      assert.equal(visibleDevice.json().device.isSandbox, false);
      assert.equal(Object.hasOwn(visibleDevice.json().device, 'credential'), false);
      assert.equal(Object.hasOwn(visibleDevice.json().device, 'credentialHash'), false);
    });

    await context.test('V1-09: key test tidak dapat membaca device live', async () => {
      const liveDevice = await fixtureDevice(false, userId);
      const key = await createKey(user, 'test', ['devices:read']);
      assert.equal(key.response.statusCode, 201, key.response.body);
      const response = await request('GET', '/api/v1/devices/' + liveDevice.id, undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      assert.equal(response.statusCode, 404, response.body);
      assert.equal(response.json().error.code, 'NOT_FOUND');
    });

    await context.test('V1-10: key live tidak dapat membaca device sandbox', async () => {
      const sandboxDevice = await fixtureDevice(true, userId);
      const key = await createKey(admin, 'live', ['devices:read', 'admin']);
      assert.equal(key.response.statusCode, 201, key.response.body);
      const response = await request('GET', '/api/v1/devices/' + sandboxDevice.id, undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      assert.equal(response.statusCode, 404, response.body);
      assert.equal(response.json().error.code, 'NOT_FOUND');
    });

    await context.test('V1-30: sandbox menolak rotasi, release, klaim, aktivasi, QR, dan preview dengan 404', async () => {
      const activationCode = secret();
      const sandboxDevice = await fixtureDevice(true, adminId, { activationCode });
      await pool.query('INSERT INTO ownerships(id,device_id,user_id) VALUES($1,$2,$3)', [randomUUID(), sandboxDevice.id, adminId]);
      const listing = await request('GET', '/api/v1/devices', admin);
      assert.equal(listing.statusCode, 200);
      assert.equal(listing.json().devices.find((item: { id: string }) => item.id === sandboxDevice.id)?.isSandbox, true);

      const rotate = await request('POST', `/api/v1/devices/${sandboxDevice.id}/credentials/rotate`, admin);
      assert.equal(rotate.statusCode, 404);
      assert.equal(rotate.json().error.code, 'NOT_FOUND');
      const release = await request('POST', `/api/v1/devices/${sandboxDevice.id}/release`, admin);
      assert.equal(release.statusCode, 404);
      assert.equal(release.json().error.code, 'NOT_FOUND');
      const claim = await request('POST', '/api/v1/devices/claim', admin, { code: sandboxDevice.code, activationCode });
      assert.equal(claim.statusCode, 404);
      assert.equal(claim.json().error.code, 'NOT_FOUND');
      const activation = await request('POST', `/api/v1/devices/${sandboxDevice.id}/activation`, admin);
      assert.equal(activation.statusCode, 404);
      assert.equal(activation.json().error.code, 'NOT_FOUND');
      const qr = await request('POST', `/api/v1/devices/${sandboxDevice.id}/qr`, admin, { activationCode });
      assert.equal(qr.statusCode, 404);
      assert.equal(qr.json().error.code, 'NOT_FOUND');
      const preview = await request('GET', `/api/v1/devices?code=${sandboxDevice.code}&c=${activationCode}`);
      assert.equal(preview.statusCode, 404);
      assert.equal(preview.json().error.code, 'NOT_FOUND');
      const unchanged = (await pool.query('SELECT credential_hash,activation_hash FROM devices WHERE id=$1', [sandboxDevice.id])).rows[0];
      assert.equal(unchanged.credential_hash, null);
      assert.equal(unchanged.activation_hash, hash(activationCode));
      assert.equal(Number((await pool.query('SELECT count(*) FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [sandboxDevice.id])).rows[0].count), 1);
    });

    await context.test('Tambahan: key admin tidak dapat membuat QR lintas environment; sandbox tidak menerima QR', async () => {
      const sandboxActivation = secret();
      const sandboxDevice = await fixtureDevice(true, adminId, { activationCode: sandboxActivation });
      const liveActivation = secret();
      const liveDevice = await fixtureDevice(false, adminId, { activationCode: liveActivation });
      const testKey = await createKey(admin, 'test', ['admin']);
      const liveKey = await createKey(admin, 'live', ['admin']);
      assert.equal(testKey.response.statusCode, 201, testKey.response.body);
      assert.equal(liveKey.response.statusCode, 201, liveKey.response.body);

      const qrRequest = (deviceId: string, activationCode: string, apiSecret: string) => request(
        'POST', '/api/v1/devices/' + deviceId + '/qr', undefined,
        { activationCode },
        { authorization: 'Bearer ' + apiSecret },
      );
      const testOwnEnvironment = await qrRequest(sandboxDevice.id, sandboxActivation, testKey.value.secret);
      assert.equal(testOwnEnvironment.statusCode, 404);
      assert.equal(testOwnEnvironment.json().error.code, 'NOT_FOUND');
      const testOtherEnvironment = await qrRequest(liveDevice.id, liveActivation, testKey.value.secret);
      assert.equal(testOtherEnvironment.statusCode, 404);
      assert.equal(testOtherEnvironment.json().error.code, 'NOT_FOUND');
      const liveOwnEnvironment = await qrRequest(liveDevice.id, liveActivation, liveKey.value.secret);
      assert.equal(liveOwnEnvironment.statusCode, 200);
      const liveOtherEnvironment = await qrRequest(sandboxDevice.id, sandboxActivation, liveKey.value.secret);
      assert.equal(liveOtherEnvironment.statusCode, 404);
      assert.equal(liveOtherEnvironment.json().error.code, 'NOT_FOUND');

      const sessionSandboxQr = await request('POST', '/api/v1/devices/' + sandboxDevice.id + '/qr', admin, { activationCode: sandboxActivation });
      assert.equal(sessionSandboxQr.statusCode, 404);
      assert.equal(sessionSandboxQr.json().error.code, 'NOT_FOUND');
      const sessionLiveQr = await request('POST', '/api/v1/devices/' + liveDevice.id + '/qr', admin, { activationCode: liveActivation });
      assert.equal(sessionLiveQr.statusCode, 200);
    });

    await context.test('Tambahan: lifecycle key, prefix/hash, dan schema OpenAPI', async () => {
      const { response, value } = await createKey(admin, 'test', ['devices:read'], 'Kunci API OpenAPI');
      assert.equal(response.statusCode, 201, response.body);
      assert.match(value.secret, /^jf_test_[a-f0-9]{64}$/);
      const listed = await request('GET', '/api/v1/keys', admin);
      assert.equal(listed.statusCode, 200, listed.body);
      const item = listed.json().keys.find((key: { id: string }) => key.id === value.key.id);
      assert.equal(item.prefix, value.secret.slice(0, 12));
      assert.equal(Object.hasOwn(item, 'secret'), false);
      assert.equal(Object.hasOwn(item, 'keyHash'), false);
      const stored = (await pool.query('SELECT prefix,key_hash FROM api_keys WHERE id=$1', [value.key.id])).rows[0];
      assert.equal(stored.prefix, value.secret.slice(0, 12));
      assert.equal(stored.key_hash, hash(value.secret));

      const openapi = (await request('GET', '/docs/openapi.json')).json();
      for (const path of ['/api/v1/keys', '/api/v1/keys/{id}', '/api/v1/keys/{id}/usage']) assert.ok(openapi.paths[path], path);
      assert.ok(openapi.paths['/api/v1/keys'].get.responses['200']);
      assert.ok(openapi.paths['/api/v1/keys'].post.requestBody);
      assert.ok(openapi.paths['/api/v1/keys'].post.responses['201']);
      assert.ok(openapi.paths['/api/v1/keys/{id}'].delete.responses['204']);
      assert.ok(openapi.paths['/api/v1/keys/{id}/usage'].get.responses['200']);

      const deleted = await request('DELETE', '/api/v1/keys/' + value.key.id, admin);
      assert.equal(deleted.statusCode, 204, deleted.body);
      const revoked = await pool.query('SELECT revoked_at FROM api_keys WHERE id=$1', [value.key.id]);
      assert.ok(revoked.rows[0].revoked_at);
    });

    await context.test('Tambahan: policy key Q2/Q3 dan scope admin', async () => {
      const liveForUser = await createKey(user, 'live', ['devices:read']);
      assert.equal(liveForUser.response.statusCode, 403, liveForUser.response.body);
      assert.equal(liveForUser.response.json().error.code, 'FORBIDDEN_SCOPE');
      const adminScopeForUser = await createKey(user, 'test', ['admin']);
      assert.equal(adminScopeForUser.response.statusCode, 403, adminScopeForUser.response.body);
      assert.equal(adminScopeForUser.response.json().error.code, 'FORBIDDEN_SCOPE');
      const adminLive = await createKey(admin, 'live', ['devices:read', 'admin']);
      assert.equal(adminLive.response.statusCode, 201, adminLive.response.body);
      assert.deepEqual(adminLive.value.key.scopes, ['devices:read', 'admin']);
    });

    await context.test('V1-11: scope readings ditegakkan tanpa endpoint Minggu 3', async () => {
      const noReadings = await createKey(user, 'test', ['devices:read']);
      const hasReadings = await createKey(user, 'test', ['readings:read']);
      const device = await fixtureDevice(true, userId);
      const denied = await request('GET', '/api/v1/devices/' + device.id + '/latest', undefined, undefined, { authorization: 'Bearer ' + noReadings.value.secret });
      assert.equal(denied.statusCode, 403, denied.body);
      assert.equal(denied.json().error.code, 'FORBIDDEN_SCOPE');
      const latest = await request('GET', '/api/v1/devices/' + device.id + '/latest', undefined, undefined, { authorization: 'Bearer ' + hasReadings.value.secret });
      assert.equal(latest.statusCode, 200, latest.body);
      assert.equal(latest.json().measuredAt, null);
      assert.equal(latest.json().readings[0].state, 'unknown');
    });

    await context.test('V1-12: key yang dicabut ditolak sebagai UNAUTHENTICATED', async () => {
      const created = await createKey(user, 'test', ['devices:read']);
      assert.equal(created.response.statusCode, 201, created.response.body);
      const deleted = await request('DELETE', '/api/v1/keys/' + created.value.key.id, user);
      assert.equal(deleted.statusCode, 204, deleted.body);
      const revoked = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + created.value.secret });
      assert.equal(revoked.statusCode, 401, revoked.body);
      assert.equal(revoked.json().error.code, 'UNAUTHENTICATED');
    });

    await context.test('Tambahan: key tidak dikenal atau format key tidak valid ditolak', async () => {
      const unknown = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer jf_test_' + 'a'.repeat(64) });
      assert.equal(unknown.statusCode, 401, unknown.body);
      assert.equal(unknown.json().error.code, 'UNAUTHENTICATED');
      const malformed = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer jf_test_not-a-key' });
      assert.equal(malformed.statusCode, 401, malformed.body);
      const validKey = await createKey(user, 'test', ['devices:read']);
      assert.equal(validKey.response.statusCode, 201, validKey.response.body);
      const secretWithMatchingPrefix = validKey.value.secret;
      const finalHex = secretWithMatchingPrefix.at(-1) === '0' ? '1' : '0';
      const wrongDigestSamePrefix = secretWithMatchingPrefix.slice(0, -1) + finalHex;
      assert.equal(wrongDigestSamePrefix.slice(0, 12), secretWithMatchingPrefix.slice(0, 12));
      const prefixMatchButWrongDigest = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + wrongDigestSamePrefix });
      assert.equal(prefixMatchButWrongDigest.statusCode, 401, prefixMatchButWrongDigest.body);
      assert.equal(prefixMatchButWrongDigest.json().error.code, 'UNAUTHENTICATED');
    });

    await context.test('Minggu 2: 20 kegagalan autentikasi API key mengunci IP selama satu jendela', async () => {
      const revokedKey = await createKey(user, 'test', ['devices:read']);
      assert.equal(revokedKey.response.statusCode, 201, revokedKey.response.body);
      const revoked = await request('DELETE', '/api/v1/keys/' + revokedKey.value.key.id, user);
      assert.equal(revoked.statusCode, 204, revoked.body);

      const activeKey = await createKey(user, 'test', ['devices:read']);
      assert.equal(activeKey.response.statusCode, 201, activeKey.response.body);
      const ip = '192.0.2.20';
      const malformed = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer jf_test_not-a-key' }, ip);
      assert.equal(malformed.statusCode, 401, malformed.body);
      const cookieSession = await request('GET', '/api/v1/devices', user, undefined, {}, ip);
      assert.equal(cookieSession.statusCode, 200, cookieSession.body);

      const wrongKey = 'jf_test_' + 'a'.repeat(64);
      for (let attempt = 0; attempt < 19; attempt++) {
        const response = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + wrongKey }, ip);
        assert.equal(response.statusCode, 401, response.body);
        assert.equal(response.json().error.code, 'UNAUTHENTICATED');
      }

      const validBeforeThreshold = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + activeKey.value.secret }, ip);
      assert.equal(validBeforeThreshold.statusCode, 200, validBeforeThreshold.body);

      const twentiethFailure = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + revokedKey.value.secret }, ip);
      assert.equal(twentiethFailure.statusCode, 401, twentiethFailure.body);
      assert.equal(twentiethFailure.json().error.code, 'UNAUTHENTICATED');

      const mixed = await request('GET', '/api/v1/devices', user, undefined, { authorization: 'Bearer ' + activeKey.value.secret }, ip);
      assert.equal(mixed.statusCode, 400, mixed.body);
      assert.equal(mixed.json().error.code, 'AMBIGUOUS_AUTH');

      const locked = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + activeKey.value.secret }, ip);
      assert.equal(locked.statusCode, 429, locked.body);
      assert.equal(locked.json().error.code, 'RATE_LIMITED');
      assert.equal(locked.headers['x-ratelimit-limit'], '20');
      assert.equal(locked.headers['x-ratelimit-remaining'], '0');
      assert.ok(locked.headers['x-ratelimit-reset']);
      assert.ok(locked.headers['retry-after']);
      const separateIp = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + activeKey.value.secret }, '192.0.2.21');
      assert.equal(separateIp.statusCode, 200, separateIp.body);
    });

    await context.test('Tambahan: filter daftar, detail, dan ownership actor', async () => {
      const sandboxOwned = await fixtureDevice(true, userId);
      const sandboxOther = await fixtureDevice(true, otherUserId);
      const liveOwned = await fixtureDevice(false, userId);
      const testKey = await createKey(user, 'test', ['devices:read']);
      const liveKey = await createKey(admin, 'live', ['devices:read', 'admin']);
      const testList = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + testKey.value.secret });
      assert.equal(testList.statusCode, 200, testList.body);
      const ownedSandboxIds = (await pool.query(
        `SELECT d.id FROM devices d JOIN ownerships o ON o.device_id=d.id
         WHERE d.is_sandbox=true AND o.user_id=$1 AND o.ended_at IS NULL ORDER BY d.code,d.id`,
        [userId],
      )).rows.map(row => row.id);
      assert.deepEqual(testList.json().devices.map((device: { id: string }) => device.id), ownedSandboxIds);
      assert.equal(testList.json().devices.some((device: { id: string }) => device.id === liveOwned.id || device.id === sandboxOther.id), false);
      const readOnlyAdminKey = await createKey(admin, 'live', ['devices:read']);
      const readOnlyAdminList = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + readOnlyAdminKey.value.secret });
      assert.equal(readOnlyAdminList.statusCode, 200, readOnlyAdminList.body);
      assert.deepEqual(readOnlyAdminList.json().devices, []);
      const liveList = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + liveKey.value.secret });
      assert.equal(liveList.statusCode, 200, liveList.body);
      const liveIds = (await pool.query('SELECT id FROM devices WHERE is_sandbox=false ORDER BY code,id')).rows.map(row => row.id);
      assert.deepEqual(liveList.json().devices.map((device: { id: string }) => device.id), liveIds);
      const testDetail = await request('GET', '/api/v1/devices/' + sandboxOwned.id, undefined, undefined, { authorization: 'Bearer ' + testKey.value.secret });
      assert.equal(testDetail.statusCode, 200, testDetail.body);
      for (const id of [liveOwned.id, sandboxOther.id]) {
        const hidden = await request('GET', '/api/v1/devices/' + id, undefined, undefined, { authorization: 'Bearer ' + testKey.value.secret });
        assert.equal(hidden.statusCode, 404, hidden.body);
        assert.equal(hidden.json().error.code, 'NOT_FOUND');
      }
      const liveHidden = await request('GET', '/api/v1/devices/' + sandboxOwned.id, undefined, undefined, { authorization: 'Bearer ' + liveKey.value.secret });
      assert.equal(liveHidden.statusCode, 404, liveHidden.body);
    });

    await context.test('V1-13: cookie dan API key sekaligus ditolak', async () => {
      const key = await createKey(user, 'test', ['devices:read']);
      assert.equal(key.response.statusCode, 201, key.response.body);
      const mixed = await app!.inject({
        method: 'GET', url: '/api/v1/devices',
        headers: { cookie: user, authorization: 'Bearer ' + key.value.secret },
      });
      assert.equal(mixed.statusCode, 400, mixed.body);
      assert.equal(mixed.json().error.code, 'AMBIGUOUS_AUTH');
    });

    await context.test('V1-14: klaim sandbox dengan key test tanpa Origin ditolak sebagai resource tersembunyi', async () => {
      const activation = secret();
      const claimable = await fixtureDevice(true, userId, { activationCode: activation });
      const writeKey = await createKey(user, 'test', ['devices:write']);
      const keyClaim = await request('POST', '/api/v1/devices/claim', undefined, { code: claimable.code, activationCode: activation }, { authorization: 'Bearer ' + writeKey.value.secret });
      assert.equal(keyClaim.statusCode, 404);
      assert.equal(keyClaim.json().error.code, 'NOT_FOUND');
    });

    await context.test('V1-15: POST ber-cookie dengan Origin asing ditolak', async () => {
      const foreignActivation = secret();
      const foreignClaim = await fixtureDevice(true, userId, { activationCode: foreignActivation });
      const rejected = await request(
        'POST', '/api/v1/devices/claim', user,
        { code: foreignClaim.code, activationCode: foreignActivation },
        { origin: 'https://evil.example.test' },
      );
      assert.equal(rejected.statusCode, 403, rejected.body);
      assert.equal(rejected.json().error.code, 'ORIGIN_REJECTED');
    });

    await context.test('V1-16: key live melewati 60 request per menit dengan 429 dan header limit', async () => {
      const key = await createKey(admin, 'live', ['devices:read', 'admin'], 'Key live limit V1-16');
      assert.equal(key.response.statusCode, 201, key.response.body);
      const headers = { authorization: 'Bearer ' + key.value.secret };
      const responses = [await request('GET', '/api/v1/devices', undefined, undefined, headers)];
      for (let index = 0; index < 60; index++) {
        responses.push(await request('GET', '/api/v1/devices', undefined, undefined, headers));
      }
      assert.equal(responses.slice(0, 60).every(response => response.statusCode === 200), true);
      const limited = responses[60];
      assert.equal(limited.statusCode, 429, limited.body);
      assert.equal(limited.json().error.code, 'RATE_LIMITED');
      assert.equal(limited.headers['x-ratelimit-limit'], '60');
      assert.equal(limited.headers['x-ratelimit-remaining'], '0');
      for (const header of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
        assert.ok(limited.headers[header], header);
      }
      assert.ok(limited.headers['retry-after']);
    });

    await context.test('Tambahan: limit key test 30 request dan usage mencatat hit 429', async () => {
      const testKey = await createKey(user, 'test', ['devices:read']);
      const first = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + testKey.value.secret });
      assert.equal(first.statusCode, 200, first.body);
      assert.equal(first.headers['x-ratelimit-limit'], '30');
      assert.ok(first.headers['x-ratelimit-remaining'] !== undefined);
      assert.ok(first.headers['x-ratelimit-reset'] !== undefined);
      let limited;
      for (let index = 1; index < 31; index++) {
        limited = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + testKey.value.secret });
      }
      assert.equal(limited!.statusCode, 429, limited!.body);
      assert.equal(limited!.json().error.code, 'RATE_LIMITED');
      assert.equal(limited!.headers['x-ratelimit-limit'], '30');
      assert.equal(limited!.headers['x-ratelimit-remaining'], '0');
      assert.ok(limited!.headers['retry-after']);
      let usageRows = 0;
      for (let attempt = 0; attempt < 100 && usageRows < 31; attempt++) {
        usageRows = Number((await pool.query('SELECT count(*) FROM api_usage WHERE key_id=$1', [testKey.value.key.id])).rows[0].count);
        if (usageRows < 31) await new Promise(resolve => setTimeout(resolve, 5));
      }
      assert.equal(usageRows, 31);
      const usage = await request('GET', `/api/v1/keys/${testKey.value.key.id}/usage`, user);
      assert.equal(usage.statusCode, 200, usage.body);
      assert.equal(usage.json().usage.totalRequests, 31);
      assert.equal(usage.json().usage.rateLimitedRequests, 1);
    });

    await context.test('V1-17: activation code kedaluwarsa menghasilkan VALIDATION_FAILED', async () => {
      const activation = secret();
      const device = await fixtureDevice(false, userId, { activationCode: activation });
      await pool.query("UPDATE devices SET activation_expires=now()-interval '1 second' WHERE id=$1", [device.id]);
      const response = await request('POST', '/api/v1/devices/claim', user, { code: device.code, activationCode: activation });
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('V1-18: dua akun mengklaim device live tanpa allocated_to secara bersamaan', async () => {
      const activation = secret();
      const device = await fixtureDevice(false, null, { activationCode: activation });
      const unallocated = await pool.query('SELECT allocated_to FROM devices WHERE id=$1', [device.id]);
      assert.equal(unallocated.rows[0].allocated_to, null);
      const claims = await Promise.all([
        request('POST', '/api/v1/devices/claim', user, { code: device.code, activationCode: activation }),
        request('POST', '/api/v1/devices/claim', otherUser, { code: device.code, activationCode: activation }),
      ]);
      assert.deepEqual(claims.map(response => response.statusCode).sort(), [200, 409]);
      const ownerships = await pool.query('SELECT user_id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [device.id]);
      assert.equal(ownerships.rowCount, 1);
      assert.ok([userId, otherUserId].includes(ownerships.rows[0].user_id));
    });

    await context.test('Tambahan: usage per route, last-used, dan endpoint key khusus sesi', async () => {
      const key = await createKey(user, 'test', ['devices:read']);
      const ok = await request('GET', '/api/v1/devices', undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      const missing = await request('GET', '/api/v1/devices/' + randomUUID(), undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      assert.equal(ok.statusCode, 200, ok.body);
      assert.equal(missing.statusCode, 404, missing.body);
      const keyOnly = await request('GET', '/api/v1/keys', undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      assert.equal(keyOnly.statusCode, 401, keyOnly.body);
      assert.equal(keyOnly.json().error.code, 'UNAUTHENTICATED');

      let usageRows = 0;
      for (let attempt = 0; attempt < 100 && usageRows < 3; attempt++) {
        usageRows = Number((await pool.query('SELECT count(*) FROM api_usage WHERE key_id=$1', [key.value.key.id])).rows[0].count);
        if (usageRows < 3) await new Promise(resolve => setTimeout(resolve, 5));
      }
      assert.equal(usageRows, 3);
      const usage = await request('GET', `/api/v1/keys/${key.value.key.id}/usage?days=7`, user);
      assert.equal(usage.statusCode, 200, usage.body);
      assert.equal(usage.json().usage.totalRequests, 3);
      assert.equal(usage.json().usage.errorPercent, 66.67);
      assert.equal(usage.json().usage.rateLimitedRequests, 0);
      assert.deepEqual(usage.json().usage.topRoutes.map((item: { route: string }) => item.route).sort(), ['/api/v1/devices', '/api/v1/devices/:id', '/api/v1/keys']);
      assert.ok(usage.json().usage.daily.length > 0);
      const lastUsed = (await pool.query('SELECT last_used_at FROM api_keys WHERE id=$1', [key.value.key.id])).rows[0].last_used_at;
      assert.ok(lastUsed);

      const cannotCreate = await request('POST', '/api/v1/keys', undefined, { name: 'Kunci lain', environment: 'test', scopes: ['devices:read'] }, { authorization: 'Bearer ' + key.value.secret });
      const cannotRevoke = await request('DELETE', '/api/v1/keys/' + key.value.key.id, undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      const cannotReadUsage = await request('GET', '/api/v1/keys/' + key.value.key.id + '/usage', undefined, undefined, { authorization: 'Bearer ' + key.value.secret });
      for (const denied of [cannotCreate, cannotRevoke, cannotReadUsage]) {
        assert.equal(denied.statusCode, 401, denied.body);
        assert.equal(denied.json().error.code, 'UNAUTHENTICATED');
      }
    });
  } finally {
    await app?.close();
    await pool.end();
    await control.query('DROP SCHEMA ' + schema + ' CASCADE');
    await control.end();
  }
});

test('V1 ingest validates v2 readings and continues accepting pilot v1', async context => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = 'v1_ingest_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 5 });
  const origin = 'http://localhost:5173';
  const password = 'Farm-ingest-v2-test';
  const adminId = randomUUID();
  const userId = randomUUID();
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    await migrate(pool);
    const encodedPassword = await passwordHash(password);
    await pool.query("INSERT INTO users(id,email,password_hash,role) VALUES ($1,'admin-ingest@example.test',$2,'admin'),($3,'user-ingest@example.test',$2,'user')", [adminId, encodedPassword, userId]);
    app = await buildApp({ pool, origin, sendInvite: async () => undefined });
    const login = async (email: string) => {
      const response = await app!.inject({ method: 'POST', url: '/api/session/login', headers: { origin }, payload: { email, password } });
      assert.equal(response.statusCode, 200, response.body);
      return String(response.headers['set-cookie']).split(';')[0];
    };
    const admin = await login('admin-ingest@example.test');
    const user = await login('user-ingest@example.test');
    const createAndClaim = async (typeCode: string, name: string) => {
      const created = await app!.inject({
        method: 'POST', url: '/api/v1/devices', headers: { origin, cookie: admin },
        payload: { typeCode, name, areaRef: null, allocatedTo: null },
      });
      assert.equal(created.statusCode, 201, created.body);
      const value = created.json();
      const claim = await app!.inject({
        method: 'POST', url: '/api/v1/devices/claim', headers: { origin, cookie: user },
        payload: { code: value.device.code, activationCode: value.activationCode },
      });
      assert.equal(claim.statusCode, 200, claim.body);
      await pool.query("UPDATE devices SET credential_since=now()-interval '1 minute' WHERE id=$1", [value.device.id]);
      await pool.query("UPDATE ownerships SET started_at=now()-interval '1 minute' WHERE device_id=$1 AND ended_at IS NULL", [value.device.id]);
      return value;
    };
    const ingest = (payload: object, credential: string) => app!.inject({
      method: 'POST', url: '/api/ingest', headers: { authorization: 'Bearer ' + credential }, payload,
    });

    await context.test('A2 accepts exact firmware v2 payloads for all registered sensor types after buffering', async () => {
      const firmwarePayloads = [
        { type: 'AQ-PH', readings: { ph: 7.12 } },
        { type: 'AQ-TMP', readings: { water_temperature: 26.4 } },
        { type: 'AQ-TDS', readings: { tds: 612 } },
        { type: 'AQ-WATER-01', readings: { ph: 7.12, tds: 612, water_temperature: 26.4 } },
      ];
      // Firmware menyimpan RSSI saat sampel diukur. Sampel yang diambil ketika Wi-Fi putus tidak membawa rssi.
      const samples = [
        { label: 'online', ageMinutes: 1, meta: { rssi: -61, fw: '0.4.0' } },
        { label: 'buffered offline', ageMinutes: 30, meta: { fw: '0.4.0' } },
      ];

      for (const { type, readings } of firmwarePayloads) {
        const device = await createAndClaim(type, `Firmware v2 ${type}`);
        await pool.query("UPDATE devices SET credential_since=now()-interval '32 minutes' WHERE id=$1", [device.device.id]);
        await pool.query("UPDATE ownerships SET started_at=now()-interval '32 minutes' WHERE device_id=$1 AND ended_at IS NULL", [device.device.id]);

        for (const sample of samples) {
          const message = {
            version: 2,
            deviceId: device.device.id,
            type,
            messageId: randomUUID(),
            measuredAt: new Date(Date.now() - sample.ageMinutes * 60 * 1000).toISOString(),
            readings,
            meta: sample.meta,
          };
          assert.match(message.measuredAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

          const accepted = await ingest(message, device.credential);
          assert.equal(accepted.statusCode, 200, `${type} ${sample.label}: ${accepted.body}`);
          assert.deepEqual(accepted.json(), { accepted: true, duplicate: false });

          // Retry setelah balasan hilang: record yang sama dikirim ulang byte demi byte.
          const retry = await ingest(message, device.credential);
          assert.equal(retry.statusCode, 200, `${type} ${sample.label} retry: ${retry.body}`);
          assert.deepEqual(retry.json(), { accepted: true, duplicate: true });

          const saved = await pool.query(
            'SELECT readings,ingest_version,ingest_type,ingest_meta FROM readings WHERE device_id=$1 AND message_id=$2',
            [device.device.id, message.messageId],
          );
          assert.equal(saved.rowCount, 1);
          assert.deepEqual(saved.rows[0], {
            readings,
            ingest_version: 2,
            ingest_type: type,
            ingest_meta: sample.meta,
          });
        }
      }
    });

    await context.test('V1-05 accepts a one-sensor v2 device and retries idempotently', async () => {
      const device = await createAndClaim('AQ-PH', 'Sensor pH ingest');
      const message = {
        version: 2, deviceId: device.device.id, type: 'AQ-PH', messageId: randomUUID(),
        measuredAt: new Date().toISOString(), readings: { ph: 7.12 }, meta: { rssi: -51, fw: '0.4.0' },
      };
      const accepted = await ingest(message, device.credential);
      assert.equal(accepted.statusCode, 200, accepted.body);
      assert.deepEqual(accepted.json(), { accepted: true, duplicate: false });
      const duplicate = await ingest(message, device.credential);
      assert.deepEqual(duplicate.json(), { accepted: true, duplicate: true });
      const changedMeta = await ingest({ ...message, meta: { rssi: -50, fw: '0.4.0' } }, device.credential);
      assert.equal(changedMeta.statusCode, 409, changedMeta.body);
      assert.equal(changedMeta.json().error.code, 'CONFLICT');
      const saved = await pool.query('SELECT readings,ingest_version,ingest_type,ingest_meta FROM readings WHERE device_id=$1 AND message_id=$2', [device.device.id, message.messageId]);
      assert.equal(saved.rowCount, 1);
      assert.deepEqual(saved.rows[0].readings, { ph: 7.12 });
      assert.equal(saved.rows[0].ingest_version, 2);
      assert.equal(saved.rows[0].ingest_type, 'AQ-PH');
      assert.deepEqual(saved.rows[0].ingest_meta, { rssi: -51, fw: '0.4.0' });
      const health = await pool.query('SELECT last_rssi,firmware FROM devices WHERE id=$1', [device.device.id]);
      assert.equal(health.rows[0].last_rssi, -51);
      assert.equal(health.rows[0].firmware, '0.4.0');
    });

    await context.test('V1-06 rejects missing or extra package sensors', async () => {
      const device = await createAndClaim('AQ-WATER-01', 'Paket ingest');
      const common = {
        version: 2, deviceId: device.device.id, type: 'AQ-WATER-01', messageId: randomUUID(),
        measuredAt: new Date().toISOString(), readings: { ph: 7, tds: 600, water_temperature: 26 },
      };
      const missing = await ingest({ ...common, readings: { ph: 7, tds: 600 } }, device.credential);
      assert.equal(missing.statusCode, 400, missing.body);
      assert.equal(missing.json().error.code, 'VALIDATION_FAILED');
      const extra = await ingest({ ...common, messageId: randomUUID(), readings: { ...common.readings, humidity: 70 } }, device.credential);
      assert.equal(extra.statusCode, 400, extra.body);
      assert.equal(extra.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('V1-07 rejects a v2 type that differs from the registered device type', async () => {
      const device = await createAndClaim('AQ-PH', 'Sensor tipe ingest');
      const response = await ingest({
        version: 2, deviceId: device.device.id, type: 'AQ-TDS', messageId: randomUUID(),
        measuredAt: new Date().toISOString(), readings: { tds: 600 },
      }, device.credential);
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(response.json().error.code, 'VALIDATION_FAILED');
    });

    await context.test('V1-08 still accepts pilot v1 payloads', async () => {
      const created = await app!.inject({
        method: 'POST', url: '/api/admin/devices', headers: { origin, cookie: admin },
        payload: { userId, name: 'Pilot v1 air', model: 'water-v1' },
      });
      assert.equal(created.statusCode, 200, created.body);
      const device = created.json();
      const paired = await app!.inject({
        method: 'POST', url: '/api/devices/pair', headers: { origin, cookie: user },
        payload: { code: device.activationCode },
      });
      assert.equal(paired.statusCode, 200, paired.body);
      await pool.query("UPDATE devices SET credential_since=now()-interval '1 minute' WHERE id=$1", [device.deviceId]);
      await pool.query("UPDATE ownerships SET started_at=now()-interval '1 minute' WHERE device_id=$1 AND ended_at IS NULL", [device.deviceId]);
      const message = {
        version: 1, deviceId: device.deviceId, model: 'water-v1', messageId: randomUUID(), measuredAt: new Date().toISOString(),
        readings: { water_temperature: 27, ph: 7, ec: 1.2 },
      };
      const accepted = await ingest(message, device.credential);
      assert.equal(accepted.statusCode, 200, accepted.body);
      assert.deepEqual(accepted.json(), { accepted: true, duplicate: false });
      const saved = await pool.query('SELECT ingest_version,ingest_type,ingest_meta FROM readings WHERE device_id=$1 AND message_id=$2', [device.deviceId, message.messageId]);
      assert.deepEqual(saved.rows[0], { ingest_version: 1, ingest_type: 'water-v1', ingest_meta: {} });
    });
  } finally {
    await app?.close();
    await pool.end();
    await control.query('DROP SCHEMA ' + schema + ' CASCADE');
    await control.end();
  }
});

test('V1 readings, ambang, kejadian, dan deteksi offline memakai PostgreSQL', async context => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const control = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = 'v1_monitoring_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: '-c search_path=' + schema, max: 8 });
  const origin = 'http://localhost:5173';
  const password = 'Farm-monitoring-integration-test';
  const adminId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  let adminCookie = '';
  let userCookie = '';
  let otherCookie = '';
  let thresholdDeviceId = '';
  let thresholdDeviceCredential = '';
  const heartbeatTimers: Array<{ callback: () => void; delayMs: number; cancelled: boolean }> = [];
  const streamClock: StreamClock = {
    every(callback, delayMs) {
      const timer = { callback, delayMs, cancelled: false };
      heartbeatTimers.push(timer);
      return () => { timer.cancelled = true; };
    },
  };
  const streamHub = new StreamHub(pool, { clock: streamClock });

  try {
    await migrate(pool);
    const encodedPassword = await passwordHash(password);
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role) VALUES ($1,'admin-monitoring@example.test',$2,'admin'),($3,'user-monitoring@example.test',$2,'user'),($4,'other-monitoring@example.test',$2,'user')",
      [adminId, encodedPassword, userId, otherUserId],
    );
    app = await buildApp({ pool, origin, sendInvite: async () => undefined, enableOfflineDetection: false, streamHub });

    const login = async (email: string) => {
      const response = await app!.inject({ method: 'POST', url: '/api/session/login', headers: { origin }, payload: { email, password } });
      assert.equal(response.statusCode, 200, response.body);
      return String(response.headers['set-cookie']).split(';')[0];
    };
    adminCookie = await login('admin-monitoring@example.test');
    userCookie = await login('user-monitoring@example.test');
    otherCookie = await login('other-monitoring@example.test');
    const request = (method: 'GET' | 'POST' | 'PUT', url: string, cookie?: string, payload?: object) => app!.inject({
      method,
      url,
      headers: { ...(cookie ? { cookie } : {}), ...(cookie && method !== 'GET' ? { origin } : {}) },
      payload,
    });
    const createAndClaim = async (areaRef: string | null = 'AR-01', ownerCookie = userCookie) => {
      const created = await request('POST', '/api/v1/devices', adminCookie, {
        typeCode: 'AQ-PH', name: 'Sensor monitoring ' + randomUUID().slice(0, 8), areaRef, allocatedTo: null,
      });
      assert.equal(created.statusCode, 201, created.body);
      const value = created.json();
      const claim = await request('POST', '/api/v1/devices/claim', ownerCookie, {
        code: value.device.code, activationCode: value.activationCode,
      });
      assert.equal(claim.statusCode, 200, claim.body);
      await pool.query("UPDATE devices SET credential_since=clock_timestamp()-interval '1 hour' WHERE id=$1", [value.device.id]);
      await pool.query("UPDATE ownerships SET started_at=clock_timestamp()-interval '1 hour' WHERE device_id=$1 AND ended_at IS NULL", [value.device.id]);
      const ownershipId = (await pool.query('SELECT id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [value.device.id])).rows[0].id;
      return { id: value.device.id as string, code: value.device.code as string, credential: value.credential as string, ownershipId: ownershipId as string };
    };
    const ingestV2 = (device: { id: string; credential: string }, value: number, messageId = randomUUID(), measuredAt = new Date().toISOString()) => app!.inject({
      method: 'POST',
      url: '/api/ingest',
      headers: { authorization: 'Bearer ' + device.credential },
      payload: { version: 2, deviceId: device.id, type: 'AQ-PH', messageId, measuredAt, readings: { ph: value } },
    });
    const assertV1Error = (response: { statusCode: number; body: string; json: () => any }, status: number, code: string) => {
      assert.equal(response.statusCode, status, response.body);
      assert.equal(response.json().error.code, code);
    };

    await context.test('V1-19: transisi ambang tetap tunggal pada ingest v1 dan v2', async () => {
      const device = await createAndClaim();
      thresholdDeviceId = device.id;
      thresholdDeviceCredential = device.credential;
      const firstTime = new Date().toISOString();
      const firstId = randomUUID();
      const low = await ingestV2(device, 6.1, firstId, firstTime);
      assert.deepEqual(low.json(), { accepted: true, duplicate: false });
      const retry = await ingestV2(device, 6.1, firstId, firstTime);
      assert.deepEqual(retry.json(), { accepted: true, duplicate: true });
      assert.deepEqual((await pool.query('SELECT type FROM device_events WHERE device_id=$1 ORDER BY id', [device.id])).rows.map(row => row.type), ['threshold_low']);
      const repeatedLow = await ingestV2(device, 6.0);
      assert.deepEqual(repeatedLow.json(), { accepted: true, duplicate: false });
      const normal = await ingestV2(device, 7.0);
      assert.deepEqual(normal.json(), { accepted: true, duplicate: false });
      assert.deepEqual((await pool.query('SELECT type,sensor_code FROM device_events WHERE device_id=$1 ORDER BY id', [device.id])).rows, [
        { type: 'threshold_low', sensor_code: 'ph' },
        { type: 'threshold_clear', sensor_code: 'ph' },
      ]);
      const filteredEvents = await request('GET', `/api/v1/events?deviceId=${device.id}&type=threshold_low&limit=1`, userCookie);
      assert.equal(filteredEvents.statusCode, 200, filteredEvents.body);
      assert.equal(filteredEvents.json().events.length, 1);
      assert.equal(filteredEvents.json().events[0].type, 'threshold_low');
      assert.equal(filteredEvents.json().events[0].sensor, 'ph');

      const legacy = await app!.inject({
        method: 'POST', url: '/api/admin/devices', headers: { cookie: adminCookie, origin },
        payload: { userId, name: 'Pilot air untuk transisi ambang', model: 'water-v1' },
      });
      assert.equal(legacy.statusCode, 200, legacy.body);
      const pilot = legacy.json();
      const paired = await app!.inject({ method: 'POST', url: '/api/devices/pair', headers: { cookie: userCookie, origin }, payload: { code: pilot.activationCode } });
      assert.equal(paired.statusCode, 200, paired.body);
      await pool.query("UPDATE devices SET credential_since=clock_timestamp()-interval '1 hour' WHERE id=$1", [pilot.deviceId]);
      await pool.query("UPDATE ownerships SET started_at=clock_timestamp()-interval '1 hour' WHERE device_id=$1 AND ended_at IS NULL", [pilot.deviceId]);
      const legacyPayload = (ph: number, messageId: string) => ({
        version: 1, deviceId: pilot.deviceId, model: 'water-v1', messageId, measuredAt: new Date().toISOString(),
        readings: { water_temperature: 26, ph, ec: 1.2 },
      });
      const legacyLow = legacyPayload(6.1, randomUUID());
      assert.deepEqual((await app!.inject({ method: 'POST', url: '/api/ingest', headers: { authorization: 'Bearer ' + pilot.credential }, payload: legacyLow })).json(), { accepted: true, duplicate: false });
      assert.deepEqual((await app!.inject({ method: 'POST', url: '/api/ingest', headers: { authorization: 'Bearer ' + pilot.credential }, payload: legacyPayload(6.0, randomUUID()) })).json(), { accepted: true, duplicate: false });
      assert.deepEqual((await app!.inject({ method: 'POST', url: '/api/ingest', headers: { authorization: 'Bearer ' + pilot.credential }, payload: legacyPayload(7.0, randomUUID()) })).json(), { accepted: true, duplicate: false });
      assert.deepEqual((await pool.query('SELECT type,sensor_code FROM device_events WHERE device_id=$1 ORDER BY id', [pilot.deviceId])).rows, [
        { type: 'threshold_low', sensor_code: 'ph' },
        { type: 'threshold_clear', sensor_code: 'ph' },
      ]);
    });

    await context.test('GET events memakai cursor, filter, ownership, dan environment key', async () => {
      const firstPage = await request('GET', `/api/v1/events?deviceId=${thresholdDeviceId}&limit=1`, userCookie);
      assert.equal(firstPage.statusCode, 200, firstPage.body);
      assert.equal(firstPage.json().events[0].type, 'threshold_clear');
      assert.ok(firstPage.json().nextCursor);
      const secondPage = await request('GET', `/api/v1/events?deviceId=${thresholdDeviceId}&limit=1&cursor=${encodeURIComponent(firstPage.json().nextCursor)}`, userCookie);
      assert.equal(secondPage.statusCode, 200, secondPage.body);
      assert.equal(secondPage.json().events[0].type, 'threshold_low');
      assert.equal(secondPage.json().nextCursor, null);

      const otherDevice = await createAndClaim('AR-OTHER', otherCookie);
      await pool.query("INSERT INTO device_events(device_id,type) VALUES($1,'offline')", [otherDevice.id]);
      const hiddenDeviceEvents = await request('GET', `/api/v1/events?deviceId=${otherDevice.id}`, userCookie);
      assertV1Error(hiddenDeviceEvents, 404, 'NOT_FOUND');
      const ownEvents = await request('GET', '/api/v1/events', userCookie);
      assert.equal(ownEvents.statusCode, 200, ownEvents.body);
      assert.equal(ownEvents.json().events.some((event: { deviceId: string }) => event.deviceId === otherDevice.id), false);

      const testKey = 'jf_test_' + secret();
      await pool.query(
        'INSERT INTO api_keys(id,user_id,name,prefix,key_hash,scopes,environment) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), userId, 'Key test kejadian', testKey.slice(0, 12), hash(testKey), ['readings:read'], 'test'],
      );
      const testEvents = await app!.inject({ method: 'GET', url: '/api/v1/events', headers: { authorization: 'Bearer ' + testKey } });
      assert.equal(testEvents.statusCode, 200, testEvents.body);
      assert.equal(testEvents.json().events.some((event: { deviceId: string }) => event.deviceId === thresholdDeviceId || event.deviceId === otherDevice.id), false);
    });

    await context.test('V1-23: SSE menjaga akses actor, replay ID event, tanpa ID reading, heartbeat terkendali, batas 5, dan cleanup peer/app.close', async () => {
      const unauthenticated = await app!.inject({ method: 'GET', url: '/api/v1/stream', headers: { accept: 'text/event-stream' } });
      assert.equal(unauthenticated.statusCode, 401, unauthenticated.body);
      const invalidReplay = await app!.inject({
        method: 'GET', url: '/api/v1/stream',
        headers: { accept: 'text/event-stream', cookie: userCookie, 'last-event-id': 'bukan-id' },
      });
      assert.equal(invalidReplay.statusCode, 400, invalidReplay.body);
      assert.equal(invalidReplay.json().error.code, 'VALIDATION_FAILED');

      const liveReplayDevice = await createAndClaim('AR-STREAM-LIVE');
      const livePublishDevice = await createAndClaim('AR-STREAM-PUBLISH');
      const otherDevice = await createAndClaim('AR-STREAM-OTHER', otherCookie);
      const typeId = (await pool.query("SELECT id FROM device_types WHERE code='AQ-PH'")).rows[0].id;
      const sandboxDeviceId = randomUUID();
      const sandboxCode = 'AQ-SBX-' + randomUUID().slice(0, 8).toUpperCase();
      await pool.query(
        `INSERT INTO devices(id,name,model,credential_hash,credential_since,allocated_to,code,type_id,area_ref,is_sandbox,sandbox_scenario)
         VALUES($1,'Device sandbox SSE',NULL,NULL,clock_timestamp()-interval '1 hour',$2,$3,$4,'AR-SBX',true,'normal')`,
        [sandboxDeviceId, userId, sandboxCode, typeId],
      );
      await pool.query(
        "INSERT INTO ownerships(id,device_id,user_id,started_at) VALUES($1,$2,$3,clock_timestamp()-interval '1 hour')",
        [randomUUID(), sandboxDeviceId, userId],
      );

      const replayBaseId = String((await pool.query('SELECT COALESCE(max(id),0)::text AS id FROM device_events')).rows[0].id);
      const eventTime = new Date().toISOString();
      const liveEventId = (await pool.query(
        `INSERT INTO device_events(device_id,type,sensor_code,value,at)
         VALUES($1,'threshold_low','ph',6.1,$2) RETURNING id::text AS id`,
        [liveReplayDevice.id, eventTime],
      )).rows[0].id as string;
      const sandboxEventId = (await pool.query(
        `INSERT INTO device_events(device_id,type,at)
         VALUES($1,'offline',$2) RETURNING id::text AS id`,
        [sandboxDeviceId, eventTime],
      )).rows[0].id as string;
      const otherEventId = (await pool.query(
        `INSERT INTO device_events(device_id,type,at)
         VALUES($1,'offline',$2) RETURNING id::text AS id`,
        [otherDevice.id, eventTime],
      )).rows[0].id as string;

      const sessionActor = await authenticateSession(pool, userCookie.slice('pilot_session='.length));
      const otherActor = await authenticateSession(pool, otherCookie.slice('pilot_session='.length));
      assert.ok(sessionActor);
      assert.ok(otherActor);
      const testKey = 'jf_test_' + secret();
      await pool.query(
        'INSERT INTO api_keys(id,user_id,name,prefix,key_hash,scopes,environment) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), userId, 'Key test SSE', testKey.slice(0, 12), hash(testKey), ['readings:read'], 'test'],
      );
      const parsedKey = parseApiKey('Bearer ' + testKey);
      assert.ok(parsedKey);
      const keyActor = await authenticateApiKey(pool, parsedKey);
      const sessionFrames: string[] = [];
      const keyFrames: string[] = [];
      const otherFrames: string[] = [];
      const resumedFrames: string[] = [];
      const sessionConnection = streamHub.subscribe(sessionActor, frame => { sessionFrames.push(frame); });
      const keyConnection = streamHub.subscribe(keyActor, frame => { keyFrames.push(frame); });
      const otherConnection = streamHub.subscribe(otherActor, frame => { otherFrames.push(frame); });
      assert.ok(sessionConnection);
      assert.ok(keyConnection);
      assert.ok(otherConnection);
      assert.equal(streamHub.connectionCount(userId), 2);

      await Promise.all([
        streamHub.replay(sessionConnection, replayBaseId),
        streamHub.replay(keyConnection, replayBaseId),
        streamHub.replay(otherConnection, replayBaseId),
      ]);
      const frameIds = (frames: string[]) => frames.filter(frame => frame.startsWith('id: ')).map(frame => frame.slice(4).split('\n', 1)[0]);
      assert.deepEqual(frameIds(sessionFrames), [liveEventId, sandboxEventId]);
      assert.deepEqual(frameIds(keyFrames), [sandboxEventId]);
      assert.deepEqual(frameIds(otherFrames), [otherEventId]);
      assert.equal(sessionFrames.every(frame => !frame.includes(`id: ${otherEventId}\n`)), true);

      const thirdConnection = streamHub.subscribe(sessionActor, () => {});
      assert.ok(thirdConnection);
      assert.equal(streamHub.connectionCount(userId), 3);
      const fourthConnection = streamHub.subscribe(keyActor, () => {});
      assert.ok(fourthConnection);
      const fifthConnection = streamHub.subscribe(sessionActor, () => {});
      assert.ok(fifthConnection);
      assert.equal(streamHub.connectionCount(userId), 5);
      const sixthConnection = streamHub.subscribe(keyActor, () => {});
      assert.equal(sixthConnection, null);
      const limited = await app!.inject({
        method: 'GET', url: '/api/v1/stream',
        headers: { accept: 'text/event-stream', cookie: userCookie },
      });
      assert.equal(limited.statusCode, 429, limited.body);
      assert.equal(limited.json().error.code, 'RATE_LIMITED');

      thirdConnection.close();
      const resumed = streamHub.subscribe(keyActor, frame => { resumedFrames.push(frame); });
      assert.ok(resumed);
      await streamHub.replay(resumed, liveEventId);
      assert.deepEqual(frameIds(resumedFrames), [sandboxEventId]);

      const sandboxReadOffset = keyFrames.length;
      await streamHub.publishReading(sandboxDeviceId, { measuredAt: eventTime, readings: { ph: 6.9 } });
      const sandboxReading = keyFrames.slice(sandboxReadOffset).find(frame => frame.includes('event: reading'));
      assert.ok(sandboxReading);
      assert.equal(sandboxReading.startsWith('id: '), false);
      const liveReadOffset = sessionFrames.length;
      const keyLiveOffset = keyFrames.length;
      const otherLiveOffset = otherFrames.length;
      const liveReadingTime = new Date().toISOString();
      const messageId = randomUUID();
      const ingested = await ingestV2(livePublishDevice, 6.0, messageId, liveReadingTime);
      assert.deepEqual(ingested.json(), { accepted: true, duplicate: false });
      const liveFrames = sessionFrames.slice(liveReadOffset);
      const readingFrame = liveFrames.find(frame => frame.includes('event: reading'));
      assert.ok(readingFrame);
      assert.equal(readingFrame.startsWith('id: '), false);
      const publishedThreshold = (await pool.query(
        "SELECT id::text AS id FROM device_events WHERE device_id=$1 AND type='threshold_low' ORDER BY id DESC LIMIT 1",
        [livePublishDevice.id],
      )).rows[0].id as string;
      assert.equal(liveFrames.some(frame => frame.startsWith(`id: ${publishedThreshold}\nevent: device_event`)), true);
      assert.equal(keyFrames.length, keyLiveOffset);
      assert.equal(otherFrames.length, otherLiveOffset);
      const deliveredCount = sessionFrames.length;
      const duplicate = await ingestV2(livePublishDevice, 6.0, messageId, liveReadingTime);
      assert.deepEqual(duplicate.json(), { accepted: true, duplicate: true });
      assert.equal(sessionFrames.length, deliveredCount);

      const heartbeat = heartbeatTimers.find(timer => !timer.cancelled);
      assert.ok(heartbeat);
      assert.equal(heartbeat.delayMs, HEARTBEAT_INTERVAL_MS);
      heartbeat.callback();
      assert.equal(sessionFrames.some(frame => frame === ': heartbeat\n\n'), true);

      for (const connection of [sessionConnection, keyConnection, otherConnection, fourthConnection, fifthConnection, resumed]) connection.close();
      assert.equal(streamHub.connectionCount(userId), 0);
      assert.equal(heartbeatTimers.some(timer => !timer.cancelled), false);

      const appCloseConnection = streamHub.subscribe(sessionActor, () => {});
      assert.ok(appCloseConnection);
      assert.equal(streamHub.connectionCount(userId), 1);
      await app!.close();
      assert.equal(streamHub.connectionCount(userId), 0);
      assert.equal(heartbeatTimers.some(timer => !timer.cancelled), false);
      app = await buildApp({ pool, origin, sendInvite: async () => undefined, enableOfflineDetection: false, streamHub });
    });

    await context.test('V1-19: pelanggaran tinggi dicatat sekali lalu dibersihkan', async () => {
      const device = { id: thresholdDeviceId, credential: thresholdDeviceCredential };
      assert.deepEqual((await ingestV2(device, 8.0)).json(), { accepted: true, duplicate: false });
      assert.deepEqual((await ingestV2(device, 7.0)).json(), { accepted: true, duplicate: false });
      assert.deepEqual((await pool.query('SELECT type,sensor_code FROM device_events WHERE device_id=$1 ORDER BY id', [device.id])).rows, [
        { type: 'threshold_low', sensor_code: 'ph' },
        { type: 'threshold_clear', sensor_code: 'ph' },
        { type: 'threshold_high', sensor_code: 'ph' },
        { type: 'threshold_clear', sensor_code: 'ph' },
      ]);
    });

    await context.test('V1-20: ambang area mengalahkan default dan null mengembalikan default', async () => {
      const device = await createAndClaim('AR-THRESHOLD');
      const setArea = await request('PUT', '/api/v1/areas/AR-THRESHOLD/thresholds', adminCookie, {
        thresholds: [{ sensor: 'ph', low: 6.5, high: 7.5 }],
      });
      assert.equal(setArea.statusCode, 200, setArea.body);
      const latestArea = await request('GET', '/api/v1/devices/' + device.id + '/latest', userCookie);
      assert.equal(latestArea.statusCode, 200, latestArea.body);
      assert.deepEqual(latestArea.json().readings[0].threshold, { low: 6.5, high: 7.5, source: 'area' });
      assert.equal(latestArea.json().readings[0].state, 'unknown');
      const overview = await request('GET', '/api/v1/sensors/ph/overview', userCookie);
      assert.equal(overview.statusCode, 200, overview.body);
      assert.equal(overview.json().items.find((item: { deviceId: string }) => item.deviceId === device.id).state, 'unknown');
      assert.deepEqual(overview.json().items.find((item: { deviceId: string }) => item.deviceId === device.id).threshold, { low: 6.5, high: 7.5, source: 'area' });

      const invalid = await request('PUT', '/api/v1/areas/AR-THRESHOLD/thresholds', adminCookie, {
        thresholds: [{ sensor: 'ph', low: 14.1, high: 15 }],
      });
      assertV1Error(invalid, 400, 'VALIDATION_FAILED');
      const invalidOrder = await request('PUT', '/api/v1/areas/AR-THRESHOLD/thresholds', adminCookie, {
        thresholds: [{ sensor: 'ph', low: 7.5, high: 7.0 }],
      });
      assertV1Error(invalidOrder, 400, 'VALIDATION_FAILED');
      const reset = await request('PUT', '/api/v1/areas/AR-THRESHOLD/thresholds', adminCookie, {
        thresholds: [{ sensor: 'ph', low: null, high: null }],
      });
      assert.equal(reset.statusCode, 200, reset.body);
      const latestDefault = await request('GET', '/api/v1/devices/' + device.id + '/latest', userCookie);
      assert.deepEqual(latestDefault.json().readings[0].threshold, { low: 6.2, high: 7.6, source: 'default' });
    });

    await context.test('reading buffer yang terlambat tidak menimpa latest atau state ambang', async () => {
      const device = await createAndClaim();
      const latestMeasuredAt = new Date(Date.now() - 60_000).toISOString();
      const newest = await ingestV2(device, 7.0, randomUUID(), latestMeasuredAt);
      assert.deepEqual(newest.json(), { accepted: true, duplicate: false });

      const lateMeasuredAt = new Date(Date.now() - 90_000).toISOString();
      assert.ok(Date.parse(lateMeasuredAt) < Date.parse(latestMeasuredAt));
      const late = await ingestV2(device, 6.0, randomUUID(), lateMeasuredAt);
      assert.deepEqual(late.json(), { accepted: true, duplicate: false });
      const latest = await request('GET', '/api/v1/devices/' + device.id + '/latest', userCookie);
      assert.equal(latest.statusCode, 200, latest.body);
      assert.equal(latest.json().measuredAt, latestMeasuredAt);
      assert.equal(latest.json().readings[0].value, 7.0);
      assert.equal(latest.json().readings[0].state, 'normal');
      assert.equal(Number((await pool.query('SELECT count(*) FROM device_events WHERE device_id=$1 AND sensor_code IS NOT NULL', [device.id])).rows[0].count), 0);

      const transitionAt = new Date().toISOString();
      const transition = await ingestV2(device, 6.0, randomUUID(), transitionAt);
      assert.deepEqual(transition.json(), { accepted: true, duplicate: false });
      const event = (await pool.query("SELECT type,at FROM device_events WHERE device_id=$1 AND type='threshold_low'", [device.id])).rows[0];
      assert.equal(event.type, 'threshold_low');
      assert.equal(new Date(event.at).toISOString(), transitionAt);
    });

    await context.test('V1-21: bucket 5m terurut dan raw memakai cursor maksimal 100 baris', async () => {
      const device = await createAndClaim();
      const endMs = Math.floor(Date.now() / 300_000) * 300_000;
      const startMs = endMs - 24 * 60 * 60 * 1000;
      const messageIds: string[] = [];
      const measuredAt: string[] = [];
      for (let index = 0; index < 288; index++) {
        messageIds.push(randomUUID());
        measuredAt.push(new Date(startMs + index * 300_000 + 1000).toISOString());
      }
      messageIds.push(randomUUID());
      measuredAt.push(new Date(startMs + 1000).toISOString());
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings,ingest_version,ingest_type,ingest_meta)
         SELECT $1,message_id,$2,measured_at,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb
         FROM unnest($3::uuid[],$4::timestamptz[]) AS sample(message_id,measured_at)`,
        [device.id, device.ownershipId, messageIds, measuredAt],
      );
      const from = new Date(startMs).toISOString();
      const to = new Date(endMs).toISOString();
      const aggregate = await request('GET', `/api/v1/devices/${device.id}/readings?sensor=ph&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&bucket=5m`, userCookie);
      assert.equal(aggregate.statusCode, 200, aggregate.body);
      const points = aggregate.json().points;
      assert.equal(points.length, 288);
      assert.equal(points[0].n, 2);
      assert.deepEqual(points.map((point: { t: string }) => point.t), [...points].map((point: { t: string }) => point.t).sort());
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [device.id, randomUUID(), device.ownershipId, new Date(endMs + 500).toISOString()],
      );
      const unalignedFrom = new Date(startMs + 1000).toISOString();
      const unalignedTo = new Date(endMs + 1000).toISOString();
      const unaligned = await request('GET', `/api/v1/devices/${device.id}/readings?sensor=ph&from=${encodeURIComponent(unalignedFrom)}&to=${encodeURIComponent(unalignedTo)}&bucket=5m`, userCookie);
      assert.equal(unaligned.statusCode, 200, unaligned.body);
      assert.equal(unaligned.json().points.length, 288);

      let cursor: string | null = null;
      const seen: string[] = [];
      for (let page = 0; page < 4; page++) {
        const query = new URLSearchParams({ sensor: 'ph', from, to, bucket: 'raw', limit: '100' });
        if (cursor) query.set('cursor', cursor);
        const response = await request('GET', `/api/v1/devices/${device.id}/readings?${query}`, userCookie);
        assert.equal(response.statusCode, 200, response.body);
        const body = response.json();
        assert.ok(body.points.length <= 100);
        seen.push(...body.points.map((point: { messageId: string }) => point.messageId));
        cursor = body.nextCursor;
        if (!cursor) break;
      }
      assert.equal(seen.length, 289);
      assert.equal(new Set(seen).size, 289);
    });

    await context.test('V1-22: rentang riwayat lebih dari 31 hari ditolak', async () => {
      const device = await createAndClaim();
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
      const response = await request('GET', `/api/v1/devices/${device.id}/readings?sensor=ph&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&bucket=5m`, userCookie);
      assertV1Error(response, 400, 'VALIDATION_FAILED');
    });

    await context.test('V1-24b: offline job publish ke SSE setelah commit saja; rollback tidak publish', async () => {
      const { runOfflineDetection } = await import('./v1/offline.js');
      const actor = await authenticateSession(pool, userCookie.slice('pilot_session='.length));
      assert.ok(actor);
      const frames: string[] = [];
      const connection = streamHub.subscribe(actor, frame => { frames.push(frame); });
      assert.ok(connection);
      await streamHub.replay(connection, null);

      const device = await createAndClaim();
      const now = Date.now();
      const staleAt = new Date(now - 181_000).toISOString();
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,received_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [device.id, randomUUID(), device.ownershipId, staleAt],
      );
      let publishCalls = 0;
      assert.equal(await runOfflineDetection(pool, now, async events => {
        publishCalls++;
        const committed = await pool.query('SELECT id FROM device_events WHERE id=ANY($1::bigint[])', [events.map(event => event.id)]);
        assert.equal(committed.rowCount, events.length);
        await streamHub.publishDeviceEvents(events);
      }), 1);
      assert.equal(publishCalls, 1);
      const offlineId = String((await pool.query("SELECT id FROM device_events WHERE device_id=$1 AND type='offline'", [device.id])).rows[0].id);
      assert.equal(frames.some(frame => frame.startsWith(`id: ${offlineId}\nevent: device_event`)), true);

      const rollbackDevice = await createAndClaim();
      const rollbackNow = Date.now();
      const rollbackStaleAt = new Date(rollbackNow - 181_000).toISOString();
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,received_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [rollbackDevice.id, randomUUID(), rollbackDevice.ownershipId, rollbackStaleAt],
      );
      await pool.query(`CREATE FUNCTION fail_offline_event_for_test() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'forced offline rollback'; END;
      $$`);
      await pool.query(`CREATE TRIGGER fail_specific_offline_event BEFORE INSERT ON device_events
        FOR EACH ROW WHEN (NEW.device_id='${rollbackDevice.id}'::uuid AND NEW.type='offline')
        EXECUTE FUNCTION fail_offline_event_for_test()`);
      const frameCountBeforeRollback = frames.length;
      let rollbackPublishCalls = 0;
      try {
        await assert.rejects(runOfflineDetection(pool, rollbackNow, async events => {
          rollbackPublishCalls++;
          await streamHub.publishDeviceEvents(events);
        }), /forced offline rollback/);
        assert.equal(rollbackPublishCalls, 0);
        assert.equal(Number((await pool.query("SELECT count(*) FROM device_events WHERE device_id=$1 AND type='offline'", [rollbackDevice.id])).rows[0].count), 0);
        assert.equal(frames.slice(frameCountBeforeRollback).some(frame => frame.includes(rollbackDevice.id)), false);
      } finally {
        await pool.query('DROP TRIGGER fail_specific_offline_event ON device_events');
        await pool.query('DROP FUNCTION fail_offline_event_for_test()');
      }
      await pool.query('DELETE FROM readings WHERE device_id=$1', [rollbackDevice.id]);
      connection.close();
      assert.equal(streamHub.connectionCount(userId), 0);
    });

    await context.test('V1-24: offline sekali, online saat pulih, tetap benar sesudah restart dan saat race', async () => {
      const { runOfflineDetection } = await import('./v1/offline.js');
      const device = await createAndClaim();
      const now = Date.now();
      const staleAt = new Date(now - 181_000).toISOString();
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,received_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [device.id, randomUUID(), device.ownershipId, staleAt],
      );
      assert.equal(await runOfflineDetection(pool, now), 1);
      assert.equal(await runOfflineDetection(pool, now + 60_000), 0);
      assert.equal(Number((await pool.query("SELECT count(*) FROM device_events WHERE device_id=$1 AND type='offline'", [device.id])).rows[0].count), 1);

      await app!.close();
      app = await buildApp({ pool, origin, sendInvite: async () => undefined, enableOfflineDetection: false, streamHub });
      assert.equal(await runOfflineDetection(pool, now + 120_000), 0);
      const measuredAt = new Date().toISOString();
      const messageId = randomUUID();
      const recovered = await ingestV2(device, 7.0, messageId, measuredAt);
      assert.deepEqual(recovered.json(), { accepted: true, duplicate: false });
      const recoveredRetry = await ingestV2(device, 7.0, messageId, measuredAt);
      assert.deepEqual(recoveredRetry.json(), { accepted: true, duplicate: true });
      assert.deepEqual((await pool.query("SELECT type FROM device_events WHERE device_id=$1 AND sensor_code IS NULL ORDER BY id", [device.id])).rows.map(row => row.type), ['offline', 'online']);

      const racingDevice = await createAndClaim();
      const raceNow = Date.now();
      const raceStaleAt = new Date(raceNow - 181_000).toISOString();
      await pool.query(
        `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,received_at,readings,ingest_version,ingest_type,ingest_meta)
         VALUES($1,$2,$3,$4,$4,'{"ph":7.0}'::jsonb,2,'AQ-PH','{}'::jsonb)`,
        [racingDevice.id, randomUUID(), racingDevice.ownershipId, raceStaleAt],
      );
      const raceMessageId = randomUUID();
      const raceTime = new Date(raceNow).toISOString();
      const [raceIngest, raceOfflineCount] = await Promise.all([
        ingestV2(racingDevice, 6.0, raceMessageId, raceTime),
        runOfflineDetection(pool, raceNow),
      ]);
      assert.deepEqual(raceIngest.json(), { accepted: true, duplicate: false });
      assert.ok(raceOfflineCount === 0 || raceOfflineCount === 1);
      const connection = await pool.query("SELECT type FROM device_events WHERE device_id=$1 AND sensor_code IS NULL ORDER BY id", [racingDevice.id]);
      const connectionTypes = connection.rows.map(row => row.type);
      if (raceOfflineCount === 0) assert.deepEqual(connectionTypes, []);
      else assert.deepEqual(connectionTypes, ['offline', 'online']);
      assert.equal(Number((await pool.query("SELECT count(*) FROM device_events WHERE device_id=$1 AND type='offline'", [racingDevice.id])).rows[0].count) <= 1, true);
      assert.deepEqual((await pool.query("SELECT type FROM device_events WHERE device_id=$1 AND sensor_code='ph' ORDER BY id", [racingDevice.id])).rows.map(row => row.type), ['threshold_low']);
    });
  } finally {
    await app?.close();
    await pool.end();
    await control.query('DROP SCHEMA ' + schema + ' CASCADE');
    await control.end();
  }
});
