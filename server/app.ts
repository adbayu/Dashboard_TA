import Fastify, { type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { transaction } from './db.js';
import { models, hash, secret, passwordHash, passwordMatches, connectionStatus, type Model } from './domain.js';
import { failV1 } from './v1/common.js';
import { ingestV2, type V2IngestBody } from './v1/ingest.js';
import { registerV1Routes } from './v1/index.js';

type User = { id: string; email: string; role: 'admin' | 'user' };
declare module 'fastify' { interface FastifyRequest { actor: User | null } }
type Options = {
  pool: pg.Pool;
  origin: string;
  production?: boolean;
  logger?: boolean;
  sendInvite: (email: string, token: string) => Promise<void>;
};
const text = { type: 'string', minLength: 1, maxLength: 100 };
const uuid = { type: 'string', format: 'uuid' };
const token = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const email = { type: 'string', format: 'email', maxLength: 254 };
const password = { type: 'string', minLength: 12, maxLength: 128 };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object', additionalProperties: false, required, properties,
});
const params = object({ id: uuid });
type LegacyIngestBody = { version: 1; deviceId: string; model: Model; messageId: string; measuredAt: string; readings: Record<string, number> };
type IngestBody = LegacyIngestBody | V2IngestBody;
const ingestTime = { type: 'string', format: 'date-time', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$' };
const ingestV1Schema = object({
  version: { const: 1 }, deviceId: uuid, model: { enum: Object.keys(models) }, messageId: uuid,
  measuredAt: ingestTime,
  readings: { type: 'object', minProperties: 2, maxProperties: 3, additionalProperties: { type: 'number' } },
});
const ingestV2Schema = object({
  version: { const: 2 }, deviceId: uuid, type: { type: 'string', pattern: '^[A-Z0-9-]{3,32}$' }, messageId: uuid,
  measuredAt: ingestTime,
  readings: { type: 'object', minProperties: 1, maxProperties: 16, additionalProperties: { type: 'number' } },
  meta: object({
    rssi: { type: 'integer', minimum: -32768, maximum: 32767 },
    fw: { type: 'string', maxLength: 32 },
  }, []),
}, ['version', 'deviceId', 'type', 'messageId', 'measuredAt', 'readings']);
function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}

export async function buildApp(options: Options) {
  const { pool } = options;
  const app = Fastify({
    bodyLimit: 4096,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: options.logger ? {
      serializers: { req: request => ({ method: request.method }), res: response => ({ statusCode: response.statusCode }) },
      redact: ['req.headers', 'password', 'token', 'credential', 'activationCode'],
    } : false,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: 'JagoFarm IoT API', version: '1.0.0' },
      servers: [{ url: options.origin }],
    },
  });
  app.decorateRequest('actor', null);
  app.setNotFoundHandler(() => fail(404, 'Endpoint tidak ditemukan.'));
  const dummyPassword = await passwordHash(secret());
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503;
    const isV1 = request.url.startsWith('/api/v1/');
    const isV2Ingest = request.url === '/api/ingest' && (request.body as { version?: number } | undefined)?.version === 2;
    const usesContractErrors = isV1 || isV2Ingest;
    const apiCode = (error as FastifyError & { apiCode?: string }).apiCode;
    const defaultV1Code: Record<number, string> = {
      400: 'VALIDATION_FAILED', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN_SCOPE',
      404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED',
    };
    if (status === 503) request.log.error({ requestId: request.id }, 'Request failed');
    reply.code(status).send({ error: {
      code: status === 503 ? 'UNAVAILABLE' : usesContractErrors ? apiCode ?? defaultV1Code[status] ?? 'VALIDATION_FAILED' : 'REQUEST_REJECTED',
      message: status === 503 ? 'Layanan tidak tersedia. Coba lagi.' : error.validation ? 'Payload tidak valid.' : error.message,
      requestId: request.id,
    } });
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    if (options.production) reply.header('Strict-Transport-Security', 'max-age=31536000');
    const hasSessionCookie = Boolean(request.cookies.pilot_session);
    const isV1 = request.url.startsWith('/api/v1/');
    const authorization = request.headers.authorization ?? '';
    const hasApiKey = /^Bearer jf_(?:live|test)_[a-f0-9]{64}$/.test(authorization);
    if (isV1 && hasSessionCookie && hasApiKey) {
      failV1(400, 'AMBIGUOUS_AUTH', 'Kirim cookie sesi atau API key, bukan keduanya.');
    }
    if (hasSessionCookie && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (request.headers.origin !== options.origin) {
        if (isV1) failV1(403, 'ORIGIN_REJECTED', 'Origin tidak diizinkan.');
        fail(403, 'Origin tidak diizinkan.');
      }
    }
  });
  const publicRoutes = new Set(['/api/health', '/api/session/login', '/api/invitations/accept', '/api/ingest', '/docs/openapi.json']);
  app.addHook('preHandler', async request => {
    if (publicRoutes.has(request.routeOptions.url ?? '')) return;
    if (request.routeOptions.url === '/api/v1/devices' && request.method === 'GET' && typeof (request.query as { code?: unknown }).code === 'string') return;
    const session = request.cookies.pilot_session;
    if (!session || !/^[a-f0-9]{64}$/.test(session)) {
      if (request.url.startsWith('/api/v1/')) failV1(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      fail(401, 'Silakan masuk.');
    }
    const result = await pool.query<User>(
      'SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [hash(session)],
    );
    request.actor = result.rows[0] ?? null;
    if (!request.actor) {
      if (request.url.startsWith('/api/v1/')) failV1(401, 'UNAUTHENTICATED', 'Sesi berakhir. Silakan masuk kembali.');
      fail(401, 'Sesi berakhir. Silakan masuk kembali.');
    }
    if (request.routeOptions.url?.startsWith('/api/admin/') && request.actor.role !== 'admin') fail(403, 'Khusus Admin Pilot.');
  });
  app.get('/docs/openapi.json', {
    schema: { tags: ['Dokumentasi'], summary: 'Skema OpenAPI untuk API IoT' },
  }, async () => app.swagger());
  app.get('/api/health', async () => {
    await pool.query('SELECT 1 FROM schema_migrations WHERE version=1');
    return { status: 'ok' };
  });
  app.post<{ Body: { email: string; password: string } }>('/api/session/login', {
    schema: { body: object({ email, password }) }, config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async (request, reply) => {
    const result = await pool.query('SELECT id,email,role,password_hash FROM users WHERE email=$1', [request.body.email.toLowerCase()]);
    const user = result.rows[0];
    const matches = await passwordMatches(request.body.password, user?.password_hash ?? dummyPassword);
    if (!matches || !user?.password_hash) fail(401, 'Email atau password salah.');
    const session = secret();
    await transaction(pool, async client => {
      await client.query('DELETE FROM sessions WHERE expires_at<=now() OR token_hash=$1', [hash(request.cookies.pilot_session ?? '')]);
      await client.query("INSERT INTO sessions VALUES ($1,$2,now()+interval '12 hours')", [hash(session), user.id]);
    });
    reply.setCookie('pilot_session', session, { httpOnly: true, secure: !!options.production, sameSite: 'strict', path: '/api', maxAge: 43200 });
    return { user: { id: user.id, email: user.email, role: user.role } };
  });
  app.get('/api/session', async request => ({ user: request.actor }));
  app.post('/api/session/logout', async (request, reply) => {
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(request.cookies.pilot_session ?? '')]);
    reply.clearCookie('pilot_session', { path: '/api' });
    return { ok: true };
  });
  app.get('/api/models', async () => ({ models }));
  app.get('/api/admin/users', async () => ({ users: (await pool.query('SELECT id,email,role,(password_hash IS NOT NULL) AS verified FROM users ORDER BY email')).rows }));
  app.post<{ Body: { email: string } }>('/api/admin/invitations', {
    schema: { body: object({ email }) }, config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async request => {
    const address = request.body.email.toLowerCase();
    const invite = secret();
    await transaction(pool, async client => {
      await client.query('LOCK TABLE users IN EXCLUSIVE MODE');
      const existing = (await client.query('SELECT password_hash FROM users WHERE email=$1', [address])).rows[0];
      if (existing?.password_hash) fail(409, 'Akun sudah aktif.');
      if (!existing && Number((await client.query('SELECT count(*) FROM users')).rows[0].count) >= 10) fail(409, 'Batas pilot 10 akun tercapai.');
      await client.query("INSERT INTO users(id,email,role,invite_hash,invite_expires) VALUES ($1,$2,'user',$3,now()+interval '24 hours') ON CONFLICT(email) DO UPDATE SET invite_hash=$3,invite_expires=now()+interval '24 hours'", [randomUUID(), address, hash(invite)]);
      await options.sendInvite(address, invite);
    });
    return { message: 'Undangan dikirim. Periksa kotak surat uji.' };
  });
  app.post<{ Body: { token: string; password: string } }>('/api/invitations/accept', {
    schema: { body: object({ token, password }) }, config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async request => {
    const encoded = await passwordHash(request.body.password);
    const result = await pool.query('UPDATE users SET password_hash=$1,invite_hash=NULL,invite_expires=NULL WHERE invite_hash=$2 AND invite_expires>now() AND password_hash IS NULL RETURNING id', [encoded, hash(request.body.token)]);
    if (!result.rowCount) fail(400, 'Undangan salah, kedaluwarsa, atau sudah digunakan.');
    return { message: 'Email terverifikasi. Silakan masuk.' };
  });
  app.post<{ Body: { userId: string; name: string; model: Model; deviceId?: string } }>('/api/admin/devices', {
    schema: { body: object({ userId: uuid, name: text, model: { enum: Object.keys(models) }, deviceId: uuid }, ['userId', 'name', 'model']) },
  }, async request => {
    const { userId, name, model, deviceId } = request.body;
    if (!name.trim()) fail(400, 'Nama unit tidak boleh kosong.');
    const id = deviceId ?? randomUUID();
    const credential = secret();
    const activationCode = secret();
    await transaction(pool, async client => {
      // ponytail: serialize provisioning for 20 pilot units; use per-unit locks before increasing capacity.
      await client.query('LOCK TABLE devices IN EXCLUSIVE MODE');
      if (!(await client.query('SELECT id FROM users WHERE id=$1 AND password_hash IS NOT NULL', [userId])).rowCount) fail(400, 'Akun tujuan belum aktif.');
      if (deviceId) {
        const device = (await client.query('SELECT model FROM devices WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!device || device.model !== model) fail(400, 'Unit atau model tidak valid.');
        if ((await client.query('SELECT id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [id])).rowCount) fail(409, 'Pemilik lama harus melepas unit dahulu.');
        await client.query("UPDATE devices SET name=$2,allocated_to=$3,credential_hash=$4,credential_since=clock_timestamp(),activation_hash=$5,activation_expires=now()+interval '24 hours' WHERE id=$1", [id, name, userId, hash(credential), hash(activationCode)]);
      } else {
        if (Number((await client.query('SELECT count(*) FROM devices')).rows[0].count) >= 20) fail(409, 'Batas pilot 20 unit tercapai.');
        await client.query("INSERT INTO devices(id,name,model,credential_hash,allocated_to,activation_hash,activation_expires) VALUES ($1,$2,$3,$4,$5,$6,now()+interval '24 hours')", [id, name, model, hash(credential), userId, hash(activationCode)]);
      }
    });
    return { deviceId: id, model, credential, activationCode };
  });
  app.post<{ Body: { code: string } }>('/api/devices/pair', {
    schema: { body: object({ code: token }) }, config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async request => transaction(pool, async client => {
    const device = (await client.query('SELECT id FROM devices WHERE activation_hash=$1 AND allocated_to=$2 AND activation_expires>now() FOR UPDATE', [hash(request.body.code), request.actor!.id])).rows[0];
    if (!device) fail(400, 'Kode salah, kedaluwarsa, sudah digunakan, atau bukan untuk akun ini.');
    if ((await client.query('SELECT id FROM ownerships WHERE device_id=$1 AND ended_at IS NULL', [device.id])).rowCount) fail(409, 'Unit sudah terpasang.');
    await client.query('INSERT INTO ownerships(id,device_id,user_id) VALUES ($1,$2,$3)', [randomUUID(), device.id, request.actor!.id]);
    await client.query('UPDATE devices SET activation_hash=NULL,activation_expires=NULL WHERE id=$1', [device.id]);
    return { deviceId: device.id };
  }));
  const deviceQuery = 'SELECT d.id,d.name,d.model,o.started_at,r.measured_at,r.received_at,r.readings,' +
    '(SELECT max(received_at) FROM readings WHERE ownership_id=o.id) AS last_received_at ' +
    'FROM devices d JOIN ownerships o ON o.device_id=d.id ' +
    'LEFT JOIN LATERAL (SELECT * FROM readings WHERE ownership_id=o.id ORDER BY measured_at DESC,message_id DESC LIMIT 1) r ON true ' +
    'WHERE o.user_id=$1 AND o.ended_at IS NULL AND d.model IS NOT NULL';
  const present = (device: Record<string, any>) => ({
    ...device, sensors: models[device.model as Model].sensors, source: 'simulator',
    status: connectionStatus(device.measured_at, device.last_received_at),
  });
  app.get('/api/devices', async request => ({ devices: (await pool.query(deviceQuery + ' ORDER BY d.name,d.id', [request.actor!.id])).rows.map(present) }));
  app.get<{ Params: { id: string } }>('/api/devices/:id', { schema: { params } }, async request => {
    const device = (await pool.query(deviceQuery + ' AND d.id=$2', [request.actor!.id, request.params.id])).rows[0];
    if (!device) fail(404, 'Perangkat tidak ditemukan.');
    return { device: present(device) };
  });
  app.post<{ Params: { id: string } }>('/api/devices/:id/release', { schema: { params } }, async request => transaction(pool, async client => {
    await client.query('SELECT id FROM devices WHERE id=$1 FOR UPDATE', [request.params.id]);
    const result = await client.query('UPDATE ownerships SET ended_at=clock_timestamp() WHERE device_id=$1 AND user_id=$2 AND ended_at IS NULL RETURNING id', [request.params.id, request.actor!.id]);
    if (!result.rowCount) fail(404, 'Perangkat tidak ditemukan.');
    return { ok: true };
  }));
  app.get<{ Params: { id: string }; Querystring: { cursor?: string } }>('/api/devices/:id/history', {
    schema: { params, querystring: object({ cursor: { type: 'string', maxLength: 300 } }, []) },
  }, async request => {
    if (!(await pool.query('SELECT id FROM ownerships WHERE device_id=$1 AND user_id=$2', [request.params.id, request.actor!.id])).rowCount) fail(404, 'Perangkat tidak ditemukan.');
    let cursor: { time: string; id: string } | null = null;
    if (request.query.cursor) {
      try {
        cursor = JSON.parse(Buffer.from(request.query.cursor, 'base64url').toString());
        if (!cursor || typeof cursor.time !== 'string' || !Number.isFinite(Date.parse(cursor.time)) || typeof cursor.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cursor.id)) throw new Error();
      } catch { fail(400, 'Cursor tidak valid.'); }
    }
    const result = await pool.query('SELECT r.message_id,r.measured_at,r.received_at,r.readings FROM readings r JOIN ownerships o ON o.id=r.ownership_id WHERE o.device_id=$1 AND o.user_id=$2 AND ($3::timestamptz IS NULL OR (r.measured_at,r.message_id)<($3::timestamptz,$4::uuid)) ORDER BY r.measured_at DESC,r.message_id DESC LIMIT 101', [request.params.id, request.actor!.id, cursor?.time ?? null, cursor?.id ?? null]);
    const readings = result.rows.slice(0, 100);
    const last = readings.at(-1);
    return { readings, nextCursor: result.rows.length > 100 ? Buffer.from(JSON.stringify({ time: last.measured_at, id: last.message_id })).toString('base64url') : null };
  });
  app.post<{ Body: IngestBody }>('/api/ingest', {
      schema: { body: { oneOf: [ingestV1Schema, ingestV2Schema] } },
    }, async request => {
      const authorization = request.headers.authorization;
      if (!authorization || !/^Bearer [a-f0-9]{64}$/.test(authorization)) {
        if (request.body.version === 2) failV1(401, 'UNAUTHENTICATED', 'Credential device salah atau sudah dirotasi.');
        fail(401, 'Kredensial perangkat salah.');
      }
      if (request.body.version === 2) return ingestV2(pool, request.body, authorization.slice(7));

      const { deviceId, model, messageId, measuredAt, readings } = request.body;
      if (Date.parse(measuredAt) > Date.now() + 60_000) fail(400, 'Waktu perangkat lebih dari 60 detik di masa depan.');
      const sensors = models[model].sensors;
      if (Object.keys(readings).length !== sensors.length || sensors.some(sensor => !Number.isFinite(readings[sensor.code]) || readings[sensor.code] < sensor.min || readings[sensor.code] > sensor.max)) fail(400, 'Sensor, nilai, atau model tidak valid.');
      return transaction(pool, async client => {
        const device = (await client.query('SELECT id FROM devices WHERE id=$1 AND model=$2 AND credential_hash=$3 AND credential_since<=$4::timestamptz FOR UPDATE', [deviceId, model, hash(authorization.slice(7)), measuredAt])).rows[0];
        if (!device) fail(401, 'Kredensial perangkat salah.');
        const prior = (await client.query(`
          SELECT (measured_at=$3::timestamptz AND readings=$4::jsonb AND ingest_version=1
            AND ingest_type=$5 AND ingest_meta='{}'::jsonb) AS matches
          FROM readings WHERE device_id=$1 AND message_id=$2`, [deviceId, messageId, measuredAt, JSON.stringify(readings), model])).rows[0];
        if (prior) {
          if (!prior.matches) fail(409, 'ID kiriman sudah dipakai untuk payload berbeda.');
          return { accepted: true, duplicate: true };
        }
        const owner = (await client.query('SELECT id FROM ownerships WHERE device_id=$1 AND started_at<=$2::timestamptz AND (ended_at IS NULL OR ended_at>$2::timestamptz)', [deviceId, measuredAt])).rows[0];
        if (!owner) fail(409, 'Tidak ada kepemilikan pada waktu pengukuran.');
        await client.query(`
          INSERT INTO readings(device_id,message_id,ownership_id,measured_at,readings,ingest_version,ingest_type,ingest_meta)
          VALUES($1,$2,$3,$4,$5,1,$6,'{}'::jsonb)`, [deviceId, messageId, owner.id, measuredAt, JSON.stringify(readings), model]);
        return { accepted: true, duplicate: false };
      });
    });
  registerV1Routes(app, pool, options.origin);
  return app;
}
