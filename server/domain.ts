import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from 'node:crypto';
const passwordOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  deriveKey(password, salt, 64, passwordOptions, (error, key) => error ? reject(error) : resolve(key));
});
export const models = {
  'water-v1': { name: 'Pemantau air', sensors: [
    { code: 'water_temperature', name: 'Suhu air', unit: '°C', min: -10, max: 100 },
    { code: 'ph', name: 'pH', unit: 'pH', min: 0, max: 14 },
    { code: 'ec', name: 'EC', unit: 'mS/cm', min: 0, max: 100 },
  ] },
  'environment-v1': { name: 'Pemantau lingkungan', sensors: [
    { code: 'air_temperature', name: 'Suhu udara', unit: '°C', min: -50, max: 80 },
    { code: 'humidity', name: 'Kelembapan', unit: '%RH', min: 0, max: 100 },
  ] },
} as const;
export type Model = keyof typeof models;
export const secret = () => randomBytes(32).toString('hex');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password: string) {
  const salt = secret();
  const key = await scrypt(password, salt);
  return salt + ':' + key.toString('hex');
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  const actual = await scrypt(password, salt);
  const expected = Buffer.from(encoded, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function connectionStatus(measuredAt: string | null, receivedAt: string | null, now = Date.now()) {
  if (!receivedAt || now - new Date(receivedAt).getTime() >= 180_000) return 'offline';
  if (!measuredAt || now - new Date(measuredAt).getTime() >= 90_000) return 'stale';
  return 'online';
}
