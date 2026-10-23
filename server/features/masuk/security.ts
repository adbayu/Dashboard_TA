import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from 'node:crypto';
const passwordOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  deriveKey(password, salt, 64, passwordOptions, (error, key) => error ? reject(error) : resolve(key));
});
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
