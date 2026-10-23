import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { transaction } from '../database/db.js';
import { deviceSensors } from '../v1/monitoring-state.js';
import { ingestSandboxV2, type IngestPublisher } from '../v1/ingest.js';

export const SANDBOX_CYCLE_INTERVAL_MS = 30_000;
export const SANDBOX_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type SandboxScheduler = {
  every: (callback: () => void, delayMs: number) => () => void;
};

const systemScheduler: SandboxScheduler = {
  every(callback, delayMs) {
    const timer = setInterval(callback, delayMs);
    timer.unref();
    return () => clearInterval(timer);
  },
};

type NonOverlappingTask = {
  run: () => Promise<void>;
  wait: () => Promise<void>;
};

export function createNonOverlappingTask(task: () => Promise<void>): NonOverlappingTask {
  let active: Promise<void> | null = null;
  return {
    run() {
      if (active) return active;
      const running = Promise.resolve().then(task).finally(() => {
        if (active === running) active = null;
      });
      active = running;
      return running;
    },
    wait() {
      return active ? active.catch(() => undefined) : Promise.resolve();
    },
  };
}

type SandboxRow = { id: string; type_id: string; area_ref: string | null; scenario: string; type_code: string };

function sensorValue(sensor: Awaited<ReturnType<typeof deviceSensors>>[number], scenario: string): number {
  if (sensor.code === 'ph' && scenario === 'ph_turun' && sensor.threshold.low !== null) {
    const gap = Math.min(0.5, Math.max(0.1, (sensor.threshold.low - sensor.min) * 0.02));
    return Math.max(sensor.min, sensor.threshold.low - gap);
  }
  if (sensor.code === 'water_temperature' && scenario === 'suhu_naik' && sensor.threshold.high !== null) {
    const gap = Math.min(2, Math.max(0.5, (sensor.max - sensor.threshold.high) * 0.02));
    return Math.min(sensor.max, sensor.threshold.high + gap);
  }
  if (sensor.code === 'ph') return Math.min(sensor.max, Math.max(sensor.min, 7.0));
  if (sensor.code === 'tds') return Math.min(sensor.max, Math.max(sensor.min, 620));
  if (sensor.code === 'water_temperature') return Math.min(sensor.max, Math.max(sensor.min, 27));
  if (sensor.threshold.low !== null && sensor.threshold.high !== null) {
    return Math.min(sensor.max, Math.max(sensor.min, (sensor.threshold.low + sensor.threshold.high) / 2));
  }
  return (sensor.min + sensor.max) / 2;
}

export async function runSandboxCycle(pool: pg.Pool, publisher?: IngestPublisher, now: number | Date = Date.now()): Promise<number> {
  const measuredAt = (now instanceof Date ? now : new Date(now)).toISOString();
  const devices = await pool.query<SandboxRow>(
    `SELECT d.id,d.type_id,d.area_ref,d.sandbox_scenario AS scenario,t.code AS type_code
     FROM devices d JOIN device_types t ON t.id=d.type_id
     JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
     WHERE d.is_sandbox=true ORDER BY d.id`,
  );
  let ingested = 0;
  for (const device of devices.rows) {
    if (device.scenario === 'offline') continue;
    const sensors = await deviceSensors(pool, device.type_id, device.area_ref);
    const readings = Object.fromEntries(sensors.map(sensor => [sensor.code, sensorValue(sensor, device.scenario)]));
    await ingestSandboxV2(pool, {
      version: 2,
      deviceId: device.id,
      type: device.type_code,
      messageId: randomUUID(),
      measuredAt,
      readings,
      meta: {},
    }, publisher);
    ingested++;
  }
  return ingested;
}

export async function cleanupSandboxRetention(pool: pg.Pool, retentionDays: number, now: number | Date = Date.now()) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new RangeError('SANDBOX_RETENTION_DAYS must be an integer between 1 and 3650');
  }
  const nowMs = now instanceof Date ? now.getTime() : now;
  const cutoff = new Date(nowMs - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  return transaction(pool, async client => {
    await client.query('SELECT id FROM devices WHERE is_sandbox=true ORDER BY id FOR UPDATE');
    const readings = await client.query(
      `DELETE FROM readings r USING devices d
       WHERE r.device_id=d.id AND d.is_sandbox=true AND r.received_at<$1::timestamptz`,
      [cutoff],
    );
    const events = await client.query(
      `DELETE FROM device_events e USING devices d
       WHERE e.device_id=d.id AND d.is_sandbox=true AND e.at<$1::timestamptz
         AND NOT (
           (e.type IN ('threshold_low','threshold_high','threshold_clear') AND NOT EXISTS (
             SELECT 1 FROM device_events newer
             WHERE newer.device_id=e.device_id
               AND newer.sensor_code IS NOT DISTINCT FROM e.sensor_code
               AND newer.type IN ('threshold_low','threshold_high','threshold_clear')
               AND newer.id>e.id
           ))
           OR
           (e.type IN ('online','offline') AND e.sensor_code IS NULL AND NOT EXISTS (
             SELECT 1 FROM device_events newer
             WHERE newer.device_id=e.device_id AND newer.sensor_code IS NULL
               AND newer.type IN ('online','offline') AND newer.id>e.id
           ))
         )`,
      [cutoff],
    );
    return { readingsDeleted: readings.rowCount ?? 0, eventsDeleted: events.rowCount ?? 0 };
  });
}

export type SandboxRunnerOptions = {
  scheduler?: SandboxScheduler;
  enableCycles?: boolean;
  runCycle?: () => Promise<void>;
  runRetention?: () => Promise<void>;
  onError?: (error: unknown, task: 'cycle' | 'retention') => void;
};

export function startSandboxRunner(
  pool: pg.Pool,
  publisher: IngestPublisher,
  retentionDays: number,
  options: SandboxRunnerOptions = {},
) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new RangeError('SANDBOX_RETENTION_DAYS must be an integer between 1 and 3650');
  }
  const scheduler = options.scheduler ?? systemScheduler;
  const onError = options.onError ?? (() => undefined);
  const cycle = createNonOverlappingTask(options.runCycle ?? (async () => { await runSandboxCycle(pool, publisher); }));
  const retention = createNonOverlappingTask(options.runRetention ?? (async () => { await cleanupSandboxRetention(pool, retentionDays); }));
  const safeRun = (task: NonOverlappingTask, name: 'cycle' | 'retention') => {
    void task.run().catch(error => onError(error, name));
  };
  const enableCycles = options.enableCycles ?? true;
  const cancelCycle = enableCycles
    ? scheduler.every(() => safeRun(cycle, 'cycle'), SANDBOX_CYCLE_INTERVAL_MS)
    : () => undefined;
  const cancelRetention = scheduler.every(() => safeRun(retention, 'retention'), SANDBOX_RETENTION_INTERVAL_MS);
  if (enableCycles) safeRun(cycle, 'cycle');
  safeRun(retention, 'retention');
  let stopped = false;
  return {
    async stop() {
      if (stopped) return;
      stopped = true;
      cancelCycle();
      cancelRetention();
      await Promise.all([cycle.wait(), retention.wait()]);
    },
  };
}
