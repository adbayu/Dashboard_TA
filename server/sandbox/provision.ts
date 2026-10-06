import { randomUUID } from 'node:crypto';
import type pg from 'pg';

export type SandboxDevice = {
  id: string;
  code: string;
  name: string;
  type_id: string;
  area_ref: string | null;
  sandbox_scenario: string;
};

export async function ensureSandboxDevice(client: pg.PoolClient, userId: string): Promise<SandboxDevice> {
  await client.query('SELECT pg_advisory_xact_lock(90260910)');
  let device = (await client.query<SandboxDevice>(
    `SELECT d.id,d.code,d.name,d.type_id,d.area_ref,d.sandbox_scenario
     FROM sandbox_accounts s JOIN devices d ON d.id=s.device_id
     WHERE s.user_id=$1 AND d.is_sandbox=true
     FOR UPDATE OF d`,
    [userId],
  )).rows[0];

  if (!device) {
    device = (await client.query<SandboxDevice>(
      `SELECT d.id,d.code,d.name,d.type_id,d.area_ref,d.sandbox_scenario
       FROM devices d
       WHERE d.is_sandbox=true AND (
         d.allocated_to=$1 OR EXISTS (
           SELECT 1 FROM ownerships o WHERE o.device_id=d.id AND o.user_id=$1 AND o.ended_at IS NULL
         )
       )
       ORDER BY d.id LIMIT 1 FOR UPDATE OF d`,
      [userId],
    )).rows[0];
  }

  if (!device) {
    const type = (await client.query<{ id: string }>(
      "SELECT id FROM device_types WHERE code='AQ-WATER-01' AND active=true",
    )).rows[0];
    if (!type) throw new Error('AQ-WATER-01 device type is unavailable');
    const code = (await client.query<{ code: string }>(
      "SELECT 'AQ-SBX-' || lpad(nextval('sandbox_device_code_seq')::text,3,'0') AS code",
    )).rows[0].code;
    const id = randomUUID();
    device = (await client.query<SandboxDevice>(
      `INSERT INTO devices(id,name,model,credential_hash,allocated_to,code,type_id,is_sandbox,sandbox_scenario)
       VALUES($1,$2,NULL,NULL,$3,$4,$5,true,'normal')
       RETURNING id,code,name,type_id,area_ref,sandbox_scenario`,
      [id, `Simulasi ${code}`, userId, code, type.id],
    )).rows[0];
  }

  const owner = (await client.query<{ user_id: string }>(
    'SELECT user_id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL FOR UPDATE',
    [device.id],
  )).rows[0];
  if (owner && owner.user_id !== userId) throw new Error('Sandbox device ownership is inconsistent');
  if (!owner) {
    await client.query('INSERT INTO ownerships(id,device_id,user_id) VALUES($1,$2,$3)', [randomUUID(), device.id, userId]);
  }
  await client.query(
    'INSERT INTO sandbox_accounts(user_id,device_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',
    [userId, device.id],
  );
  const mapped = (await client.query<{ device_id: string }>('SELECT device_id FROM sandbox_accounts WHERE user_id=$1', [userId])).rows[0];
  if (mapped.device_id !== device.id) throw new Error('Sandbox account already maps to a different device');
  return device;
}
