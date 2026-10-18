import ExcelJS from 'exceljs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PassThrough } from 'node:stream';
import pg from 'pg';
import { historyDevice } from './access.js';
import { failV1, requireActor, sensorCodeSchema, uuidSchema, v1Object } from './common.js';
import { deviceSensors, sensorState, type DeviceSensor } from './monitoring-state.js';

const dayMs = 24 * 60 * 60 * 1000;
const batchSize = 2000;
const requestsPerMinute = 5;
const requestWindowMs = 60 * 1000;
const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const localDateFormat = 'yyyy-mm-dd hh:mm:ss';

type ExportQuery = { from: string; to: string; sensor?: string; tz?: string };
type ExportReading = {
  message_id: string;
  measured_at: Date | string;
  received_at: Date | string;
  readings: Record<string, number>;
};
type SensorSummary = {
  sensor_code: string;
  sample_count: string | number;
  min_value: string | number | null;
  average_value: string | number | null;
  max_value: string | number | null;
};
type ThresholdSources = { sensor_code: string; low_source: 'area' | 'default'; high_source: 'area' | 'default' };
type RateWindow = { count: number; resetAt: number };

declare module 'fastify' {
  interface FastifyRequest {
    v1ExportUsageHandled?: boolean;
  }
}

const actorRateWindows = new Map<string, RateWindow>();
const activeExports = new Map<string, number>();

const paramsSchema = v1Object({ id: uuidSchema });
const querySchema = v1Object({
  from: { type: 'string', format: 'date-time' },
  to: { type: 'string', format: 'date-time' },
  sensor: sensorCodeSchema,
  tz: { type: 'string', minLength: 1, maxLength: 64, default: 'Asia/Jakarta' },
}, ['from', 'to']);

function configuredInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error(`${name} must be a positive safe integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive safe integer`);
  return parsed;
}

function validateTimezone(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch {
    failV1(400, 'VALIDATION_FAILED', 'Zona waktu tidak valid. Gunakan zona waktu IANA yang dikenal.');
  }
}

function parseRange(from: string, to: string): { from: string; to: string } {
  const fromMs = Date.parse(from);
  const requestedToMs = Date.parse(to);
  const toMs = Math.min(requestedToMs, Date.now());
  if (!Number.isFinite(fromMs) || !Number.isFinite(requestedToMs) || toMs <= fromMs || toMs - fromMs > 31 * dayMs) {
    failV1(400, 'VALIDATION_FAILED', 'Rentang ekspor harus positif dan tidak lebih dari 31 hari. Persempit rentang waktu.');
  }
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
}

function setRateHeaders(reply: FastifyReply, limit: number, remaining: number, resetAtUnixSeconds: number, retryAfter?: number) {
  reply.header('x-ratelimit-limit', limit);
  reply.header('x-ratelimit-remaining', remaining);
  reply.header('x-ratelimit-reset', resetAtUnixSeconds);
  if (retryAfter !== undefined) reply.header('retry-after', retryAfter);
}

function enforceRequestRate(actorId: string, reply: FastifyReply): void {
  const now = Date.now();
  for (const [key, value] of actorRateWindows) {
    if (value.resetAt <= now) actorRateWindows.delete(key);
  }
  let window = actorRateWindows.get(actorId);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + requestWindowMs };
    actorRateWindows.set(actorId, window);
  }
  window.count++;
  const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  setRateHeaders(reply, requestsPerMinute, Math.max(0, requestsPerMinute - window.count), Math.ceil(window.resetAt / 1000), window.count > requestsPerMinute ? retryAfter : undefined);
  if (window.count > requestsPerMinute) {
    failV1(429, 'RATE_LIMITED', 'Batas ekspor tercapai. Coba lagi setelah jendela rate limit berakhir.');
  }
}

function acquireExportSlot(actorId: string, maximum: number, reply: FastifyReply): () => void {
  const active = activeExports.get(actorId) ?? 0;
  if (active >= maximum) {
    setRateHeaders(reply, maximum, 0, Math.ceil((Date.now() + 1000) / 1000), 1);
    failV1(429, 'RATE_LIMITED', 'Batas ekspor aktif tercapai. Coba lagi setelah ekspor sebelumnya selesai.');
  }
  activeExports.set(actorId, active + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (activeExports.get(actorId) ?? 1) - 1;
    if (remaining > 0) activeExports.set(actorId, remaining);
    else activeExports.delete(actorId);
  };
}

async function cancelBackendQuery(pool: pg.Pool, processId: number): Promise<boolean> {
  const cancelClient = new pg.Client({
    ...pool.options,
    connectionTimeoutMillis: pool.options.connectionTimeoutMillis ?? 5000,
  });
  try {
    await cancelClient.connect();
    const result = await cancelClient.query<{ cancelled: boolean }>(
      'SELECT pg_cancel_backend($1) AS cancelled',
      [processId],
    );
    return result.rows[0]?.cancelled === true;
  } finally {
    await cancelClient.end().catch(() => undefined);
  }
}

function excelLocalDate(value: Date | string, formatter: Intl.DateTimeFormat): Date {
  const instant = new Date(value);
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
  const result = new Date(0);
  result.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  result.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), instant.getUTCMilliseconds());
  return result;
}

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

function sensorStatus(value: number | null, sensor: DeviceSensor): string {
  switch (sensorState(value, sensor.threshold)) {
    case 'normal': return 'Normal';
    case 'low': return 'Di bawah ambang';
    case 'high': return 'Di atas ambang';
    case 'unknown': return 'Tanpa ambang';
  }
}

function numberFormat(decimals: number): string {
  return decimals ? `0.${'0'.repeat(decimals)}` : '0';
}

async function logApiKeyUsage(pool: pg.Pool, request: FastifyRequest, status: number, startedAt: number): Promise<void> {
  const actor = request.actor;
  if (actor?.kind !== 'key' || !actor.keyId) return;
  const route = request.routeOptions.url;
  if (typeof route !== 'string') return;
  try {
    await pool.query(
      `WITH logged AS (
         INSERT INTO api_usage(key_id,route,status,duration_ms) VALUES($1,$2,$3,$4) RETURNING key_id
       )
       UPDATE api_keys SET last_used_at=clock_timestamp() WHERE id=$1 AND EXISTS(SELECT 1 FROM logged)`,
      [actor.keyId, route, status, Math.max(0, Math.round(performance.now() - startedAt))],
    );
  } catch (error) {
    request.log.error({ err: error, keyId: actor.keyId, route, status }, 'Gagal mencatat pemakaian API key.');
  }
}

function safeFilename(deviceCode: string, from: string, to: string): string {
  return `log-${deviceCode}-${from}_${to}.xlsx`.replace(/[^A-Za-z0-9._-]/g, '');
}

export function registerReadingExportRoute(app: FastifyInstance, pool: pg.Pool): void {
  const maxRows = configuredInteger('EXPORT_MAX_ROWS', 200_000);
  const maxConcurrent = configuredInteger('EXPORT_MAX_CONCURRENT', 2);

  app.get<{ Params: { id: string }; Querystring: ExportQuery }>('/api/v1/devices/:id/readings/export', {
    schema: {
      tags: ['Riwayat sensor'],
      summary: 'Ekspor riwayat readings sebagai workbook Excel',
      params: paramsSchema,
      querystring: querySchema,
      produces: [mimeType],
      response: {
        200: {
          description: 'Workbook Excel berisi log sensor dan ringkasan.',
          type: 'string',
          contentEncoding: 'binary',
        },
      },
    },
    config: { scope: 'readings:read' },
  }, async (request, reply) => {
    const startedAt = performance.now();
    const actor = requireActor(request);
    enforceRequestRate(actor.id, reply);
    const releaseSlot = acquireExportSlot(actor.id, maxConcurrent, reply);
    let client: pg.PoolClient | undefined;
    let clientReleased = false;
    let transactionOpen = false;
    let disconnected = false;
    let responseStarted = false;
    let databaseQueryInFlight = false;
    let cancellation: Promise<void> | undefined;
    let resolveDisconnect!: () => void;
    const disconnectSignal = new Promise<void>(resolve => { resolveDisconnect = resolve; });
    let abortWorkbook: (() => void) | undefined;
    let outputStream: PassThrough | undefined;
    const raw = reply.raw;
    const queryClient = async <T extends pg.QueryResultRow>(text: string, values: unknown[] = []): Promise<pg.QueryResult<T>> => {
      if (disconnected || !client || clientReleased) throw new Error('Export client disconnected.');
      const currentClient = client;
      databaseQueryInFlight = true;
      try {
        return await currentClient.query<T>(text, values as never);
      } finally {
        databaseQueryInFlight = false;
      }
    };
    const cancelOnDisconnect = () => {
      if (raw.writableFinished || disconnected) return;
      disconnected = true;
      resolveDisconnect();
      abortWorkbook?.();
      outputStream?.destroy();
      if (client && !clientReleased && databaseQueryInFlight) {
        const currentClient = client;
        const processId = (currentClient as pg.PoolClient & { processID?: number }).processID;
        if (typeof processId === 'number') {
          cancellation = cancelBackendQuery(pool, processId).then(cancelled => {
            if (!cancelled && databaseQueryInFlight && client === currentClient && !clientReleased) {
              // The query may have completed during cancellation; destroy only if it is still in flight.
              clientReleased = true;
              currentClient.release(true);
              client = undefined;
            }
          }).catch(() => {
            if (databaseQueryInFlight && client === currentClient && !clientReleased) {
              // Fallback only when backend cancellation failed and the request still holds an active query.
              clientReleased = true;
              currentClient.release(true);
              client = undefined;
            }
          });
        }
      }
    };
    const socket = request.raw.socket;
    raw.once('close', cancelOnDisconnect);
    socket.once('close', cancelOnDisconnect);

    try {
      const connection = pool.connect().then(acquired => {
        if (disconnected) {
          acquired.release();
          return null;
        }
        return acquired;
      });
      void connection.catch(() => undefined);
      const acquired = await Promise.race([connection, disconnectSignal.then(() => null)]);
      if (!acquired) return;
      client = acquired;
      if (disconnected) {
        client.release();
        client = undefined;
        clientReleased = true;
        return;
      }
      await queryClient('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      transactionOpen = true;

      // historyDevice only needs query(); keeping it on the pinned client makes disconnect cancellation reliable.
      const queryPool = { query: queryClient } as unknown as pg.Pool;
      const device = await historyDevice(queryPool, request, request.params.id);
      const sensors = await deviceSensors(queryPool, device.type_id, device.area_ref);
      const sensor = request.query.sensor ? sensors.find(item => item.code === request.query.sensor) : undefined;
      if (request.query.sensor && !sensor) failV1(404, 'NOT_FOUND', 'Sensor tidak ditemukan pada device.');
      const thresholdSourcesResult = await queryClient<ThresholdSources>(
        `SELECT st.code AS sensor_code,
           CASE WHEN at.warn_low IS NOT NULL THEN 'area' ELSE 'default' END AS low_source,
           CASE WHEN at.warn_high IS NOT NULL THEN 'area' ELSE 'default' END AS high_source
         FROM sensor_types st
         LEFT JOIN area_thresholds at ON at.area_ref=$1 AND at.sensor_code=st.code
         WHERE st.code=ANY($2::text[])`,
        [device.area_ref, sensors.map(item => item.code)],
      );
      const thresholdSources = new Map(thresholdSourcesResult.rows.map(row => [row.sensor_code, row]));
      const timezone = request.query.tz ?? 'Asia/Jakarta';
      const formatter = validateTimezone(timezone);
      const range = parseRange(request.query.from, request.query.to);
      const sensorCodes = sensors.map(item => item.code);
      const filterValues = [device.id, device.ownership_ids, sensor?.code ?? null, range.from, range.to, sensorCodes];
      const filterSql = `r.device_id=$1
        AND ($2::uuid[] IS NULL OR r.ownership_id=ANY($2::uuid[]))
        AND ($3::text IS NULL OR r.readings ? $3::text)
        AND r.measured_at >= $4::timestamptz AND r.measured_at < $5::timestamptz`;
      const countResult = await queryClient<{ row_count: string }>(
        `SELECT count(*) AS row_count FROM readings r WHERE ${filterSql}`,
        filterValues.slice(0, 5),
      );
      const rowCount = BigInt(countResult.rows[0].row_count);
      if (rowCount > BigInt(maxRows)) {
        failV1(400, 'VALIDATION_FAILED', `Jumlah data (${rowCount}) melebihi batas ekspor (${maxRows}). Persempit rentang waktu atau pilih satu sensor.`);
      }

      const aggregates = await queryClient<SensorSummary>(
        `WITH filtered AS (
           SELECT r.readings FROM readings r WHERE ${filterSql}
         )
         SELECT item.key AS sensor_code,count(*) AS sample_count,
           min(item.value::double precision) AS min_value,
           avg(item.value::double precision) AS average_value,
           max(item.value::double precision) AS max_value
         FROM filtered f
         CROSS JOIN LATERAL jsonb_each_text(f.readings) AS item(key,value)
         WHERE item.key=ANY($6::text[])
         GROUP BY item.key`,
        filterValues,
      );
      const aggregateBySensor = new Map(aggregates.rows.map(row => [row.sensor_code, row]));
      const createdAt = new Date();
      const filename = safeFilename(device.code, range.from, range.to);

      outputStream = new PassThrough();
      outputStream.on('error', () => undefined);
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: outputStream, useStyles: true, useSharedStrings: false });
      const archive = (workbook as unknown as { zip: { abort: () => void; on: (event: string, listener: () => void) => void } }).zip;
      archive.on('error', () => undefined);
      abortWorkbook = () => archive.abort();
      workbook.creator = 'JagoFarm';
      workbook.lastModifiedBy = 'JagoFarm';
      workbook.created = createdAt;
      workbook.modified = createdAt;
      workbook.subject = 'Ekspor log sensor';
      workbook.title = `Log sensor ${device.code}`;

      const logSheet = workbook.addWorksheet('Log sensor', { views: [{ state: 'frozen', ySplit: 1 }] });
      const columns: Array<{ header: string; key: string; width: number; style?: { numFmt: string } }> = [
        { header: `Waktu ukur (${timezone})`, key: 'measuredLocal', width: 24, style: { numFmt: localDateFormat } },
        { header: 'Waktu ukur (UTC)', key: 'measuredUtc', width: 26 },
        { header: `Waktu diterima (${timezone})`, key: 'receivedLocal', width: 26, style: { numFmt: localDateFormat } },
      ];
      for (const configuredSensor of sensors) {
        columns.push(
          { header: `${configuredSensor.name} (${configuredSensor.unit})`, key: `sensor:${configuredSensor.code}`, width: Math.max(16, configuredSensor.name.length + configuredSensor.unit.length + 4), style: { numFmt: numberFormat(configuredSensor.decimals) } },
          { header: `Status ${configuredSensor.name}`, key: `status:${configuredSensor.code}`, width: Math.max(22, configuredSensor.name.length + 10) },
        );
      }
      logSheet.columns = columns;
      logSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

      const summarySheet = workbook.addWorksheet('Ringkasan');
      summarySheet.columns = [{ width: 30 }, { width: 42 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 22 }];
      const addSummaryRow = (values: ExcelJS.CellValue[]) => summarySheet.addRow(values).commit();
      addSummaryRow(['Informasi', 'Nilai']);
      addSummaryRow(['Nama perangkat', String(device.name)]);
      addSummaryRow(['Kode perangkat', device.code]);
      addSummaryRow(['Tipe perangkat', `${device.type_code} (${device.type_kind})`]);
      addSummaryRow(['AreaRef', device.area_ref]);
      addSummaryRow(['Rentang dari (UTC)', range.from]);
      addSummaryRow(['Rentang sampai (UTC)', range.to]);
      addSummaryRow(['Zona waktu', timezone]);
      addSummaryRow(['Jumlah baris', Number(rowCount)]);
      addSummaryRow(['Dibuat', createdAt.toISOString()]);
      addSummaryRow(['Catatan status', 'Status dihitung memakai ambang yang efektif pada waktu ekspor.']);
      addSummaryRow([]);
      const statsHeaders = [
        'Sensor', 'Kode sensor', 'Satuan', 'Jumlah sampel', 'Minimum', 'Rata-rata', 'Maksimum',
        'Ambang rendah', 'Sumber ambang rendah', 'Ambang tinggi', 'Sumber ambang tinggi',
      ];
      addSummaryRow(statsHeaders);
      for (const configuredSensor of sensors) {
        const values = aggregateBySensor.get(configuredSensor.code);
        const format = numberFormat(configuredSensor.decimals);
        const row = summarySheet.addRow([
          configuredSensor.name,
          configuredSensor.code,
          configuredSensor.unit,
          Number(values?.sample_count ?? 0),
          values?.min_value == null ? null : Number(values.min_value),
          values?.average_value == null ? null : Number(values.average_value),
          values?.max_value == null ? null : Number(values.max_value),
          configuredSensor.threshold.low,
          thresholdSources.get(configuredSensor.code)?.low_source ?? configuredSensor.threshold.source,
          configuredSensor.threshold.high,
          thresholdSources.get(configuredSensor.code)?.high_source ?? configuredSensor.threshold.source,
        ]);
        for (const column of [5, 6, 7, 8, 10]) row.getCell(column).numFmt = format;
        row.commit();
      }

      const headers = reply.getHeaders();
      reply.hijack();
      responseStarted = true;
      request.v1ExportUsageHandled = true;
      raw.statusCode = 200;
      for (const [name, value] of Object.entries(headers)) {
        if (value !== undefined) raw.setHeader(name, value);
      }
      raw.setHeader('Cache-Control', 'no-store');
      raw.setHeader('X-Content-Type-Options', 'nosniff');
      raw.setHeader('Content-Type', mimeType);
      raw.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const rawFinished = new Promise<void>((resolve, reject) => {
        raw.once('finish', resolve);
        raw.once('error', reject);
      });
      raw.once('error', cancelOnDisconnect);
      outputStream.pipe(raw);

      let lastMeasuredAt: Date | string | null = null;
      let lastMessageId: string | null = null;
      while (!disconnected) {
        const batch: pg.QueryResult<ExportReading> = await queryClient<ExportReading>(
          `SELECT r.message_id,r.measured_at,r.received_at,r.readings
           FROM readings r
           WHERE ${filterSql}
             AND ($6::timestamptz IS NULL OR (r.measured_at,r.message_id)>($6::timestamptz,$7::uuid))
           ORDER BY r.measured_at ASC,r.message_id ASC
           LIMIT $8`,
          [...filterValues.slice(0, 5), lastMeasuredAt, lastMessageId, batchSize],
        );
        if (!batch.rows.length) break;
        for (const reading of batch.rows as ExportReading[]) {
          const values: ExcelJS.CellValue[] = [
            excelLocalDate(reading.measured_at, formatter),
            iso(reading.measured_at),
            excelLocalDate(reading.received_at, formatter),
          ];
          for (const configuredSensor of sensors) {
            const rawValue = reading.readings?.[configuredSensor.code];
            const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null;
            values.push(value, sensorStatus(value, configuredSensor));
          }
          logSheet.addRow(values).commit();
          lastMeasuredAt = reading.measured_at;
          lastMessageId = reading.message_id;
        }
        if (batch.rows.length < batchSize) break;
      }
      if (disconnected) return;
      const workbookCommit = workbook.commit();
      void workbookCommit.catch(() => undefined);
      const completed = await Promise.race([
        workbookCommit.then(() => true),
        disconnectSignal.then(() => false),
      ]);
      if (!completed || disconnected) return;
      const responseCompleted = await Promise.race([
        rawFinished.then(() => true),
        disconnectSignal.then(() => false),
      ]);
      if (!responseCompleted || disconnected) return;
      await queryClient('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (!responseStarted) {
        if (disconnected) return;
        throw error;
      }
      if (!disconnected) {
        request.log.error({ err: error, requestId: request.id }, 'Gagal membuat ekspor readings.');
        if (!raw.writableFinished) raw.destroy();
      }
    } finally {
      if (cancellation) await cancellation;
      raw.removeListener('close', cancelOnDisconnect);
      raw.removeListener('error', cancelOnDisconnect);
      socket.removeListener('close', cancelOnDisconnect);
      if (!responseStarted && outputStream) {
        abortWorkbook?.();
        outputStream.destroy();
      }
      if (transactionOpen && client && !clientReleased) {
        try { await client.query('ROLLBACK'); } catch { /* The connection may already have been cancelled. */ }
        transactionOpen = false;
      }
      if (client && !clientReleased) {
        client.release();
        clientReleased = true;
      }
      releaseSlot();
      if (responseStarted) await logApiKeyUsage(pool, request, raw.statusCode, startedAt);
    }
  });
}
