import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { transaction } from '../db.js';
import { connectionStatus } from '../domain.js';
import { failV1, requireAdmin, requireActor, sandboxScope, sensorCodeSchema, shortTextSchema, uuidSchema, v1Object } from './common.js';
import { historyDevice, visibleDevice } from './access.js';
import { deviceSensors, sensorState, type EffectiveThreshold, type ThresholdSource } from './monitoring-state.js';

const dayMs = 24 * 60 * 60 * 1000;
const buckets = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '1h': '1 hour',
} as const;
const bucketMs = { '1m': 60_000, '5m': 300_000, '1h': 3_600_000 } as const;
type Bucket = keyof typeof buckets | 'raw';
type ReadingQuery = {
  sensor?: string;
  from: string;
  to: string;
  bucket?: Bucket;
  cursor?: string;
  limit?: string;
};
type ThresholdInput = { sensor: string; low: number | null; high: number | null };
type LatestRow = { measured_at: Date | string; readings: Record<string, number> };
type AggregateRow = { t: Date | string; avg: number | string; min: number | string; max: number | string; n: string | number };
type RawRow = { message_id: string; measured_at: Date | string; received_at: Date | string; readings: Record<string, number> };
type DeviceStatusRow = { measured_at: Date | string | null; received_at: Date | string | null };
type OverviewRow = {
  id: string;
  code: string;
  area_ref: string | null;
  unit: string;
  measured_at: Date | string | null;
  value: number | string | null;
  warn_low: number | string | null;
  warn_high: number | string | null;
  threshold_source: ThresholdSource;
};

const readingsQuerySchema = v1Object({
  sensor: sensorCodeSchema,
  from: { type: 'string', format: 'date-time' },
  to: { type: 'string', format: 'date-time' },
  bucket: { type: 'string', enum: ['1m', '5m', '1h', 'raw'] },
  cursor: { type: 'string', maxLength: 300 },
  limit: { type: 'string', pattern: '^[1-9][0-9]{0,2}$' },
}, ['from', 'to']);
const thresholdItemSchema = v1Object({
  sensor: sensorCodeSchema,
  low: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  high: { anyOf: [{ type: 'number' }, { type: 'null' }] },
});
const thresholdsBodySchema = v1Object({
  thresholds: { type: 'array', minItems: 1, maxItems: 16, items: thresholdItemSchema },
});
const areaParamsSchema = v1Object({ ref: shortTextSchema });
const latestParamsSchema = v1Object({ id: uuidSchema });
const overviewParamsSchema = v1Object({ code: sensorCodeSchema });

function iso(value: Date | string | null | undefined): string | null {
  return value == null ? null : new Date(value).toISOString();
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function parseCursor(value: string | undefined): { time: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { time?: unknown; id?: unknown };
    if (
      typeof parsed.time !== 'string'
      || !Number.isFinite(Date.parse(parsed.time))
      || typeof parsed.id !== 'string'
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(parsed.id)
    ) throw new Error();
    return { time: new Date(parsed.time).toISOString(), id: parsed.id };
  } catch {
    failV1(400, 'VALIDATION_FAILED', 'Cursor riwayat tidak valid.');
  }
}

function parseRange(from: string, to: string): { from: string; to: string } {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs || toMs - fromMs > 31 * dayMs) {
    failV1(400, 'VALIDATION_FAILED', 'Rentang readings harus positif dan tidak lebih dari 31 hari.');
  }
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

function threshold(low: number | string | null, high: number | string | null, source: ThresholdSource): EffectiveThreshold {
  return {
    low: low === null ? null : Number(low),
    high: high === null ? null : Number(high),
    source,
  };
}

export function registerReadingRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get<{ Params: { id: string } }>('/api/v1/devices/:id/latest', {
    schema: { params: latestParamsSchema },
    config: { scope: 'readings:read' },
  }, async request => {
    const device = await visibleDevice(pool, request, request.params.id);
    const sensors = await deviceSensors(pool, device.type_id, device.area_ref);
    const latest = (await pool.query<LatestRow>(
      `SELECT measured_at,readings FROM readings
       WHERE device_id=$1 AND ($2::uuid IS NULL OR ownership_id=$2)
       ORDER BY measured_at DESC,message_id DESC LIMIT 1`,
      [device.id, device.is_admin ? null : device.ownership_id],
    )).rows[0];
    return {
      measuredAt: iso(latest?.measured_at),
      readings: sensors.map(sensor => {
        const raw = latest?.readings?.[sensor.code];
        const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
        return {
          sensor: sensor.code,
          value,
          unit: sensor.unit,
          state: sensorState(value, sensor.threshold),
          threshold: sensor.threshold,
        };
      }),
    };
  });

  app.get<{ Params: { id: string }; Querystring: ReadingQuery }>('/api/v1/devices/:id/readings', {
    schema: { params: latestParamsSchema, querystring: readingsQuerySchema },
    config: { scope: 'readings:read' },
  }, async request => {
    const device = await historyDevice(pool, request, request.params.id);
    const sensors = await deviceSensors(pool, device.type_id, device.area_ref);
    const sensor = request.query.sensor ? sensors.find(item => item.code === request.query.sensor) : undefined;
    if (request.query.sensor && !sensor) failV1(404, 'NOT_FOUND', 'Sensor tidak ditemukan pada device.');
    const range = parseRange(request.query.from, request.query.to);
    const bucket = request.query.bucket ?? '5m';
    if (bucket !== 'raw') {
      if (!sensor) failV1(400, 'VALIDATION_FAILED', 'Sensor wajib untuk bucket agregasi.');
      if (request.query.cursor || request.query.limit !== undefined) failV1(400, 'VALIDATION_FAILED', 'Cursor dan limit hanya berlaku untuk bucket raw.');
      const maxPoints = Math.max(1, Math.floor((Date.parse(range.to) - Date.parse(range.from)) / bucketMs[bucket]));
      const result = await pool.query<AggregateRow>(
        `SELECT selected.t,selected.avg,selected.min,selected.max,selected.n
         FROM (
           SELECT date_bin($3::interval,r.measured_at,timestamptz '2000-01-01 00:00:00+00') AS t,
             avg((r.readings->>$4)::float8) AS avg,
             min((r.readings->>$4)::float8) AS min,
             max((r.readings->>$4)::float8) AS max,
             count(*) AS n
           FROM readings r
           WHERE r.device_id=$1 AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))
             AND r.measured_at >= $5::timestamptz AND r.measured_at < $6::timestamptz
             AND r.readings ? $4
           GROUP BY 1 ORDER BY 1 DESC LIMIT $7
         ) selected
         ORDER BY selected.t ASC`,
        [device.id, device.ownership_ids, buckets[bucket], sensor.code, range.from, range.to, maxPoints],
      );
      return {
        sensor: sensor.code,
        bucket,
        points: result.rows.map(row => ({ t: iso(row.t), avg: Number(row.avg), min: Number(row.min), max: Number(row.max), n: Number(row.n) })),
        threshold: sensor.threshold,
      };
    }

    const cursor = parseCursor(request.query.cursor);
    const limit = Number(request.query.limit ?? 50);
    if (limit > 100) failV1(400, 'VALIDATION_FAILED', 'Halaman raw maksimal 100 baris.');
    const result = await pool.query<RawRow>(
      `SELECT r.message_id,r.measured_at,r.received_at,r.readings
       FROM readings r
       WHERE r.device_id=$1 AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))
         AND r.measured_at >= $4::timestamptz AND r.measured_at < $5::timestamptz
         AND ($3::text IS NULL OR r.readings ? $3::text)
         AND ($6::timestamptz IS NULL OR (r.measured_at,r.message_id)<($6::timestamptz,$7::uuid))
       ORDER BY r.measured_at DESC,r.message_id DESC LIMIT $8`,
      [device.id, device.ownership_ids, sensor?.code ?? null, range.from, range.to, cursor?.time ?? null, cursor?.id ?? null, limit + 1],
    );
    const page = result.rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor = result.rows.length > limit && last
      ? Buffer.from(JSON.stringify({ time: iso(last.measured_at), id: last.message_id })).toString('base64url')
      : null;
    let firstPageFields: {
      total: number;
      thresholds: Array<{ sensor: string } & EffectiveThreshold>;
      device: {
        name: string;
        code: string;
        type: { code: string; kind: string };
        status: string;
        hasReadings: boolean;
        areaRef: string | null;
        sensors: Array<{ code: string; name: string; unit: string; decimals: number }>;
      };
    } | undefined;
    if (!cursor) {
      const [countResult, statusResult] = await Promise.all([
        pool.query<{ total: string }>(
          `SELECT count(*) AS total FROM readings r
           WHERE r.device_id=$1 AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))
             AND r.measured_at >= $3::timestamptz AND r.measured_at < $4::timestamptz
             AND ($5::text IS NULL OR r.readings ? $5::text)`,
          [device.id, device.ownership_ids, range.from, range.to, sensor?.code ?? null],
        ),
        pool.query<DeviceStatusRow>(
          `SELECT
             (SELECT r.measured_at FROM readings r
              WHERE r.device_id=$1 AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))
              ORDER BY r.measured_at DESC,r.message_id DESC LIMIT 1) AS measured_at,
             (SELECT max(r.received_at) FROM readings r
              WHERE r.device_id=$1 AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))) AS received_at`,
          [device.id, device.ownership_ids],
        ),
      ]);
      const latest = statusResult.rows[0];
      firstPageFields = {
        total: Number(countResult.rows[0].total),
        thresholds: sensors.map(item => ({ sensor: item.code, ...item.threshold })),
        device: {
          name: device.name,
          code: device.code,
          type: { code: device.type_code, kind: device.type_kind },
          status: connectionStatus(iso(latest?.measured_at), iso(latest?.received_at)),
          hasReadings: latest?.received_at != null,
          areaRef: device.area_ref,
          sensors: sensors.map(({ code, name, unit, decimals }) => ({ code, name, unit, decimals })),
        },
      };
    }
    const pointSensors = sensor ? [sensor] : sensors;
    return {
      ...(sensor ? { sensor: sensor.code } : {}),
      bucket,
      points: page.map(row => {
        const readings = pointSensors.map(item => {
          const raw = row.readings?.[item.code];
          const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
          return { sensor: item.code, value, unit: item.unit, state: sensorState(value, item.threshold) };
        });
        return {
          messageId: row.message_id,
          measuredAt: iso(row.measured_at),
          receivedAt: iso(row.received_at),
          readings,
          ...(sensor ? { value: readings[0].value, unit: sensor.unit } : {}),
        };
      }),
      ...(sensor ? { threshold: sensor.threshold } : {}),
      ...(firstPageFields ?? {}),
      nextCursor,
    };
  });

  app.get<{ Params: { code: string } }>('/api/v1/sensors/:code/overview', {
    schema: { params: overviewParamsSchema },
    config: { scope: 'readings:read' },
  }, async request => {
    const actor = requireActor(request);
    const sensor = (await pool.query<{ code: string; name: string; unit: string }>(
      'SELECT code,name,unit FROM sensor_types WHERE code=$1', [request.params.code],
    )).rows[0];
    if (!sensor) failV1(404, 'NOT_FOUND', 'Sensor tidak ditemukan.');
    const isAdmin = actor.scopes.includes('admin');
    const result = await pool.query<OverviewRow>(
      `SELECT d.id,d.code,d.area_ref,st.unit,latest.measured_at,latest.value,
         COALESCE(at.warn_low,st.warn_low) AS warn_low,
         COALESCE(at.warn_high,st.warn_high) AS warn_high,
         CASE WHEN at.area_ref IS NOT NULL AND (at.warn_low IS NOT NULL OR at.warn_high IS NOT NULL)
           THEN 'area' ELSE 'default' END AS threshold_source
       FROM devices d
       JOIN device_type_sensors dts ON dts.type_id=d.type_id AND dts.sensor_code=$1
       JOIN sensor_types st ON st.code=dts.sensor_code
       LEFT JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
       LEFT JOIN area_thresholds at ON at.area_ref=d.area_ref AND at.sensor_code=st.code
       LEFT JOIN LATERAL (
         SELECT r.measured_at,r.readings->>$1 AS value
         FROM readings r
         WHERE r.device_id=d.id AND ($2::boolean OR r.ownership_id=o.id)
         ORDER BY r.measured_at DESC,r.message_id DESC LIMIT 1
       ) latest ON true
       WHERE ($2::boolean OR o.user_id=$3)
         AND ($4::boolean IS NULL OR d.is_sandbox=$4)
       ORDER BY d.code,d.id`,
      [request.params.code, isAdmin, actor.id, sandboxScope(actor)],
    );
    return {
      sensor: sensor.code,
      name: sensor.name,
      unit: sensor.unit,
      items: result.rows.map(row => {
        const value = row.value === null ? null : Number(row.value);
        const effective = threshold(row.warn_low, row.warn_high, row.threshold_source);
        return {
          deviceId: row.id,
          deviceCode: row.code,
          areaRef: row.area_ref,
          value,
          unit: row.unit,
          state: sensorState(value, effective),
          threshold: effective,
          measuredAt: iso(row.measured_at),
        };
      }),
    };
  });

  app.put<{ Params: { ref: string }; Body: { thresholds: ThresholdInput[] } }>('/api/v1/areas/:ref/thresholds', {
    schema: { params: areaParamsSchema, body: thresholdsBodySchema },
    config: { scope: 'admin' },
    preHandler: requireAdmin,
  }, async request => {
    requireActor(request);
    const { ref } = request.params;
    const body = request.body.thresholds;
    const codes = body.map(item => item.sensor);
    if (new Set(codes).size !== codes.length) failV1(400, 'VALIDATION_FAILED', 'Daftar ambang tidak boleh memuat sensor berulang.');

    const defaults = await pool.query<{ code: string; min_value: number | string; max_value: number | string; warn_low: number | string | null; warn_high: number | string | null }>(
      'SELECT code,min_value,max_value,warn_low,warn_high FROM sensor_types WHERE code=ANY($1::text[])', [codes],
    );
    const byCode = new Map(defaults.rows.map(row => [row.code, row]));
    if (byCode.size !== codes.length) failV1(400, 'VALIDATION_FAILED', 'Jenis sensor tidak dikenal.');
    for (const item of body) {
      const sensor = byCode.get(item.sensor)!;
      const min = Number(sensor.min_value);
      const max = Number(sensor.max_value);
      if (
        (item.low !== null && (item.low < min || item.low > max))
        || (item.high !== null && (item.high < min || item.high > max))
        || (item.low !== null && item.high !== null && item.low >= item.high)
      ) failV1(400, 'VALIDATION_FAILED', 'Ambang harus berada dalam rentang fisik sensor dan nilai low harus lebih kecil dari high.');
    }

    const thresholds = await transaction(pool, async client => {
      for (const item of body) {
        if (item.low === null && item.high === null) {
          await client.query('DELETE FROM area_thresholds WHERE area_ref=$1 AND sensor_code=$2', [ref, item.sensor]);
        } else {
          await client.query(
            `INSERT INTO area_thresholds(area_ref,sensor_code,warn_low,warn_high)
             VALUES($1,$2,$3,$4)
             ON CONFLICT(area_ref,sensor_code) DO UPDATE SET warn_low=EXCLUDED.warn_low,warn_high=EXCLUDED.warn_high`,
            [ref, item.sensor, item.low, item.high],
          );
        }
      }
      return body.map(item => {
        const sensor = byCode.get(item.sensor)!;
        const source: ThresholdSource = item.low === null && item.high === null ? 'default' : 'area';
        return {
          sensor: item.sensor,
          low: item.low ?? nullableNumber(sensor.warn_low),
          high: item.high ?? nullableNumber(sensor.warn_high),
          source,
        };
      });
    });
    return { areaRef: ref, thresholds };
  });
}
