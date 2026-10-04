import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { migrate } from './db.js';
import { buildApp } from './app.js';
import { passwordHash } from './domain.js';

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
      [1, 2],
    );

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
