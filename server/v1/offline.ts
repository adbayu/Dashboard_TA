import type pg from 'pg';
import { transaction } from '../db.js';
import { DEVICE_OFFLINE_AFTER_MS } from '../domain.js';
import type { DeviceEvent } from './events.js';

export const OFFLINE_SCAN_INTERVAL_MS = 60_000;

export async function runOfflineDetection(
  pool: pg.Pool,
  now: number | Date = Date.now(),
  publishAfterCommit?: (events: DeviceEvent[]) => Promise<void>,
): Promise<number> {
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowIso = nowDate.toISOString();
  const offlineBefore = new Date(nowDate.getTime() - DEVICE_OFFLINE_AFTER_MS).toISOString();
  const events = await transaction(pool, async client => {
    const staleDevices = await client.query<{ id: string }>(
      `SELECT d.id
       FROM devices d
       JOIN LATERAL (
         SELECT r.received_at
         FROM readings r
         WHERE r.device_id=d.id
         ORDER BY r.received_at DESC,r.message_id DESC
         LIMIT 1
       ) latest ON true
       WHERE latest.received_at <= $1::timestamptz
       ORDER BY d.id
       FOR UPDATE OF d SKIP LOCKED`,
      [offlineBefore],
    );

    const inserted: DeviceEvent[] = [];
    for (const device of staleDevices.rows) {
      const latestConnection = await client.query<{ type: string }>(
        `SELECT type FROM device_events
         WHERE device_id=$1 AND sensor_code IS NULL AND type IN ('online','offline')
         ORDER BY id DESC LIMIT 1`,
        [device.id],
      );
      if (latestConnection.rows[0]?.type === 'offline') continue;
      const event = (await client.query<{
        id: string;
        device_id: string;
        type: DeviceEvent['type'];
        sensor_code: string | null;
        value: number | string | null;
        at: Date | string;
      }>(
        `INSERT INTO device_events(device_id,type,at)
         VALUES($1,'offline',$2::timestamptz)
         RETURNING id::text AS id,device_id,type,sensor_code,value,at`,
        [device.id, nowIso],
      )).rows[0];
      inserted.push({
        id: event.id,
        deviceId: event.device_id,
        type: event.type,
        sensor: event.sensor_code,
        value: event.value === null ? null : Number(event.value),
        at: new Date(event.at).toISOString(),
      });
    }
    return inserted;
  });
  if (events.length && publishAfterCommit) await publishAfterCommit(events);
  return events.length;
}
