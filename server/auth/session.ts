import type pg from 'pg';
import type { ApiScope } from './types.js';
import { hash } from '../domain.js';

export type Actor = {
  kind: 'session' | 'key';
  id: string;
  userId: string;
  email: string;
  role: 'admin' | 'user';
  scopes: ApiScope[];
  environment: 'live' | 'test' | null;
  keyId: string | null;
};

export function sessionScopes(role: Actor['role']): ApiScope[] {
  return role === 'admin'
    ? ['devices:read', 'devices:write', 'readings:read', 'admin']
    : ['devices:read', 'devices:write', 'readings:read'];
}

export async function authenticateSession(pool: pg.Pool, token: string | undefined): Promise<Actor | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await pool.query<{ id: string; email: string; role: Actor['role'] }>(
    'SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
    [hash(token)],
  );
  const user = result.rows[0];
  if (!user) return null;
  return {
    kind: 'session',
    id: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    scopes: sessionScopes(user.role),
    environment: null,
    keyId: null,
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor | null;
  }

  interface FastifyContextConfig {
    scope?: ApiScope;
  }
}

export function sessionUser(actor: Actor | null) {
  return actor ? { id: actor.id, email: actor.email, role: actor.role } : null;
}
