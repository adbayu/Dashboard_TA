import { randomUUID } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { models, type Model } from './domain.js';

const endpoint = new URL(process.env.API_URL ?? 'http://localhost:3001');
if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) throw new Error('Simulator requires HTTPS except loopback');
if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('API_URL must not contain credentials, query, or fragment');
const deviceId = process.env.DEVICE_ID ?? '';
const credential = process.env.DEVICE_CREDENTIAL ?? '';
const model = process.env.DEVICE_MODEL as Model;
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(deviceId) || !/^[a-f0-9]{64}$/.test(credential) || !Object.hasOwn(models, model)) throw new Error('DEVICE_ID, DEVICE_CREDENTIAL and DEVICE_MODEL required');
const file = resolve(process.env.SIMULATOR_BUFFER ?? '.pilot-buffer.json');
type Message = { version: number; deviceId: string; model: Model; messageId: string; measuredAt: string; readings: Record<string, number> };
let buffer: Message[] = [];
try {
  const saved = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(saved) || saved.length > 120 || saved.some(message => message.deviceId !== deviceId || message.model !== model || typeof message.messageId !== 'string' || !Number.isFinite(Date.parse(message.measuredAt)) || typeof message.readings !== 'object')) throw new Error('Invalid buffer; preserve file and inspect it manually');
  buffer = saved;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const save = async () => { await writeFile(file + '.tmp', JSON.stringify(buffer), { mode: 0o600 }); await rename(file + '.tmp', file); };
let offline = false;
let running = false;
async function tick(sample = true) {
  if (running) return;
  running = true;
  try {
    if (sample && buffer.length < 120) {
      const readings: Record<string, number> = model === 'water-v1'
        ? { water_temperature: 27 + Math.random(), ph: 6.8 + Math.random() * 0.3, ec: 1.2 + Math.random() * 0.2 }
        : { air_temperature: 28 + Math.random(), humidity: 65 + Math.random() * 5 };
      buffer.push({ version: 1, deviceId, model, messageId: randomUUID(), measuredAt: new Date().toISOString(), readings });
      await save();
    } else if (sample) console.error('Buffer full (120). Sampling paused; existing measurements preserved.');
    while (!offline && buffer.length) {
      const response = await fetch(new URL('/api/ingest', endpoint), {
        method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + credential },
        body: JSON.stringify(buffer[0]), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) { console.error('Ingestion rejected: HTTP ' + response.status + '. Buffer retained; correct provisioning/payload before retry.'); break; }
      buffer.shift();
      await save();
    }
    console.log((offline ? 'Disconnected' : 'Connected') + '; buffered=' + buffer.length);
  } catch { console.error('Connection or buffer persistence failed; retry in 30 seconds.'); }
  finally { running = false; }
}
console.log('Simulator through backend. Commands: offline, online. Sampling every 30 seconds.');
process.stdin.setEncoding('utf8');
process.stdin.on('data', input => {
  const command = String(input).trim();
  if (command === 'offline') { offline = true; console.log('Disconnected; buffering measurements.'); }
  if (command === 'online') { offline = false; void tick(false); }
});
await tick();
setInterval(() => { void tick(); }, 30000);
