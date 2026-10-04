import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { failV1, requireAdmin, sensorCodeSchema, shortTextSchema, v1Object } from './common.js';

type SensorInput = {
  code: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  decimals?: number;
  warnLow?: number | null;
  warnHigh?: number | null;
};

type SensorPatch = Partial<Pick<SensorInput, 'name' | 'decimals' | 'warnLow' | 'warnHigh'>>;

const numberOrNull = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const createSchema = v1Object({
  code: sensorCodeSchema,
  name: shortTextSchema,
  unit: { type: 'string', minLength: 1, maxLength: 24 },
  min: { type: 'number' },
  max: { type: 'number' },
  decimals: { type: 'integer', minimum: 0, maximum: 4 },
  warnLow: numberOrNull,
  warnHigh: numberOrNull,
}, ['code', 'name', 'unit', 'min', 'max']);
const patchSchema = v1Object({
  name: shortTextSchema,
  decimals: { type: 'integer', minimum: 0, maximum: 4 },
  warnLow: numberOrNull,
  warnHigh: numberOrNull,
}, []);

function present(row: Record<string, any>) {
  return {
    code: row.code,
    name: row.name,
    unit: row.unit,
    min: Number(row.min_value),
    max: Number(row.max_value),
    decimals: Number(row.decimals),
    warnLow: row.warn_low === null ? null : Number(row.warn_low),
    warnHigh: row.warn_high === null ? null : Number(row.warn_high),
  };
}

export function registerSensorTypeRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get('/api/v1/sensor-types', {
    schema: { tags: ['IoT'], summary: 'Daftar jenis sensor' },
  }, async () => {
    // TODO(Q6): rentang maksimum TDS masih sementara sampai modul fisik dikonfirmasi.
    const result = await pool.query('SELECT code,name,unit,min_value,max_value,decimals,warn_low,warn_high FROM sensor_types ORDER BY code');
    return { sensorTypes: result.rows.map(present) };
  });

  app.post<{ Body: SensorInput }>('/api/v1/sensor-types', {
    schema: { body: createSchema },
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const body = request.body;
    if (!body.name.trim() || !Number.isFinite(body.min) || !Number.isFinite(body.max) || body.min >= body.max) {
      failV1(400, 'VALIDATION_FAILED', 'Rentang sensor atau nama tidak valid.');
    }
    try {
      const result = await pool.query(
        'INSERT INTO sensor_types(code,name,unit,min_value,max_value,decimals,warn_low,warn_high) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING code,name,unit,min_value,max_value,decimals,warn_low,warn_high',
        [body.code, body.name.trim(), body.unit.trim(), body.min, body.max, body.decimals ?? 2, body.warnLow ?? null, body.warnHigh ?? null],
      );
      return reply.code(201).send({ sensorType: present(result.rows[0]) });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') failV1(409, 'CONFLICT', 'Kode sensor sudah digunakan.');
      if ((error as { code?: string }).code === '23514') failV1(400, 'VALIDATION_FAILED', 'Rentang atau ambang sensor tidak valid.');
      throw error;
    }
  });

  app.patch<{ Params: { code: string }; Body: SensorPatch }>('/api/v1/sensor-types/:code', {
    schema: { params: v1Object({ code: sensorCodeSchema }), body: patchSchema },
    preHandler: requireAdmin,
  }, async request => {
    const body = request.body;
    const assignments: string[] = [];
    const values: unknown[] = [request.params.code];
    const fields: Array<[keyof SensorPatch, string]> = [
      ['name', 'name'], ['decimals', 'decimals'], ['warnLow', 'warn_low'], ['warnHigh', 'warn_high'],
    ];
    for (const [key, column] of fields) {
      if (!Object.hasOwn(body, key)) continue;
      const value = body[key];
      if (key === 'name' && typeof value === 'string' && !value.trim()) failV1(400, 'VALIDATION_FAILED', 'Nama sensor tidak boleh kosong.');
      values.push(key === 'name' && typeof value === 'string' ? value.trim() : value);
      assignments.push(`${column}=$${values.length}`);
    }
    if (!assignments.length) failV1(400, 'VALIDATION_FAILED', 'Tidak ada perubahan sensor yang dikirim.');
    try {
      const result = await pool.query(
        `UPDATE sensor_types SET ${assignments.join(',')} WHERE code=$1 RETURNING code,name,unit,min_value,max_value,decimals,warn_low,warn_high`,
        values,
      );
      if (!result.rowCount) failV1(404, 'NOT_FOUND', 'Jenis sensor tidak ditemukan.');
      return { sensorType: present(result.rows[0]) };
    } catch (error) {
      if ((error as { code?: string }).code === '23514') failV1(400, 'VALIDATION_FAILED', 'Ambang sensor tidak valid.');
      throw error;
    }
  });

  app.delete<{ Params: { code: string } }>('/api/v1/sensor-types/:code', {
    schema: { params: v1Object({ code: sensorCodeSchema }) },
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const used = await pool.query('SELECT 1 FROM device_type_sensors WHERE sensor_code=$1 LIMIT 1', [request.params.code]);
    if (used.rowCount) failV1(409, 'CONFLICT', 'Jenis sensor masih dipakai oleh tipe device.');
    const result = await pool.query('DELETE FROM sensor_types WHERE code=$1', [request.params.code]);
    if (!result.rowCount) failV1(404, 'NOT_FOUND', 'Jenis sensor tidak ditemukan.');
    return reply.code(204).send();
  });
}
