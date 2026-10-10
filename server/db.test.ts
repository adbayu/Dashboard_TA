import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedDatabase } from './testDb.js';
import { migrate, migrationVersion, migrations, orderedMigrationFiles } from './db.js';

test('numbered migrations apply once in order and omit sample devices', async context => {
  const db = await isolatedDatabase();
  context.after(db.cleanup);
  const firstRun = await migrate(db.pool);
  const rerun = await migrate(db.pool);
  assert.deepEqual(firstRun, { applied: [1, 2], current: [1, 2] });
  assert.deepEqual(rerun, { applied: [], current: [1, 2] });
  const versions = await db.pool.query('SELECT version FROM schema_migrations ORDER BY version');
  assert.deepEqual(versions.rows.map(row => row.version), [1, 2]);
  const catalog = await db.pool.query("SELECT to_regclass('sensor_types') AS sensor_types");
  assert.equal(catalog.rows[0].sensor_types, 'sensor_types');
  const user = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users' AND column_name='password_hash'");
  assert.equal(user.rowCount, 1);
  const sensors = await db.pool.query('SELECT count(*)::int AS count FROM sensor_types');
  assert.equal(sensors.rows[0].count, 6);
  const mappings = await db.pool.query("SELECT code FROM device_types WHERE code LIKE 'PILOT-%' ORDER BY code");
  assert.deepEqual(mappings.rows.map(row => row.code), ['PILOT-ENV-V1', 'PILOT-WATER-V1']);
  const sampleDevices = await db.pool.query('SELECT count(*)::int AS count FROM devices');
  assert.equal(sampleDevices.rows[0].count, 0);
});

test('migration file ordering rejects duplicates, gaps and malformed names', () => {
  assert.deepEqual(orderedMigrationFiles(['002_iot_platform.sql', '001_pilot.sql', 'README.md']).map(file => file.version), [1, 2]);
  assert.equal(migrationVersion('007_future.sql'), 7);
  assert.throws(() => migrationVersion('bad.sql'), /migration/i);
  assert.throws(() => orderedMigrationFiles(['001_pilot.sql', '001_duplicate.sql']), /duplicate/i);
  assert.throws(() => orderedMigrationFiles(['001_pilot.sql', '003_dashboard.sql']), /missing/i);
  assert.throws(() => orderedMigrationFiles(['002_iot_platform.sql']), /start at version 001/i);
});

test('legacy Pilot tables without migration history fail closed', async context => {
  const db = await isolatedDatabase();
  context.after(db.cleanup);
  await db.pool.query('CREATE TABLE users (id uuid PRIMARY KEY)');
  await assert.rejects(migrate(db.pool), /existing Pilot tables have no migration history/i);
  const state = await db.pool.query("SELECT to_regclass('schema_migrations') AS history, to_regclass('users') AS users");
  assert.equal(state.rows[0].history, null);
  assert.equal(state.rows[0].users, 'users');
});

test('migration runner rejects inconsistent and newer recorded histories before DDL', async context => {
  const gap = await isolatedDatabase();
  const future = await isolatedDatabase();
  context.after(async () => { await gap.cleanup(); await future.cleanup(); });

  await gap.pool.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY)');
  await gap.pool.query('INSERT INTO schema_migrations(version) VALUES(1),(3)');
  await assert.rejects(migrate(gap.pool), /contiguous/i);
  assert.deepEqual((await gap.pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version), [1, 3]);
  assert.equal((await gap.pool.query("SELECT to_regclass('sensor_types') AS sensor_type_table")).rows[0].sensor_type_table, null);

  await future.pool.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY)');
  await future.pool.query('INSERT INTO schema_migrations(version) VALUES(1),(2),(3)');
  await assert.rejects(migrate(future.pool), /newer than available migrations/i);
  assert.deepEqual((await future.pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version), [1, 2, 3]);
});

test('upgrade from recorded Pilot v1 preserves four users, four devices and 2,086 readings after rerun', async context => {
  const db = await isolatedDatabase();
  context.after(db.cleanup);
  const baseline = (await migrations()).find(file => file.version === 1);
  assert.ok(baseline);
  await db.pool.query(baseline.sql);

  const userIds = Array.from({ length: 4 }, () => randomUUID());
  const deviceIds = Array.from({ length: 4 }, () => randomUUID());
  const ownershipIds = Array.from({ length: 4 }, () => randomUUID());
  const models = ['water-v1', 'environment-v1', 'water-v1', 'environment-v1'];
  const hashes = userIds.map((_, index) => `salt:hash-${index}`);
  const credentialHashes = deviceIds.map((_, index) => String(index + 1).repeat(64));
  for (let index = 0; index < 4; index++) {
    await db.pool.query('INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,$4)', [userIds[index], `v1-${index}@example.test`, hashes[index], index === 0 ? 'admin' : 'user']);
    await db.pool.query('INSERT INTO devices(id,name,model,credential_hash,allocated_to) VALUES($1,$2,$3,$4,$5)', [deviceIds[index], `Legacy device ${index}`, models[index], credentialHashes[index], userIds[index]]);
    await db.pool.query('INSERT INTO ownerships(id,device_id,user_id) VALUES($1,$2,$3)', [ownershipIds[index], deviceIds[index], userIds[index]]);
  }
  await db.pool.query(`
    WITH fixture AS (
      SELECT device_id, ownership_id, ordinal
      FROM unnest($1::uuid[], $2::uuid[]) WITH ORDINALITY AS refs(device_id, ownership_id, ordinal)
    )
    INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings)
    SELECT fixture.device_id,
      md5('pilot-reading-' || series.n)::uuid,
      fixture.ownership_id,
      '2026-10-08T08:00:00Z'::timestamptz - series.n * interval '1 second',
      jsonb_build_object('ph', 7.1, 'water_temperature', 27, 'ec', 1.2)
    FROM generate_series(1, 2086) AS series(n)
    JOIN fixture ON fixture.ordinal = ((series.n - 1) % 4) + 1
  `, [deviceIds, ownershipIds]);
  await db.pool.query('INSERT INTO schema_migrations(version) VALUES(1)');

  const upgrade = await migrate(db.pool);
  assert.deepEqual(upgrade, { applied: [2], current: [1, 2] });

  const preservedUsers = await db.pool.query('SELECT id,email,password_hash,role FROM users ORDER BY email');
  assert.equal(preservedUsers.rowCount, 4);
  assert.deepEqual(preservedUsers.rows.map(row => row.id).sort(), [...userIds].sort());
  assert.deepEqual(preservedUsers.rows.map(row => row.password_hash).sort(), [...hashes].sort());
  assert.equal(preservedUsers.rows.filter(row => row.role === 'admin').length, 1);
  assert.equal(preservedUsers.rows.filter(row => row.role === 'user').length, 3);
  const preservedDevices = await db.pool.query(`
    SELECT d.id,d.name,d.model,d.credential_hash,d.allocated_to,d.type_id,t.code AS type_code,
      o.id AS ownership_id,o.user_id AS owner_user_id
    FROM devices d
    JOIN device_types t ON t.id=d.type_id
    JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
    ORDER BY d.id
  `);
  assert.equal(preservedDevices.rowCount, 4);
  assert.deepEqual(preservedDevices.rows.map(row => row.id).sort(), [...deviceIds].sort());
  for (const device of preservedDevices.rows) {
    const index = deviceIds.indexOf(device.id);
    assert.notEqual(index, -1);
    assert.equal(device.name, `Legacy device ${index}`);
    assert.equal(device.model, models[index]);
    assert.equal(device.credential_hash, credentialHashes[index]);
    assert.equal(device.allocated_to, userIds[index]);
    assert.equal(device.ownership_id, ownershipIds[index]);
    assert.equal(device.owner_user_id, userIds[index]);
    assert.equal(device.type_code, models[index] === 'water-v1' ? 'PILOT-WATER-V1' : 'PILOT-ENV-V1');
  }
  const preservedReadings = await db.pool.query('SELECT count(*)::int AS total, count(DISTINCT message_id)::int AS messages, count(*) FILTER (WHERE ingest_type IS NOT NULL)::int AS typed FROM readings');
  assert.deepEqual(preservedReadings.rows[0], { total: 2086, messages: 2086, typed: 2086 });
  const representative = await db.pool.query("SELECT readings,ingest_type,ingest_version FROM readings WHERE message_id=md5('pilot-reading-1')::uuid");
  assert.equal(representative.rowCount, 1);
  assert.deepEqual(representative.rows[0].readings, { ph: 7.1, water_temperature: 27, ec: 1.2 });
  assert.equal(representative.rows[0].ingest_type, 'water-v1');
  assert.equal(representative.rows[0].ingest_version, 1);
  assert.equal(Number((await db.pool.query('SELECT count(*) FROM ownerships')).rows[0].count), 4);
  assert.deepEqual((await db.pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version), [1, 2]);
  const readingFingerprint = async () => (await db.pool.query(`SELECT md5(COALESCE(string_agg(concat_ws('|', device_id::text, message_id::text, ownership_id::text, measured_at::text, readings::text, ingest_type, ingest_version::text), chr(10) ORDER BY device_id, message_id), '')) AS digest FROM readings`)).rows[0].digest;
  const stateFingerprint = async () => JSON.stringify({
    users: (await db.pool.query('SELECT id,email,password_hash,role FROM users ORDER BY id')).rows,
    devices: (await db.pool.query('SELECT id,name,model,credential_hash,allocated_to,type_id FROM devices ORDER BY id')).rows,
    ownerships: (await db.pool.query('SELECT id,device_id,user_id,started_at,ended_at FROM ownerships ORDER BY id')).rows,
    readings: await readingFingerprint(),
  });
  const beforeRerunFingerprint = await stateFingerprint();

  await migrate(db.pool);
  const rerunCounts = await db.pool.query(`SELECT
    (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM devices) AS devices,
    (SELECT count(*)::int FROM ownerships) AS ownerships,
    (SELECT count(*)::int FROM readings) AS readings`);
  assert.deepEqual(rerunCounts.rows[0], { users: 4, devices: 4, ownerships: 4, readings: 2086 });
  assert.equal(await stateFingerprint(), beforeRerunFingerprint);
  assert.deepEqual((await db.pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version), [1, 2]);
});

test('migration 002 is atomic when its SQL fails', async context => {
  const db = await isolatedDatabase();
  context.after(db.cleanup);
  await db.pool.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY)');
  await db.pool.query('CREATE TABLE users (id uuid PRIMARY KEY)');
  await db.pool.query('CREATE TABLE sessions (token_hash text PRIMARY KEY)');
  await db.pool.query('CREATE TABLE devices (id uuid PRIMARY KEY, name text NOT NULL, model text NOT NULL, credential_hash text NOT NULL UNIQUE, allocated_to uuid, code text)');
  await db.pool.query('CREATE TABLE ownerships (id uuid PRIMARY KEY)');
  await db.pool.query('CREATE TABLE readings (device_id uuid, message_id uuid, ownership_id uuid, measured_at timestamptz, received_at timestamptz, readings jsonb, PRIMARY KEY(device_id,message_id))');
  await db.pool.query('INSERT INTO schema_migrations VALUES (1)');
  await assert.rejects(migrate(db.pool));
  const tables = await db.pool.query("SELECT to_regclass('sensor_types') AS sensor_types, to_regclass('device_types') AS device_types, to_regclass('area_thresholds') AS area_thresholds");
  assert.deepEqual(tables.rows[0], { sensor_types: null, device_types: null, area_thresholds: null });
  const columns = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='devices' AND column_name='is_sandbox'");
  assert.equal(columns.rowCount, 0);
  const version = await db.pool.query('SELECT version FROM schema_migrations ORDER BY version');
  assert.deepEqual(version.rows.map(row => row.version), [1]);
});
