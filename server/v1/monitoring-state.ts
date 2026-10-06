import type pg from 'pg';
import type { DeviceEvent, EventType } from './events.js';

type Queryable = pg.Pool | pg.PoolClient;
export type ThresholdSource = 'area' | 'default';
export type EffectiveThreshold = { low: number | null; high: number | null; source: ThresholdSource };
export type DeviceSensor = {
  code: string;
  name: string;
  unit: string;
  decimals: number;
  min: number;
  max: number;
  threshold: EffectiveThreshold;
};
export type SensorState = 'normal' | 'low' | 'high' | 'unknown';

type SensorRow = {
  code: string;
  name: string;
  unit: string;
  decimals: number;
  min_value: number | string;
  max_value: number | string;
  warn_low: number | string | null;
  warn_high: number | string | null;
  threshold_source: ThresholdSource;
};

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

async function insertDeviceEvent(
  client: pg.PoolClient,
  deviceId: string,
  type: EventType,
  sensor: string | null,
  value: number | null,
  at: string | null,
): Promise<DeviceEvent> {
  const row = (await client.query<{
    id: string;
    device_id: string;
    type: EventType;
    sensor_code: string | null;
    value: number | string | null;
    at: Date | string;
  }>(
    `INSERT INTO device_events(device_id,type,sensor_code,value,at)
     VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,clock_timestamp()))
     RETURNING id::text AS id,device_id,type,sensor_code,value,at`,
    [deviceId, type, sensor, value, at],
  )).rows[0];
  return {
    id: row.id,
    deviceId: row.device_id,
    type: row.type,
    sensor: row.sensor_code,
    value: row.value === null ? null : Number(row.value),
    at: new Date(row.at).toISOString(),
  };
}

export async function deviceSensors(client: Queryable, typeId: string, areaRef: string | null): Promise<DeviceSensor[]> {
  const result = await client.query<SensorRow>(
    `SELECT st.code,st.name,st.unit,st.decimals,st.min_value,st.max_value,
       COALESCE(at.warn_low,st.warn_low) AS warn_low,
       COALESCE(at.warn_high,st.warn_high) AS warn_high,
       CASE WHEN at.area_ref IS NOT NULL AND (at.warn_low IS NOT NULL OR at.warn_high IS NOT NULL)
         THEN 'area' ELSE 'default' END AS threshold_source
     FROM device_type_sensors dts
     JOIN sensor_types st ON st.code=dts.sensor_code
     LEFT JOIN area_thresholds at ON at.area_ref=$2 AND at.sensor_code=dts.sensor_code
     WHERE dts.type_id=$1
     ORDER BY st.code`,
    [typeId, areaRef],
  );
  return result.rows.map(row => ({
    code: row.code,
    name: row.name,
    unit: row.unit,
    decimals: Number(row.decimals),
    min: Number(row.min_value),
    max: Number(row.max_value),
    threshold: {
      low: nullableNumber(row.warn_low),
      high: nullableNumber(row.warn_high),
      source: row.threshold_source,
    },
  }));
}

export function sensorState(value: number | null, threshold: EffectiveThreshold): SensorState {
  if (value === null || (threshold.low === null && threshold.high === null)) return 'unknown';
  if (threshold.low !== null && value < threshold.low) return 'low';
  if (threshold.high !== null && value > threshold.high) return 'high';
  return 'normal';
}

export async function recordReadingEvents(
  client: pg.PoolClient,
  deviceId: string,
  typeId: string,
  areaRef: string | null,
  readings: Record<string, number>,
  messageId: string,
  measuredAt: string,
): Promise<DeviceEvent[]> {
  const events: DeviceEvent[] = [];
  const latestReading = await client.query<{ message_id: string }>(
    `SELECT message_id FROM readings
     WHERE device_id=$1
     ORDER BY measured_at DESC,message_id DESC
     LIMIT 1`,
    [deviceId],
  );
  if (latestReading.rows[0]?.message_id === messageId) {
    const sensors = await deviceSensors(client, typeId, areaRef);
    const previousEvents = await client.query<{ sensor_code: string; type: string }>(
      `SELECT DISTINCT ON (sensor_code) sensor_code,type
       FROM device_events
       WHERE device_id=$1 AND sensor_code IS NOT NULL
         AND type IN ('threshold_low','threshold_high','threshold_clear')
       ORDER BY sensor_code,id DESC`,
      [deviceId],
    );
    const previousBySensor = new Map(previousEvents.rows.map(row => [row.sensor_code, row.type]));

    for (const sensor of sensors) {
      const value = readings[sensor.code];
      if (typeof value !== 'number') continue;
      const state = sensorState(value, sensor.threshold);
      const previousEvent = previousBySensor.get(sensor.code);
      const previousState = previousEvent === 'threshold_low'
        ? 'low'
        : previousEvent === 'threshold_high'
          ? 'high'
          : 'normal';
      const wasOutOfRange = previousEvent === 'threshold_low' || previousEvent === 'threshold_high';
      const isOutOfRange = state === 'low' || state === 'high';

      if (wasOutOfRange && state !== previousState) {
        events.push(await insertDeviceEvent(client, deviceId, 'threshold_clear', sensor.code, value, measuredAt));
      }
      if (isOutOfRange && (!wasOutOfRange || state !== previousState)) {
        events.push(await insertDeviceEvent(client, deviceId, state === 'low' ? 'threshold_low' : 'threshold_high', sensor.code, value, measuredAt));
      }
    }
  }

  const connection = await client.query<{ type: string }>(
    `SELECT type FROM device_events
     WHERE device_id=$1 AND sensor_code IS NULL AND type IN ('online','offline')
     ORDER BY id DESC LIMIT 1`,
    [deviceId],
  );
  if (connection.rows[0]?.type === 'offline') {
    events.push(await insertDeviceEvent(client, deviceId, 'online', null, null, null));
  }
  return events;
}
