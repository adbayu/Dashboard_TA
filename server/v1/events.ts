import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import type { Actor } from '../auth/session.js';
import { failV1, requireActor, sandboxScope, uuidSchema, v1Object } from './common.js';
import { visibleDevice } from './access.js';

export const eventTypes = ['online', 'offline', 'threshold_low', 'threshold_high', 'threshold_clear'] as const;
export type EventType = typeof eventTypes[number];
type EventQuery = { deviceId?: string; type?: EventType; cursor?: string; limit?: string };
type EventRow = {
  id: string;
  device_id: string;
  type: EventType;
  sensor_code: string | null;
  value: number | string | null;
  at: Date | string;
};
export type DeviceEvent = { id: string; deviceId: string; type: EventType; sensor: string | null; value: number | null; at: string };
type VisibleEventQuery = { deviceId?: string; type?: EventType; eventId?: string; beforeId?: string; afterId?: string; limit: number; order: 'ASC' | 'DESC' };

const querySchema = v1Object({
  deviceId: uuidSchema,
  type: { type: 'string', enum: [...eventTypes] },
  cursor: { type: 'string', maxLength: 200 },
  limit: { type: 'string', pattern: '^[1-9][0-9]{0,2}$' },
}, []);

function cursorId(cursor: string | undefined): string | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!/^[1-9][0-9]{0,18}$/.test(decoded) || BigInt(decoded) > 9_223_372_036_854_775_807n) throw new Error();
    return decoded;
  } catch {
    failV1(400, 'VALIDATION_FAILED', 'Cursor kejadian tidak valid.');
  }
}

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

export async function queryVisibleEvents(pool: pg.Pool, actor: Actor, query: VisibleEventQuery): Promise<DeviceEvent[]> {
  const values: unknown[] = [];
  const filters: string[] = [];
  const isAdmin = actor.scopes.includes('admin');
  if (!isAdmin) {
    values.push(actor.id);
    filters.push(`o.user_id=$${values.length} AND e.at>=o.started_at`);
  }
  const environment = sandboxScope(actor);
  if (environment !== null) {
    values.push(environment);
    filters.push(`d.is_sandbox=$${values.length}`);
  }
  if (actor.kind === 'key') {
    values.push(actor.keyId, actor.id, actor.environment);
    filters.push(`EXISTS (
      SELECT 1 FROM api_keys k
      WHERE k.id=$${values.length - 2} AND k.user_id=$${values.length - 1}
        AND k.environment=$${values.length} AND k.revoked_at IS NULL
        AND k.scopes @> ARRAY['readings:read']::text[]
    )`);
  }
  if (query.deviceId) {
    values.push(query.deviceId);
    filters.push(`e.device_id=$${values.length}`);
  }
  if (query.type) {
    values.push(query.type);
    filters.push(`e.type=$${values.length}`);
  }
  if (query.eventId) {
    values.push(query.eventId);
    filters.push(`e.id=$${values.length}::bigint`);
  }
  if (query.beforeId) {
    values.push(query.beforeId);
    filters.push(`e.id<$${values.length}::bigint`);
  }
  if (query.afterId) {
    values.push(query.afterId);
    filters.push(`e.id>$${values.length}::bigint`);
  }
  values.push(query.limit);
  const result = await pool.query<EventRow>(
    `SELECT e.id::text AS id,e.device_id,e.type,e.sensor_code,e.value,e.at
     FROM device_events e
     JOIN devices d ON d.id=e.device_id
     LEFT JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
     WHERE ${filters.length ? filters.join(' AND ') : 'true'}
     ORDER BY e.id ${query.order} LIMIT $${values.length}`,
    values,
  );
  return result.rows.map(row => ({
    id: row.id,
    deviceId: row.device_id,
    type: row.type,
    sensor: row.sensor_code,
    value: row.value === null ? null : Number(row.value),
    at: iso(row.at),
  }));
}

export async function eventVisibleToActor(pool: pg.Pool, actor: Actor, eventId: string): Promise<boolean> {
  return (await queryVisibleEvents(pool, actor, { eventId, limit: 1, order: 'ASC' })).length === 1;
}

export function registerEventRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get<{ Querystring: EventQuery }>('/api/v1/events', {
    schema: { querystring: querySchema },
    config: { scope: 'readings:read' },
  }, async request => {
    const actor = requireActor(request);
    if (request.query.deviceId) await visibleDevice(pool, request, request.query.deviceId);
    const beforeId = cursorId(request.query.cursor);
    const limit = Number(request.query.limit ?? 50);
    if (limit > 100) failV1(400, 'VALIDATION_FAILED', 'Halaman kejadian maksimal 100 baris.');
    const result = await queryVisibleEvents(pool, actor, {
      deviceId: request.query.deviceId,
      type: request.query.type,
      beforeId: beforeId ?? undefined,
      limit: limit + 1,
      order: 'DESC',
    });
    const events = result.slice(0, limit);
    const last = events.at(-1);
    return {
      events,
      nextCursor: result.length > limit && last
        ? Buffer.from(last.id).toString('base64url')
        : null,
    };
  });
}
