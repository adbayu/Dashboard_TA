import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from 'node:crypto';
const passwordOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
// scrypt dengan N=131072 memakai CPU ratusan milidetik. Tanpa batas, rentetan
// permintaan login dari banyak IP bisa menghabiskan CPU proses API. Antrean
// dibatasi supaya kelebihan beban ditolak cepat (503), bukan menumpuk.
const MAX_CONCURRENT_HASHES = 4;
const MAX_QUEUED_HASHES = 32;
let activeHashes = 0;
const hashQueue: Array<() => void> = [];

async function withHashSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeHashes >= MAX_CONCURRENT_HASHES) {
    if (hashQueue.length >= MAX_QUEUED_HASHES) {
      throw Object.assign(new Error('Verifikasi password sedang sibuk. Coba lagi.'), { statusCode: 503 });
    }
    await new Promise<void>(resolve => hashQueue.push(resolve));
  }
  activeHashes += 1;
  try {
    return await work();
  } finally {
    activeHashes -= 1;
    hashQueue.shift()?.();
  }
}

const scryptOnce = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  deriveKey(password, salt, 64, passwordOptions, (error, key) => error ? reject(error) : resolve(key));
});
const scrypt = (password: string, salt: string) => withHashSlot(() => scryptOnce(password, salt));
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
