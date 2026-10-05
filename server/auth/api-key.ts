import { timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { hash } from '../domain.js';
import { failV1 } from '../v1/common.js';
import type { Actor } from './session.js';
import type { ApiKeyEnvironment, ApiScope } from './types.js';

const bearerApiKey = /^Bearer (jf_(live|test)_([a-f0-9]{64}))$/;

export type ParsedApiKey = {
  token: string;
  prefix: string;
  environment: ApiKeyEnvironment;
};

export function parseApiKey(authorization: string | undefined): ParsedApiKey | null {
  const match = bearerApiKey.exec(authorization ?? '');
  if (!match) return null;
  return {
    token: match[1],
    prefix: match[1].slice(0, 12),
    environment: match[2] as ApiKeyEnvironment,
  };
}

export async function authenticateApiKey(pool: pg.Pool, parsed: ParsedApiKey): Promise<Actor> {
  const result = await pool.query<{
    id: string;
    user_id: string;
    email: string;
    role: 'admin' | 'user';
    key_hash: string;
    scopes: ApiScope[];
    environment: ApiKeyEnvironment;
    revoked_at: Date | null;
  }>(
    `SELECT k.id,k.user_id,k.key_hash,k.scopes,k.environment,k.revoked_at,u.email,u.role
     FROM api_keys k JOIN users u ON u.id=k.user_id WHERE k.prefix=$1`,
    [parsed.prefix],
  );
  const digest = hash(parsed.token);
  const digestBuffer = Buffer.from(digest, 'hex');
  const key = result.rows.find(row => {
    if (!/^[a-f0-9]{64}$/.test(row.key_hash)) return false;
    const storedDigest = Buffer.from(row.key_hash, 'hex');
    return storedDigest.length === digestBuffer.length && timingSafeEqual(storedDigest, digestBuffer);
  });
  if (!key || key.revoked_at || key.environment !== parsed.environment) {
    failV1(401, 'UNAUTHENTICATED', 'API key salah atau sudah dicabut.');
  }
  return {
    kind: 'key',
    id: key.user_id,
    userId: key.user_id,
    email: key.email,
    role: key.role,
    scopes: key.scopes,
    environment: key.environment,
    keyId: key.id,
  };
}
