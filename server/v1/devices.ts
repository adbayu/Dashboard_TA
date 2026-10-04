import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import QRCode from 'qrcode';
import { transaction } from '../db.js';
import { connectionStatus, hash, secret } from '../domain.js';
import { activationCodeSchema, codeSchema, failV1, requireAdmin, requireActor, shortTextSchema, uuidSchema, v1Object } from './common.js';

type DeviceQuery = {
  type?: string;
  area?: string;
  legacyId?: string;
  code?: string;
  c?: string;
  cursor?: string;
};

type CreateDeviceBody = {
  typeCode: string;
  name: string;
  areaRef?: string | null;
  allocatedTo?: string | null;
};

type DevicePatch = {
  name?: string;
  areaRef?: string | null;
  firmware?: string | null;
  calibratedAt?: string | null;
};

const nullableText = { anyOf: [{ type: 'string', maxLength: 100 }, { type: 'null' }] };
const nullableUuid = { anyOf: [uuidSchema, { type: 'null' }] };
const deviceQuerySchema = v1Object({
  type: codeSchema,
  area: shortTextSchema,
  legacyId: { type: 'string', pattern: '^IOT-[0-9]{3}$' },
  code: codeSchema,
  c: activationCodeSchema,
  cursor: { type: 'string', maxLength: 300 },
}, []);
const createDeviceSchema = v1Object({
  typeCode: codeSchema,
  name: shortTextSchema,
  areaRef: nullableText,
  allocatedTo: nullableUuid,
}, ['typeCode', 'name']);
const patchDeviceSchema = v1Object({
  name: shortTextSchema,
  areaRef: nullableText,
  firmware: { anyOf: [{ type: 'string', maxLength: 32 }, { type: 'null' }] },
  calibratedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
}, []);
const claimSchema = v1Object({ code: codeSchema, activationCode: activationCodeSchema });
const qrBodySchema = v1Object({ activationCode: activationCodeSchema });
const qrQuerySchema = v1Object({ format: { type: 'string', enum: ['svg', 'png'] } }, []);

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function presentDevice(row: Record<string, any>) {
  const measuredAt = iso(row.measured_at);
  const receivedAt = iso(row.last_received_at);
  return {
    id: row.id,
    code: row.code,
    legacyId: row.legacy_id,
    name: row.name,
    type: { code: row.type_code, kind: row.kind },
    areaRef: row.area_ref,
    status: connectionStatus(measuredAt, receivedAt),
    lastMeasuredAt: measuredAt,
    lastReceivedAt: receivedAt,
    firmware: row.firmware,
    rssi: row.last_rssi === null ? null : Number(row.last_rssi),
    calibratedAt: iso(row.calibrated_at),
  };
}

async function sensorsForDevice(pool: pg.Pool, typeId: string, areaRef: string | null) {
  const result = await pool.query(
    `SELECT st.code,st.name,st.unit,st.decimals,dts.label,
       COALESCE(at.warn_low,st.warn_low) AS warn_low,
       COALESCE(at.warn_high,st.warn_high) AS warn_high,
       CASE WHEN at.area_ref IS NULL THEN 'default' ELSE 'area' END AS threshold_source
     FROM device_type_sensors dts
     JOIN sensor_types st ON st.code=dts.sensor_code
     LEFT JOIN area_thresholds at ON at.area_ref=$2 AND at.sensor_code=dts.sensor_code
     WHERE dts.type_id=$1
     ORDER BY dts.sensor_code`,
    [typeId, areaRef],
  );
  return result.rows.map(row => ({
    code: row.code,
    name: row.name,
    unit: row.unit,
    decimals: Number(row.decimals),
    label: row.label,
    threshold: row.warn_low === null && row.warn_high === null
      ? null
      : { low: row.warn_low === null ? null : Number(row.warn_low), high: row.warn_high === null ? null : Number(row.warn_high), source: row.threshold_source },
  }));
}

async function allocateCode(client: pg.PoolClient, prefix: string) {
  const result = await client.query('SELECT code FROM devices WHERE code LIKE $1', [prefix + '-%']);
  let maximum = 0;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const row of result.rows) {
    const match = new RegExp('^' + escapedPrefix + '-([0-9]+)$').exec(row.code ?? '');
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }
  if (maximum >= 999) failV1(409, 'CONFLICT', 'Nomor kode device untuk prefix ini sudah habis.');
  return prefix + '-' + String(maximum + 1).padStart(3, '0');
}

function requireVisible(row: Record<string, any> | undefined, request: FastifyRequest) {
  if (!row) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
  if (request.actor?.role !== 'admin' && row.owner_id !== request.actor?.id) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
  return row;
}

async function getQrImage(request: FastifyRequest<{ Params: { id: string }; Querystring: { format?: 'svg' | 'png' }; Body: { activationCode: string } }>, reply: FastifyReply, pool: pg.Pool, origin: string) {
  requireAdmin(request);
  const device = (await pool.query(
    'SELECT code,activation_hash,activation_expires FROM devices WHERE id=$1',
    [request.params.id],
  )).rows[0];
  if (!device) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
  if (!device.activation_hash || device.activation_hash !== hash(request.body.activationCode) || !device.activation_expires || new Date(device.activation_expires).getTime() <= Date.now()) {
    failV1(409, 'CONFLICT', 'Kode aktivasi sudah tidak berlaku. Buat ulang sebelum mencetak QR.');
  }
  const url = new URL('/d/' + encodeURIComponent(device.code), origin);
  url.searchParams.set('c', request.body.activationCode);
  if (request.query.format === 'png') {
    const image = await QRCode.toBuffer(url.toString(), { type: 'png', errorCorrectionLevel: 'M' });
    return reply.code(200).header('Content-Type', 'image/png').send(image);
  }
  const image = await QRCode.toString(url.toString(), { type: 'svg', errorCorrectionLevel: 'M' });
  return reply.code(200).header('Content-Type', 'image/svg+xml; charset=utf-8').send(image);
}

export function registerDeviceRoutes(app: FastifyInstance, pool: pg.Pool, origin: string) {
  app.get<{ Querystring: DeviceQuery }>('/api/v1/devices', {
    schema: { querystring: deviceQuerySchema },
  }, async request => {
    const query = request.query;
    if (query.code) {
      if (query.type || query.area || query.legacyId || query.cursor) failV1(400, 'VALIDATION_FAILED', 'Pratinjau QR tidak dapat digabung dengan filter lain.');
      const row = (await pool.query(
        `SELECT d.code,d.name,d.type_id,t.code AS type_code,t.kind,
           EXISTS(SELECT 1 FROM ownerships o WHERE o.device_id=d.id AND o.ended_at IS NULL) AS claimed,
           (d.activation_hash=$2 AND d.activation_expires>now()) AS activation_valid
         FROM devices d JOIN device_types t ON t.id=d.type_id WHERE d.code=$1`,
        [query.code, query.c ? hash(query.c) : null],
      )).rows[0];
      if (!row) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
      const sensors = await sensorsForDevice(pool, row.type_id, null);
      // TODO(Q4): area tetap tersembunyi sampai kepemilikan datanya diputuskan.
      return { device: {
        code: row.code,
        name: row.name,
        type: { code: row.type_code, kind: row.kind },
        sensors: sensors.map(sensor => ({ code: sensor.code, name: sensor.name, unit: sensor.unit, label: sensor.label })),
        claimed: row.claimed,
        activationValid: !row.claimed && Boolean(row.activation_valid),
      } };
    }
    if (query.c) failV1(400, 'VALIDATION_FAILED', 'Kode aktivasi hanya dapat digunakan bersama kode device.');
    const actor = requireActor(request);
    const isAdmin = actor.role === 'admin';
    const values: unknown[] = [isAdmin, actor.id];
    const filters = ['($1::boolean OR EXISTS(SELECT 1 FROM ownerships o WHERE o.device_id=d.id AND o.user_id=$2 AND o.ended_at IS NULL))'];
    if (query.type) {
      values.push(query.type);
      filters.push(`t.code=$${values.length}`);
    }
    if (query.area) {
      values.push(query.area);
      filters.push(`d.area_ref=$${values.length}`);
    }
    if (query.legacyId) {
      values.push(query.legacyId);
      filters.push(`d.legacy_id=$${values.length}`);
    }
    const rows = await pool.query(
      `SELECT d.id,d.code,d.legacy_id,d.name,d.area_ref,d.firmware,d.last_rssi,d.calibrated_at,
         t.code AS type_code,t.kind,latest.measured_at,
         (SELECT max(received_at) FROM readings WHERE device_id=d.id) AS last_received_at
       FROM devices d JOIN device_types t ON t.id=d.type_id
       LEFT JOIN LATERAL (SELECT measured_at FROM readings WHERE device_id=d.id ORDER BY measured_at DESC,message_id DESC LIMIT 1) latest ON true
       WHERE ${filters.join(' AND ')} ORDER BY d.code,d.id LIMIT 100`,
      values,
    );
    return { devices: rows.rows.map(presentDevice), nextCursor: null };
  });

  app.get<{ Params: { id: string } }>('/api/v1/devices/:id', {
    schema: { params: v1Object({ id: uuidSchema }) },
  }, async request => {
    const row = (await pool.query(
      `SELECT d.id,d.code,d.legacy_id,d.name,d.type_id,d.area_ref,d.firmware,d.last_rssi,d.calibrated_at,
         t.code AS type_code,t.kind,latest.measured_at,
         (SELECT max(received_at) FROM readings WHERE device_id=d.id) AS last_received_at,
         o.user_id AS owner_id
       FROM devices d JOIN device_types t ON t.id=d.type_id
       LEFT JOIN LATERAL (SELECT measured_at FROM readings WHERE device_id=d.id ORDER BY measured_at DESC,message_id DESC LIMIT 1) latest ON true
       LEFT JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
       WHERE d.id=$1`,
      [request.params.id],
    )).rows[0];
    requireVisible(row, request);
    return { device: { ...presentDevice(row), sensors: await sensorsForDevice(pool, row.type_id, row.area_ref) } };
  });

  app.post<{ Body: CreateDeviceBody }>('/api/v1/devices', {
    schema: { body: createDeviceSchema },
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const body = request.body;
    if (!body.name.trim()) failV1(400, 'VALIDATION_FAILED', 'Nama device tidak boleh kosong.');
    const credential = secret();
    const activationCode = secret();
    const device = await transaction(pool, async client => {
      await client.query('LOCK TABLE devices IN EXCLUSIVE MODE');
      const count = Number((await client.query('SELECT count(*) FROM devices')).rows[0].count);
      if (count >= 20) failV1(409, 'CONFLICT', 'Batas pilot 20 unit tercapai.');
      const type = (await client.query('SELECT id,code,kind,active FROM device_types WHERE code=$1 FOR UPDATE', [body.typeCode])).rows[0];
      if (!type) failV1(400, 'VALIDATION_FAILED', 'Tipe device tidak dikenal.');
      if (!type.active) failV1(400, 'VALIDATION_FAILED', 'Tipe device tidak aktif.');
      if (body.allocatedTo && !(await client.query('SELECT 1 FROM users WHERE id=$1', [body.allocatedTo])).rowCount) {
        failV1(400, 'VALIDATION_FAILED', 'Akun tujuan tidak ditemukan.');
      }
      const prefix = type.kind === 'paket' ? 'AQ-PKT' : type.code;
      const code = await allocateCode(client, prefix);
      const id = randomUUID();
      await client.query(
        `INSERT INTO devices(id,name,model,credential_hash,allocated_to,activation_hash,activation_expires,code,type_id,area_ref)
         VALUES($1,$2,NULL,$3,$4,$5,now()+interval '24 hours',$6,$7,$8)`,
        [id, body.name.trim(), hash(credential), body.allocatedTo ?? null, hash(activationCode), code, type.id, body.areaRef ?? null],
      );
      return { id, code };
    });
    return reply.code(201).send({ device, credential, activationCode });
  });

  app.post<{ Params: { id: string } }>('/api/v1/devices/:id/activation', {
    schema: { params: v1Object({ id: uuidSchema }) },
    preHandler: requireAdmin,
  }, async request => {
    const activationCode = secret();
    const result = await transaction(pool, async client => {
      const device = (await client.query('SELECT id FROM devices WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
      if (!device) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
      const owner = await client.query('SELECT 1 FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [request.params.id]);
      if (owner.rowCount) failV1(409, 'CONFLICT', 'Device sudah diklaim.');
      return client.query(
        `UPDATE devices SET activation_hash=$2,activation_expires=now()+interval '24 hours'
         WHERE id=$1 RETURNING activation_expires`,
        [request.params.id, hash(activationCode)],
      );
    });
    return { activationCode, expiresAt: iso(result.rows[0].activation_expires) };
  });

  app.post<{ Params: { id: string }; Querystring: { format?: 'svg' | 'png' }; Body: { activationCode: string } }>('/api/v1/devices/:id/qr', {
    schema: {
      params: v1Object({ id: uuidSchema }),
      querystring: qrQuerySchema,
      body: qrBodySchema,
    },
    preHandler: requireAdmin,
  }, async (request, reply) => getQrImage(request, reply, pool, origin));

  app.post<{ Body: { code: string; activationCode: string } }>('/api/v1/devices/claim', {
    schema: { body: claimSchema },
  }, async request => {
    const actor = requireActor(request);
    return transaction(pool, async client => {
      const device = (await client.query(
        'SELECT id,allocated_to,activation_hash,activation_expires FROM devices WHERE code=$1 FOR UPDATE',
        [request.body.code],
      )).rows[0];
      if (!device) failV1(400, 'VALIDATION_FAILED', 'Kode device atau aktivasi tidak valid.');
      const owner = await client.query('SELECT 1 FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [device.id]);
      if (owner.rowCount) failV1(409, 'CONFLICT', 'Device sudah diklaim.');
      if (device.allocated_to && device.allocated_to !== actor.id) failV1(400, 'VALIDATION_FAILED', 'Kode device atau aktivasi tidak valid.');
      if (!device.activation_hash || device.activation_hash !== hash(request.body.activationCode) || !device.activation_expires || new Date(device.activation_expires).getTime() <= Date.now()) {
        failV1(400, 'VALIDATION_FAILED', 'Kode aktivasi salah atau kedaluwarsa.');
      }
      await client.query('INSERT INTO ownerships(id,device_id,user_id) VALUES($1,$2,$3)', [randomUUID(), device.id, actor.id]);
      await client.query(
        'UPDATE devices SET allocated_to=COALESCE(allocated_to,$2),activation_hash=NULL,activation_expires=NULL WHERE id=$1',
        [device.id, actor.id],
      );
      return { deviceId: device.id };
    });
  });

  app.patch<{ Params: { id: string }; Body: DevicePatch }>('/api/v1/devices/:id', {
    schema: { params: v1Object({ id: uuidSchema }), body: patchDeviceSchema },
  }, async request => {
    const actor = requireActor(request);
    const body = request.body;
    const isAdmin = actor.role === 'admin';
    if (!Object.keys(body).length) failV1(400, 'VALIDATION_FAILED', 'Tidak ada perubahan device yang dikirim.');
    if (!isAdmin && (Object.hasOwn(body, 'firmware') || Object.hasOwn(body, 'calibratedAt'))) {
      failV1(403, 'FORBIDDEN_SCOPE', 'Hanya pengelola yang dapat mengubah metadata unit.');
    }
    const visible = await pool.query(
      `SELECT d.id FROM devices d WHERE d.id=$1 AND ($2::boolean OR EXISTS(
        SELECT 1 FROM ownerships o WHERE o.device_id=d.id AND o.user_id=$3 AND o.ended_at IS NULL
      ))`,
      [request.params.id, isAdmin, actor.id],
    );
    if (!visible.rowCount) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
    const fields: Array<[keyof DevicePatch, string]> = [
      ['name', 'name'], ['areaRef', 'area_ref'], ['firmware', 'firmware'], ['calibratedAt', 'calibrated_at'],
    ];
    const assignments: string[] = [];
    const values: unknown[] = [request.params.id];
    for (const [key, column] of fields) {
      if (!Object.hasOwn(body, key)) continue;
      const value = body[key];
      if (key === 'name' && typeof value === 'string' && !value.trim()) failV1(400, 'VALIDATION_FAILED', 'Nama device tidak boleh kosong.');
      values.push(key === 'name' && typeof value === 'string' ? value.trim() : value);
      assignments.push(`${column}=$${values.length}`);
    }
    await pool.query(`UPDATE devices SET ${assignments.join(',')} WHERE id=$1`, values);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/v1/devices/:id/release', {
    schema: { params: v1Object({ id: uuidSchema }) },
  }, async request => {
    const actor = requireActor(request);
    const released = await transaction(pool, async client => {
      await client.query('SELECT id FROM devices WHERE id=$1 FOR UPDATE', [request.params.id]);
      return client.query(
        'UPDATE ownerships SET ended_at=clock_timestamp() WHERE device_id=$1 AND user_id=$2 AND ended_at IS NULL RETURNING id',
        [request.params.id, actor.id],
      );
    });
    if (!released.rowCount) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
    return { ok: true };
  });
}
