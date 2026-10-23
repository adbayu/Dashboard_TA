import type pg from 'pg';
import { transaction } from '../database/db.js';
import { hash } from '../shared/domain.js';
import { failV1 } from './common.js';
import { recordReadingEvents } from './monitoring-state.js';
import type { DeviceEvent } from './events.js';

export type V2IngestBody = {
  version: 2;
  deviceId: string;
  type: string;
  messageId: string;
  measuredAt: string;
  readings: Record<string, number>;
  meta?: { rssi?: number; fw?: string };
};

export type IngestPublisher = {
  publishReading: (deviceId: string, data: { measuredAt: string; readings: Record<string, number> }) => Promise<void>;
  publishDeviceEvents: (events: DeviceEvent[]) => Promise<void>;
};

export async function ingestV2(pool: pg.Pool, body: V2IngestBody, credential: string, publisher?: IngestPublisher) {
  return ingestV2Core(pool, body, credential, publisher, false);
}

export async function ingestSandboxV2(pool: pg.Pool, body: V2IngestBody, publisher?: IngestPublisher) {
  return ingestV2Core(pool, body, null, publisher, true);
}

async function ingestV2Core(
  pool: pg.Pool,
  body: V2IngestBody,
  credential: string | null,
  publisher: IngestPublisher | undefined,
  sandboxOnly: boolean,
) {
  const measuredTime = Date.parse(body.measuredAt);
  if (measuredTime > Date.now() + 60_000) failV1(400, 'VALIDATION_FAILED', 'Waktu pengukuran lebih dari 60 detik di masa depan.');
  const meta = body.meta ?? {};

  const result = await transaction(pool, async client => {
    const device = (await client.query(
      `SELECT d.id,d.type_id,d.area_ref,d.credential_since,t.code AS type_code
       FROM devices d JOIN device_types t ON t.id=d.type_id
       WHERE d.id=$1 AND ($3::boolean OR d.credential_hash=$2) AND (NOT $3::boolean OR d.is_sandbox=true)
       FOR UPDATE OF d`,
      [body.deviceId, credential === null ? null : hash(credential), sandboxOnly],
    )).rows[0];
    if (!device) failV1(401, 'UNAUTHENTICATED', 'Credential device salah atau sudah dirotasi.');
    if (measuredTime < new Date(device.credential_since).getTime()) {
      failV1(400, 'VALIDATION_FAILED', 'Waktu pengukuran lebih awal daripada credential device.');
    }
    if (body.type !== device.type_code) failV1(400, 'VALIDATION_FAILED', 'Tipe payload tidak sama dengan tipe device.');

    const sensors = await client.query(
      `SELECT st.code,st.min_value,st.max_value
       FROM device_type_sensors dts JOIN sensor_types st ON st.code=dts.sensor_code
       WHERE dts.type_id=$1 ORDER BY st.code`,
      [device.type_id],
    );
    const keys = Object.keys(body.readings);
    if (keys.length !== sensors.rows.length || sensors.rows.some(sensor => {
      const value = body.readings[sensor.code];
      return !Object.hasOwn(body.readings, sensor.code) || !Number.isFinite(value) || value < Number(sensor.min_value) || value > Number(sensor.max_value);
    })) {
      failV1(400, 'VALIDATION_FAILED', 'Sensor atau nilai readings tidak sesuai dengan tipe device.');
    }

    const metadata = JSON.stringify(meta);
    const prior = (await client.query(
      `SELECT (measured_at=$3::timestamptz AND readings=$4::jsonb AND ingest_version=2
         AND ingest_type=$5 AND ingest_meta=$6::jsonb) AS matches
       FROM readings WHERE device_id=$1 AND message_id=$2`,
      [body.deviceId, body.messageId, body.measuredAt, JSON.stringify(body.readings), body.type, metadata],
    )).rows[0];
    if (prior) {
      if (!prior.matches) failV1(409, 'CONFLICT', 'ID kiriman sudah dipakai untuk payload berbeda.');
      return { duplicate: true, events: [] as DeviceEvent[] };
    }

    const owner = (await client.query(
      `SELECT id FROM ownerships WHERE device_id=$1 AND started_at<=$2::timestamptz
       AND (ended_at IS NULL OR ended_at>$2::timestamptz)`,
      [body.deviceId, body.measuredAt],
    )).rows[0];
    if (!owner) failV1(409, 'CONFLICT', 'Tidak ada kepemilikan pada waktu pengukuran.');

    await client.query(
      `INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings,ingest_version,ingest_type,ingest_meta)
       VALUES($1,$2,$3,$4,$5,2,$6,$7::jsonb)`,
      [body.deviceId, body.messageId, owner.id, body.measuredAt, JSON.stringify(body.readings), body.type, metadata],
    );
    await client.query(
      `UPDATE devices SET
         last_rssi=CASE WHEN $2::smallint IS NULL THEN last_rssi ELSE $2::smallint END,
         firmware=CASE WHEN $3::text IS NULL THEN firmware ELSE $3::text END
       WHERE id=$1`,
      [body.deviceId, meta.rssi ?? null, meta.fw ?? null],
    );
    const events = await recordReadingEvents(client, body.deviceId, device.type_id, device.area_ref, body.readings, body.messageId, body.measuredAt);
    return { duplicate: false, events };
  });
  if (!result.duplicate && publisher) {
    await publisher.publishReading(body.deviceId, { measuredAt: body.measuredAt, readings: body.readings });
    if (result.events.length) await publisher.publishDeviceEvents(result.events);
  }
  return { accepted: true, duplicate: result.duplicate };
}
