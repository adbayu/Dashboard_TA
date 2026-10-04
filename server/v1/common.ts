import type { FastifyRequest } from 'fastify';

export type V1ErrorCode =
  | 'VALIDATION_FAILED'
  | 'AMBIGUOUS_AUTH'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_SCOPE'
  | 'ORIGIN_REJECTED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE';

export function failV1(statusCode: number, code: V1ErrorCode, message: string): never {
  throw Object.assign(new Error(message), { statusCode, apiCode: code });
}

export const v1Object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
});

export const uuidSchema = { type: 'string', format: 'uuid' };
export const codeSchema = { type: 'string', pattern: '^[A-Z0-9-]{3,32}$' };
export const sensorCodeSchema = { type: 'string', pattern: '^[a-z][a-z0-9_]{1,31}$' };
export const activationCodeSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
export const shortTextSchema = { type: 'string', minLength: 1, maxLength: 100 };

export async function requireAdmin(request: FastifyRequest): Promise<void> {
  if (request.actor?.role !== 'admin') failV1(403, 'FORBIDDEN_SCOPE', 'Aksi ini hanya untuk pengelola.');
}

export function requireActor(request: FastifyRequest) {
  if (!request.actor) failV1(401, 'UNAUTHENTICATED', 'Silakan masuk.');
  return request.actor;
}

export function validateSensors(kind: string, sensors: Array<{ code: string; label: string }>) {
  const count = sensors.length;
  const validCount = kind === 'satuan' ? count === 1 : kind === 'paket' && count >= 2;
  const uniqueCodes = new Set(sensors.map(sensor => sensor.code));
  if (!validCount || uniqueCodes.size !== count) {
    failV1(400, 'VALIDATION_FAILED', kind === 'satuan'
      ? 'Tipe satuan harus memiliki tepat satu sensor.'
      : 'Tipe paket harus memiliki minimal dua sensor unik.');
  }
}
