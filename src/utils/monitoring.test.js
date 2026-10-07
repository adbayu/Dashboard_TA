import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AREA_HISTORY_REFRESH_MS,
  createBoundedBatchRunner,
  countAttentionDevices,
  attentionBadgeLabel,
  getLocalDayRange,
  mergeEventPages,
  sandboxConnectionStatus,
  sandboxCurlExample,
  summarizeAreaPoints,
} from './monitoring.js';

test('badge menghitung perangkat live berbeda yang offline atau punya state low/high', () => {
  const devices = [
    { id: 'offline', status: 'offline' },
    { id: 'low', status: 'online' },
    { id: 'high-and-offline', status: 'offline' },
    { id: 'stale', status: 'stale' },
    { id: 'sandbox', status: 'offline', isSandbox: true },
  ];
  const latestByDevice = {
    low: { readings: [{ state: 'low' }, { state: 'unknown' }] },
    'high-and-offline': { readings: [{ state: 'high' }] },
    stale: { readings: [{ state: 'low' }] },
    sandbox: { readings: [{ state: 'high' }] },
  };

  assert.equal(countAttentionDevices(devices, latestByDevice), 4);
  assert.equal(attentionBadgeLabel(4), '[4] kejadian perlu perhatian');
});

test('ringkasan area menghitung rata-rata tertimbang jumlah sampel', () => {
  assert.deepEqual(summarizeAreaPoints([
    { avg: 10, min: 8, max: 12, n: 1 },
    { avg: 20, min: 18, max: 24, n: 3 },
  ]), { min: 8, avg: 17.5, max: 24, n: 4 });
  assert.equal(summarizeAreaPoints([]), null);
});

test('rentang hari ini memakai tengah malam lokal dan waktu sekarang', () => {
  const now = new Date(2026, 9, 6, 14, 30, 0);
  const range = getLocalDayRange(now);
  const localMidnight = new Date(2026, 9, 6, 0, 0, 0).toISOString();

  assert.equal(range.from, localMidnight);
  assert.equal(range.to, now.toISOString());
  assert.equal(range.label, 'Hari ini sejak 00.00 (waktu perangkatmu)');
});

test('halaman kejadian digabung tanpa duplikat dan diurutkan menurut ID numerik DESC', () => {
  assert.deepEqual(mergeEventPages(
    [{ id: '12', at: '2026-01-01T00:00:00Z' }, { id: '9', at: '2026-01-03T00:00:00Z' }],
    [{ id: '11', at: '2026-01-02T00:00:00Z' }, { id: '9', at: '2026-01-04T00:00:00Z' }],
  ).map(event => event.id), ['12', '11', '9']);
});

test('contoh curl sandbox hanya memuat prefix key Test dan variabel secret', () => {
  const secret = `ab12${'a'.repeat(60)}`;
  const credential = `jf_test_${secret}`;
  const command = sandboxCurlExample({
    deviceId: 'device-1',
    scenario: 'ph_turun',
    apiKeyPrefix: credential.slice(0, 12),
  });
  assert.match(command, /jf_test_ab12/);
  assert.match(command, /\$\{JAGOFARM_TEST_API_KEY\}/);
  assert.match(command, /"scenario":"ph_turun"/);
  assert.match(command, /jf_test_[a-f0-9]{4}(?![a-f0-9])/);
  assert.doesNotMatch(command, new RegExp(credential));
  assert.doesNotMatch(command, /jf_test_[a-f0-9]{64}/);
  assert.doesNotMatch(command, /[a-f0-9]{64}/);
  assert.doesNotMatch(command, /jf_test_ab12[a-f0-9]{4,}/);
});

test('badge koneksi sandbox mengikuti label, ikon, dan tone UX 6.1', () => {
  assert.deepEqual(sandboxConnectionStatus('online'), { label: 'Terhubung', icon: 'wifi', tone: 'ok' });
  assert.deepEqual(sandboxConnectionStatus('stale'), { label: 'Data tertunda', icon: 'schedule', tone: 'warn' });
  assert.deepEqual(sandboxConnectionStatus('offline'), { label: 'Tidak terhubung', icon: 'wifi_off', tone: 'bad' });
});

test('scheduler membatasi konkurensi, menolak batch berlebih, dan tidak overlap', async () => {
  const runner = createBoundedBatchRunner({ concurrency: 2, maxRequests: 60 });
  let active = 0;
  let maxActive = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const task = label => async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await gate;
    active -= 1;
    return label;
  };
  const batch = runner.run([task('first'), task('second')]);

  assert.equal((await runner.run([async () => 'overlap'])).skipped, true);
  assert.equal(runner.isRunning(), true);
  release();
  const result = await batch;
  assert.equal(result.counters.started, 2);
  assert.equal(maxActive, 2);
  assert.equal(runner.isRunning(), false);
  await assert.rejects(runner.run(Array.from({ length: 61 }, async () => null)), /maksimal 60/);
});

test('batch area untuk 20 device standar hanya membatasi konkurensi', async () => {
  let active = 0;
  let maxActive = 0;
  const runner = createBoundedBatchRunner({ concurrency: 4, maxRequests: Number.MAX_SAFE_INTEGER });
  const tasks = Array.from({ length: 58 }, () => async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 0));
    active -= 1;
  });

  const result = await runner.run(tasks);
  assert.equal(result.counters.started, 58);
  assert.equal(result.counters.total, 58);
  assert.equal(result.counters.maxActive, 4);
  assert.equal(maxActive, 4);
});

test('Monitoring area memakai cadence lima menit dan membiarkan governor global membatasi request', async () => {
  const monitoring = await import('./monitoring.js');

  assert.equal(monitoring.AREA_HISTORY_REFRESH_MS, 300_000);
  assert.equal(AREA_HISTORY_REFRESH_MS, 300_000);
});

test('badge perhatian tidak menghitung sandbox meski offline atau memiliki alert low/high', () => {
  assert.equal(countAttentionDevices([
    { id: 'sandbox-offline', status: 'offline', isSandbox: true },
    { id: 'sandbox-reading', status: 'online', is_sandbox: true },
  ], {
    'sandbox-reading': { readings: [{ state: 'low' }, { state: 'high' }] },
  }), 0);
});
