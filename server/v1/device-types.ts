import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { transaction } from '../db.js';
import { failV1, requireAdmin, requireActor, sensorCodeSchema, shortTextSchema, v1Object, validateSensors } from './common.js';

type SensorLink = { code: string; label: string };
type DeviceTypeInput = { code: string; name: string; kind: 'satuan' | 'paket'; description?: string; sensors: SensorLink[] };
type DeviceTypePatch = Partial<Pick<DeviceTypeInput, 'name' | 'description'>> & { active?: boolean; sensors?: SensorLink[] };

const sensorLinkSchema = v1Object({ code: sensorCodeSchema, label: shortTextSchema });
const createSchema = v1Object({
  code: { type: 'string', pattern: '^[A-Z0-9-]{3,32}$' },
  name: shortTextSchema,
  kind: { type: 'string', enum: ['satuan', 'paket'] },
  description: { type: 'string', maxLength: 500 },
  sensors: { type: 'array', minItems: 1, maxItems: 16, items: sensorLinkSchema },
}, ['code', 'name', 'kind', 'sensors']);
const patchSchema = v1Object({
  name: shortTextSchema,
  description: { type: 'string', maxLength: 500 },
  active: { type: 'boolean' },
  sensors: { type: 'array', minItems: 1, maxItems: 16, items: sensorLinkSchema },
}, []);
const querySchema = v1Object({ kind: { type: 'string', enum: ['satuan', 'paket'] } }, []);

async function readTypes(pool: pg.Pool, kind?: string, id?: string) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (kind) {
    values.push(kind);
    clauses.push(`dt.kind=$${values.length}`);
  }
  if (id) {
    values.push(id);
    clauses.push(`dt.id=$${values.length}`);
  }
  const result = await pool.query(
    `SELECT dt.id,dt.code,dt.name,dt.kind,dt.description,dt.active
     FROM device_types dt ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
     ORDER BY dt.code`,
    values,
  );
  if (!result.rows.length) return [];
  const ids = result.rows.map(row => row.id);
  const sensorResult = await pool.query(
    `SELECT dts.type_id,dts.sensor_code AS code,dts.label
     FROM device_type_sensors dts WHERE dts.type_id=ANY($1::uuid[])
     ORDER BY dts.type_id,dts.sensor_code`,
    [ids],
  );
  const sensorsByType = new Map<string, SensorLink[]>();
  for (const sensor of sensorResult.rows) {
    const sensors = sensorsByType.get(sensor.type_id) ?? [];
    sensors.push({ code: sensor.code, label: sensor.label });
    sensorsByType.set(sensor.type_id, sensors);
  }
  return result.rows.map(row => ({ ...row, sensors: sensorsByType.get(row.id) ?? [] }));
}

async function ensureSensorsExist(client: pg.PoolClient, sensors: SensorLink[]) {
  const codes = sensors.map(sensor => sensor.code);
  const result = await client.query('SELECT code FROM sensor_types WHERE code=ANY($1::text[])', [codes]);
  if (result.rowCount !== new Set(codes).size) failV1(400, 'VALIDATION_FAILED', 'Satu atau lebih jenis sensor tidak dikenal.');
}

export function registerDeviceTypeRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get<{ Querystring: { kind?: 'satuan' | 'paket' } }>('/api/v1/device-types', {
    schema: { querystring: querySchema },
  }, async request => ({ deviceTypes: await readTypes(pool, request.query.kind) }));

  app.post<{ Body: DeviceTypeInput }>('/api/v1/device-types', {
    schema: { body: createSchema },
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const body = request.body;
    const actor = requireActor(request);
    if (!body.name.trim() || body.sensors.some(sensor => !sensor.label.trim())) {
      failV1(400, 'VALIDATION_FAILED', 'Nama tipe dan label sensor wajib diisi.');
    }
    validateSensors(body.kind, body.sensors);
    try {
      const id = crypto.randomUUID();
      await transaction(pool, async client => {
        await ensureSensorsExist(client, body.sensors);
        await client.query(
          'INSERT INTO device_types(id,code,name,kind,description,active) VALUES($1,$2,$3,$4,$5,true)',
          [id, body.code, body.name.trim(), body.kind, body.description?.trim() ?? ''],
        );
        for (const sensor of body.sensors) {
          await client.query('INSERT INTO device_type_sensors(type_id,sensor_code,label) VALUES($1,$2,$3)', [id, sensor.code, sensor.label.trim()]);
        }
      });
      const deviceType = (await readTypes(pool, undefined, id))[0];
      return reply.code(201).send({ deviceType });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') failV1(409, 'CONFLICT', 'Kode tipe atau sensor sudah digunakan.');
      if ((error as { code?: string }).code === '23503') failV1(400, 'VALIDATION_FAILED', 'Jenis sensor tidak dikenal.');
      void actor;
      throw error;
    }
  });

  app.patch<{ Params: { id: string }; Body: DeviceTypePatch }>('/api/v1/device-types/:id', {
    schema: { params: v1Object({ id: { type: 'string', format: 'uuid' } }), body: patchSchema },
    preHandler: requireAdmin,
  }, async request => {
    requireActor(request);
    const body = request.body;
    const hasSensors = Object.hasOwn(body, 'sensors');
    const hasMutableFields = ['name', 'description', 'active'].some(key => Object.hasOwn(body, key));
    if (!hasSensors && !hasMutableFields) failV1(400, 'VALIDATION_FAILED', 'Tidak ada perubahan tipe yang dikirim.');

    try {
      await transaction(pool, async client => {
        const current = (await client.query('SELECT id,kind FROM device_types WHERE id=$1 FOR UPDATE', [request.params.id])).rows[0];
        if (!current) failV1(404, 'NOT_FOUND', 'Tipe device tidak ditemukan.');
        if (hasSensors) {
          const used = await client.query('SELECT 1 FROM devices WHERE type_id=$1 LIMIT 1', [request.params.id]);
          if (used.rowCount) failV1(409, 'CONFLICT', 'Sensor pada tipe tidak dapat diubah setelah ada device yang memakainya.');
          validateSensors(current.kind, body.sensors!);
          if (body.sensors!.some(sensor => !sensor.label.trim())) failV1(400, 'VALIDATION_FAILED', 'Label sensor wajib diisi.');
          await ensureSensorsExist(client, body.sensors!);
          await client.query('DELETE FROM device_type_sensors WHERE type_id=$1', [request.params.id]);
          for (const sensor of body.sensors!) {
            await client.query('INSERT INTO device_type_sensors(type_id,sensor_code,label) VALUES($1,$2,$3)', [request.params.id, sensor.code, sensor.label.trim()]);
          }
        }
        const assignments: string[] = [];
        const values: unknown[] = [request.params.id];
        const fields: Array<[keyof DeviceTypePatch, string]> = [
          ['name', 'name'], ['description', 'description'], ['active', 'active'],
        ];
        for (const [key, column] of fields) {
          if (!Object.hasOwn(body, key)) continue;
          const value = body[key];
          if ((key === 'name' || key === 'description') && typeof value === 'string' && key === 'name' && !value.trim()) {
            failV1(400, 'VALIDATION_FAILED', 'Nama tipe tidak boleh kosong.');
          }
          values.push(typeof value === 'string' ? value.trim() : value);
          assignments.push(`${column}=$${values.length}`);
        }
        if (assignments.length) {
          await client.query(`UPDATE device_types SET ${assignments.join(',')} WHERE id=$1`, values);
        }
      });
      return { deviceType: (await readTypes(pool, undefined, request.params.id))[0] };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') failV1(409, 'CONFLICT', 'Kode sensor sudah digunakan di tipe tersebut.');
      if ((error as { code?: string }).code === '23503') failV1(400, 'VALIDATION_FAILED', 'Jenis sensor tidak dikenal.');
      throw error;
    }
  });
}
