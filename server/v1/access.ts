import type { FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { Actor } from '../auth/session.js';
import { failV1, requireActor, sandboxScope } from './common.js';

export type VisibleDevice = {
  id: string;
  type_id: string;
  area_ref: string | null;
  is_sandbox: boolean;
  owner_id: string | null;
  ownership_id: string | null;
  is_admin: boolean;
};

export async function visibleDevice(pool: pg.Pool, request: FastifyRequest, deviceId: string): Promise<VisibleDevice> {
  const actor = requireActor(request);
  const isAdmin = actor.scopes.includes('admin');
  const row = (await pool.query<VisibleDevice>(
    `SELECT d.id,d.type_id,d.area_ref,d.is_sandbox,
       o.user_id AS owner_id,o.id AS ownership_id
     FROM devices d
     LEFT JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
     WHERE d.id=$1 AND ($2::boolean IS NULL OR d.is_sandbox=$2)`,
    [deviceId, sandboxScope(actor)],
  )).rows[0];
  if (!row || (!isAdmin && row.owner_id !== actor.id)) failV1(404, 'NOT_FOUND', 'Device tidak ditemukan.');
  return { ...row, is_admin: isAdmin };
}

export async function actorCanSeeDevice(pool: pg.Pool, actor: Actor, deviceId: string): Promise<boolean> {
  const isAdmin = actor.scopes.includes('admin');
  const row = (await pool.query<VisibleDevice>(
    `SELECT d.id,d.type_id,d.area_ref,d.is_sandbox,
       o.user_id AS owner_id,o.id AS ownership_id
     FROM devices d
     LEFT JOIN ownerships o ON o.device_id=d.id AND o.ended_at IS NULL
     WHERE d.id=$1 AND ($2::boolean IS NULL OR d.is_sandbox=$2)`,
    [deviceId, sandboxScope(actor)],
  )).rows[0];
  if (!row || (!isAdmin && row.owner_id !== actor.id)) return false;
  if (actor.kind === 'key') {
    const key = await pool.query(
      `SELECT 1 FROM api_keys
       WHERE id=$1 AND user_id=$2 AND environment=$3 AND revoked_at IS NULL
         AND scopes @> ARRAY['readings:read']::text[]`,
      [actor.keyId, actor.id, actor.environment],
    );
    if (!key.rowCount) return false;
  }
  return true;
}
