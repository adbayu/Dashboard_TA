import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { hash, secret } from '../domain.js';
import { transaction } from '../db.js';
import { ensureSandboxDevice } from '../sandbox/provision.js';
import type { Actor } from '../auth/session.js';
import type { ApiKeyEnvironment, ApiScope } from '../auth/types.js';
import { failV1, requireActor, shortTextSchema, uuidSchema, v1Object } from './common.js';

type CreateKeyBody = { name: string; environment: ApiKeyEnvironment; scopes: ApiScope[] };
type KeyParams = { id: string };
type UsageQuery = { days?: string };

const scopeNames: ApiScope[] = ['devices:read', 'devices:write', 'readings:read', 'admin'];
const nullableDate = { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] };
const keyItemSchema = v1Object({
  id: uuidSchema,
  name: shortTextSchema,
  prefix: { type: 'string', minLength: 12, maxLength: 12 },
  scopes: { type: 'array', items: { type: 'string', enum: scopeNames } },
  environment: { type: 'string', enum: ['live', 'test'] },
  createdAt: { type: 'string', format: 'date-time' },
  lastUsedAt: nullableDate,
  revokedAt: nullableDate,
});
const createBodySchema = v1Object({
  name: shortTextSchema,
  environment: { type: 'string', enum: ['live', 'test'] },
  scopes: { type: 'array', minItems: 1, maxItems: 4, uniqueItems: true, items: { type: 'string', enum: scopeNames } },
});
const paramsSchema = v1Object({ id: uuidSchema });
const usageQuerySchema = v1Object({ days: { type: 'string', pattern: '^(?:[1-9]|[12][0-9]|30)$', default: '7' } }, []);
const listResponseSchema = v1Object({ keys: { type: 'array', items: keyItemSchema } });
const createResponseSchema = v1Object({
  key: keyItemSchema,
  secret: { type: 'string', pattern: '^jf_(live|test)_[a-f0-9]{64}$' },
});
const usageEntrySchema = v1Object({
  date: { type: 'string', format: 'date' },
  requests: { type: 'integer', minimum: 0 },
  errors: { type: 'integer', minimum: 0 },
  rateLimitedRequests: { type: 'integer', minimum: 0 },
});
const usageResponseSchema = v1Object({
  usage: v1Object({
    days: { type: 'integer', minimum: 1, maximum: 30 },
    totalRequests: { type: 'integer', minimum: 0 },
    errorPercent: { type: 'number', minimum: 0, maximum: 100 },
    rateLimitedRequests: { type: 'integer', minimum: 0 },
    daily: { type: 'array', items: usageEntrySchema },
    topRoutes: { type: 'array', maxItems: 5, items: v1Object({ route: { type: 'string' }, requests: { type: 'integer', minimum: 0 } }) },
  }),
});

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiScope[];
  environment: ApiKeyEnvironment;
  created_at: Date | string;
  last_used_at: Date | string | null;
  revoked_at: Date | string | null;
};

function presentKey(row: ApiKeyRow) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    environment: row.environment,
    createdAt: new Date(row.created_at).toISOString(),
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
  };
}

function requireCookieSession(request: FastifyRequest): Actor {
  const actor = requireActor(request);
  if (actor.kind !== 'session') failV1(401, 'UNAUTHENTICATED', 'Endpoint kunci hanya dapat digunakan dengan sesi.');
  return actor;
}

function authorizeKeyCreation(actor: Actor, environment: ApiKeyEnvironment, scopes: ApiScope[]) {
  // Q2 (diputuskan 18 Oktober 2026): hanya pengelola yang dapat menerbitkan key live.
  if (actor.role !== 'admin' && environment !== 'test') {
    failV1(403, 'FORBIDDEN_SCOPE', 'Akun non-admin hanya dapat membuat key test.');
  }
  if (actor.role !== 'admin' && scopes.includes('admin')) {
    failV1(403, 'FORBIDDEN_SCOPE', 'Akun non-admin tidak dapat memberi scope admin pada key.');
  }
}

export function registerKeyRoutes(app: FastifyInstance, pool: pg.Pool) {
  app.get('/api/v1/keys', {
    schema: {
      tags: ['API key'],
      summary: 'Daftar API key akun',
      response: { 200: listResponseSchema },
    },
    preHandler: async request => { requireCookieSession(request); },
  }, async request => {
    const actor = requireCookieSession(request);
    const result = await pool.query<ApiKeyRow>(
      `SELECT id,name,prefix,scopes,environment,created_at,last_used_at,revoked_at
       FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC,id`,
      [actor.userId],
    );
    return { keys: result.rows.map(presentKey) };
  });

  app.post<{ Body: CreateKeyBody }>('/api/v1/keys', {
    schema: {
      tags: ['API key'],
      summary: 'Buat API key baru',
      body: createBodySchema,
      response: { 201: createResponseSchema },
    },
    preHandler: async request => { requireCookieSession(request); },
  }, async (request, reply) => {
    const actor = requireCookieSession(request);
    const { name, environment, scopes } = request.body;
    authorizeKeyCreation(actor, environment, scopes);
    if (!name.trim()) failV1(400, 'VALIDATION_FAILED', 'Nama API key tidak boleh kosong.');
    const rawSecret = secret();
    const apiSecret = `jf_${environment}_${rawSecret}`;
    const id = randomUUID();
    const created = await transaction(pool, async client => {
      const key = await client.query<ApiKeyRow>(
        `INSERT INTO api_keys(id,user_id,name,prefix,key_hash,scopes,environment)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         RETURNING id,name,prefix,scopes,environment,created_at,last_used_at,revoked_at`,
        [id, actor.userId, name.trim(), apiSecret.slice(0, 12), hash(apiSecret), scopes, environment],
      );
      if (environment === 'test') await ensureSandboxDevice(client, actor.userId);
      return key.rows[0];
    });
    return reply.code(201).send({ key: presentKey(created), secret: apiSecret });
  });

  app.delete<{ Params: KeyParams }>('/api/v1/keys/:id', {
    schema: {
      tags: ['API key'],
      summary: 'Cabut API key',
      params: paramsSchema,
      response: { 204: { type: 'null' } },
    },
    preHandler: async request => { requireCookieSession(request); },
  }, async (request, reply) => {
    const actor = requireCookieSession(request);
    const result = await pool.query(
      `UPDATE api_keys SET revoked_at=clock_timestamp()
       WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL`,
      [request.params.id, actor.userId],
    );
    if (!result.rowCount) failV1(404, 'NOT_FOUND', 'API key tidak ditemukan.');
    return reply.code(204).send();
  });

  app.get<{ Params: KeyParams; Querystring: UsageQuery }>('/api/v1/keys/:id/usage', {
    schema: {
      tags: ['API key'],
      summary: 'Ringkasan pemakaian API key',
      params: paramsSchema,
      querystring: usageQuerySchema,
      response: { 200: usageResponseSchema },
    },
    preHandler: async request => { requireCookieSession(request); },
  }, async request => {
    const actor = requireCookieSession(request);
    const owned = await pool.query('SELECT id FROM api_keys WHERE id=$1 AND user_id=$2', [request.params.id, actor.userId]);
    if (!owned.rowCount) failV1(404, 'NOT_FOUND', 'API key tidak ditemukan.');
    const days = request.query.days ? Number(request.query.days) : 7;
    const totals = (await pool.query(
      `SELECT count(*)::integer AS total_requests,
         count(*) FILTER (WHERE status >= 400)::integer AS errors,
         count(*) FILTER (WHERE status = 429)::integer AS rate_limited
       FROM api_usage WHERE key_id=$1 AND at >= now()-($2::integer * interval '1 day')`,
      [request.params.id, days],
    )).rows[0];
    const daily = await pool.query(
      `SELECT to_char(day,'YYYY-MM-DD') AS date,
         count(u.at)::integer AS requests,
         count(u.at) FILTER (WHERE u.status >= 400)::integer AS errors,
         count(u.at) FILTER (WHERE u.status = 429)::integer AS rate_limited_requests
       FROM generate_series(current_date-($2::integer-1),current_date,interval '1 day') AS day
       LEFT JOIN api_usage u ON u.key_id=$1 AND u.at >= day AND u.at < day+interval '1 day'
       GROUP BY day ORDER BY day`,
      [request.params.id, days],
    );
    const topRoutes = await pool.query(
      `SELECT route,count(*)::integer AS requests FROM api_usage
       WHERE key_id=$1 AND at >= now()-($2::integer * interval '1 day')
       GROUP BY route ORDER BY requests DESC,route LIMIT 5`,
      [request.params.id, days],
    );
    const totalRequests = Number(totals.total_requests);
    const errorPercent = totalRequests === 0 ? 0 : Number((Number(totals.errors) * 100 / totalRequests).toFixed(2));
    return {
      usage: {
        days,
        totalRequests,
        errorPercent,
        rateLimitedRequests: Number(totals.rate_limited),
        daily: daily.rows.map(row => ({
          date: row.date,
          requests: Number(row.requests),
          errors: Number(row.errors),
          rateLimitedRequests: Number(row.rate_limited_requests),
        })),
        topRoutes: topRoutes.rows.map(row => ({ route: row.route, requests: Number(row.requests) })),
      },
    };
  });
}
