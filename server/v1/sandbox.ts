import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { transaction } from '../db.js';
import { ensureSandboxDevice } from '../sandbox/provision.js';
import { failV1, requireActor, shortTextSchema, uuidSchema, v1Object } from './common.js';

const scenarios = ['normal', 'ph_turun', 'suhu_naik', 'offline'] as const;
const scenarioSchema = v1Object({ scenario: { type: 'string', enum: [...scenarios] } });
const deviceParams = v1Object({ id: uuidSchema });
const dateOrNull = { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] };
const sandboxDeviceSchema = v1Object({
  id: uuidSchema,
  code: { type: 'string', pattern: '^AQ-SBX-[0-9]{3,}$' },
  name: shortTextSchema,
  scenario: { type: 'string', enum: [...scenarios] },
  areaRef: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  measuredAt: dateOrNull,
  readings: { anyOf: [{ type: 'object', additionalProperties: { type: 'number' } }, { type: 'null' }] },
});
const sandboxListSchema = v1Object({ devices: { type: 'array', items: sandboxDeviceSchema } });

export function registerSandboxRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get('/api/v1/sandbox/devices', {
    schema: { tags: ['Sandbox'], summary: 'Daftar device sandbox milik actor', response: { 200: sandboxListSchema } },
  }, async request => {
    const actor = requireActor(request);
    if (actor.kind === 'key' && actor.environment !== 'test') failV1(404, 'NOT_FOUND', 'Device sandbox tidak ditemukan.');
    if (!actor.scopes.includes('devices:read')) failV1(403, 'FORBIDDEN_SCOPE', 'Scope devices:read diperlukan.');
    await transaction(pool, client => ensureSandboxDevice(client, actor.userId));
    const devices = await pool.query<{
      id: string;
      code: string;
      name: string;
      sandbox_scenario: typeof scenarios[number];
      area_ref: string | null;
      measured_at: Date | string | null;
      readings: Record<string, number> | null;
    }>(
      `SELECT d.id,d.code,d.name,d.sandbox_scenario,d.area_ref,
         latest.measured_at,latest.readings
       FROM sandbox_accounts s
       JOIN devices d ON d.id=s.device_id AND d.is_sandbox=true
       JOIN ownerships o ON o.device_id=d.id AND o.user_id=s.user_id AND o.ended_at IS NULL
       LEFT JOIN LATERAL (
         SELECT r.measured_at,r.readings FROM readings r
         WHERE r.ownership_id=o.id ORDER BY r.measured_at DESC,r.message_id DESC LIMIT 1
       ) latest ON true
       WHERE s.user_id=$1 ORDER BY d.code`,
      [actor.userId],
    );
    return {
      devices: devices.rows.map(device => ({
        id: device.id,
        code: device.code,
        name: device.name,
        scenario: device.sandbox_scenario,
        areaRef: device.area_ref,
        measuredAt: device.measured_at ? new Date(device.measured_at).toISOString() : null,
        readings: device.readings,
      })),
    };
  });

  app.put<{ Params: { id: string }; Body: { scenario: typeof scenarios[number] } }>('/api/v1/sandbox/devices/:id/scenario', {
    schema: { tags: ['Sandbox'], summary: 'Mengubah skenario device sandbox milik actor', params: deviceParams, body: scenarioSchema },
  }, async request => {
    const actor = requireActor(request);
    if (actor.kind === 'key' && actor.environment !== 'test') failV1(404, 'NOT_FOUND', 'Device sandbox tidak ditemukan.');
    if (!actor.scopes.includes('devices:write')) failV1(403, 'FORBIDDEN_SCOPE', 'Scope devices:write diperlukan.');
    const updated = await pool.query<{ id: string; sandbox_scenario: typeof scenarios[number] }>(
      `UPDATE devices d SET sandbox_scenario=$3
       WHERE d.id=$1 AND d.is_sandbox=true AND EXISTS (
         SELECT 1 FROM ownerships o WHERE o.device_id=d.id AND o.user_id=$2 AND o.ended_at IS NULL
       )
       RETURNING d.id,d.sandbox_scenario`,
      [request.params.id, actor.userId, request.body.scenario],
    );
    if (!updated.rowCount) failV1(404, 'NOT_FOUND', 'Device sandbox tidak ditemukan.');
    return { deviceId: updated.rows[0].id, scenario: updated.rows[0].sandbox_scenario };
  });
}
