import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatEventMessage,
  formatMeasuredAt,
  formatRentangAmbang,
  formatSensorNumber,
  formatThreshold,
  getSensorState,
  isMeasurementStale,
  mergeLatestReading,
  resolveTelemetrySnapshot,
  sortEventsByIdDescending,
  statusKoneksiLive,
  summarizeHistory,
} from './iotPresentation.js';

const SEKARANG = Date.parse('2026-11-21T06:30:00.000Z');
const detikLalu = detik => new Date(SEKARANG - detik * 1000).toISOString();

test('statusKoneksiLive: event online/offline dari server langsung dipakai', () => {
  assert.equal(statusKoneksiLive('offline', { jenis: 'event', type: 'online' }, SEKARANG), 'online');
  assert.equal(statusKoneksiLive('online', { jenis: 'event', type: 'offline' }, SEKARANG), 'offline');
});

test('statusKoneksiLive: event ambang tidak mengubah status koneksi', () => {
  for (const type of ['threshold_low', 'threshold_high', 'threshold_clear']) {
    assert.equal(statusKoneksiLive('stale', { jenis: 'event', type }, SEKARANG), 'stale', type);
  }
});

test('statusKoneksiLive: pembacaan baru dari alat yang belum pernah terhubung menjadikannya online', () => {
  // Server tidak mengirim event "online" untuk kiriman pertama (lihat server/v1.test.ts).
  assert.equal(statusKoneksiLive('offline', { jenis: 'reading', measuredAt: detikLalu(4) }, SEKARANG), 'online');
  assert.equal(statusKoneksiLive('stale', { jenis: 'reading', measuredAt: detikLalu(10) }, SEKARANG), 'online');
});

test('formatSensorNumber keeps the API null empty and formats real values with Indonesian decimals', () => {
  assert.equal(formatSensorNumber(null, 2), '-');
  assert.equal(formatSensorNumber(undefined, 2), '-');
  assert.equal(formatSensorNumber(7.02, 2), '7,02');
  assert.equal(formatSensorNumber(625, 0), '625');
});

test('getSensorState evaluates values against the effective threshold and handles unknown data', () => {
  const threshold = { low: 6.5, high: 7.5, source: 'area' };
  assert.equal(getSensorState(null, threshold), 'unknown');
  assert.equal(getSensorState(7, null), 'unknown');
  assert.equal(getSensorState(7, { low: null, high: null, source: 'default' }), 'unknown');
  assert.equal(getSensorState(6.4, threshold), 'low');
  assert.equal(getSensorState(7.6, threshold), 'high');
  assert.equal(getSensorState(7.5, threshold), 'normal');
});

test('mergeLatestReading applies only known live sensor values and keeps effective thresholds', () => {
  const latest = {
    measuredAt: '2026-10-06T08:00:00.000Z',
    readings: [
      { sensor: 'ph', value: 7, state: 'normal', measuredAt: '2026-10-06T08:00:00.000Z', threshold: { low: 6.5, high: 7.5, source: 'area' } },
      { sensor: 'tds', value: 625, state: 'normal', threshold: { low: 500, high: 900, source: 'default' } },
    ],
  };

  assert.deepEqual(mergeLatestReading(latest, {
    measuredAt: '2026-10-06T08:01:00.000Z',
    readings: { ph: 6.4, unknown_sensor: 20 },
  }), {
    measuredAt: '2026-10-06T08:01:00.000Z',
    readings: [
      { sensor: 'ph', value: 6.4, state: 'low', measuredAt: '2026-10-06T08:01:00.000Z', threshold: { low: 6.5, high: 7.5, source: 'area' } },
      { sensor: 'tds', value: 625, state: 'normal', threshold: { low: 500, high: 900, source: 'default' } },
    ],
  });
  assert.equal(mergeLatestReading(null, { readings: { ph: 6.4 } }), null);
});

test('formatThreshold identifies effective area and default thresholds without invented bounds', () => {
  assert.equal(formatThreshold({ low: 6.5, high: 7.5, source: 'area' }, 'pH', 1), '6,5 sampai 7,5 pH · ambang area');
  assert.equal(formatThreshold({ low: null, high: 900, source: 'default' }, 'ppm', 0), 'tanpa batas bawah sampai 900 ppm · ambang bawaan');
  assert.equal(formatThreshold(null, '°C', 1), 'Ambang belum tersedia');
});

test('formatMeasuredAt and isMeasurementStale handle relative time and the documented 90-second warning', () => {
  const now = Date.parse('2026-10-06T08:00:00.000Z');
  assert.equal(formatMeasuredAt('2026-10-06T07:59:48.000Z', now), 'Diukur 12 detik lalu');
  assert.equal(formatMeasuredAt(null, now), 'Belum ada data');
  assert.equal(isMeasurementStale('2026-10-06T07:58:29.000Z', now), true);
  assert.equal(isMeasurementStale('2026-10-06T07:58:31.000Z', now), false);
});

test('summarizeHistory reports last average, overall min/max, and honest empty history', () => {
  assert.deepEqual(summarizeHistory([]), { latest: null, min: null, max: null, count: 0 });
  assert.deepEqual(summarizeHistory([
    { avg: 7.1, min: 7.0, max: 7.2, n: 3 },
    { avg: 6.9, min: 6.8, max: 7.0, n: 5 },
  ]), { latest: 6.9, min: 6.8, max: 7.2, count: 2 });
});

test('formatEventMessage names each documented event and exposes unknown backend event types honestly', () => {
  const sensorNames = { ph: 'pH', water_temperature: 'Suhu air' };
  assert.equal(formatEventMessage({ type: 'online' }, sensorNames), 'Terhubung kembali');
  assert.equal(formatEventMessage({ type: 'offline' }, sensorNames), 'Tidak terhubung');
  assert.equal(formatEventMessage({ type: 'threshold_low', sensor: 'ph', value: 6.4 }, sensorNames), 'pH di bawah ambang: 6,4');
  assert.equal(formatEventMessage({ type: 'threshold_high', sensor: 'water_temperature', value: 31.2 }, sensorNames), 'Suhu air di atas ambang: 31,2');
  assert.equal(formatEventMessage({ type: 'threshold_clear', sensor: 'ph', value: null }, sensorNames), 'pH kembali normal');
  assert.equal(formatEventMessage({ type: 'new_backend_event' }, sensorNames), 'Kejadian tidak dikenal: new_backend_event');
});

test('sortEventsByIdDescending uses numeric event IDs rather than event timestamps', () => {
  const byId = [
    { id: '9007199254740992', type: 'offline', at: '2026-10-06T08:02:00.000Z' },
    { id: '9007199254740993', type: 'online', at: '2026-10-06T08:00:00.000Z' },
  ];

  const sorted = sortEventsByIdDescending(byId);

  assert.deepEqual(sorted.map(event => event.id), ['9007199254740993', '9007199254740992']);
  assert.equal(sorted[0].at, '2026-10-06T08:00:00.000Z');
  assert.deepEqual(byId.map(event => event.id), ['9007199254740992', '9007199254740993']);
});

test('resolveTelemetrySnapshot keeps latest, history, and event errors scoped to their own resources', () => {
  const sensors = [{ code: 'ph' }, { code: 'tds' }];
  const resolved = resolveTelemetrySnapshot({
    sensors,
    latestResult: { status: 'rejected', reason: new Error('Latest gagal.') },
    eventResult: { status: 'fulfilled', value: { events: [] } },
    historyResults: [
      { status: 'fulfilled', value: { sensor: 'ph', points: [] } },
      { status: 'rejected', reason: new Error('Riwayat TDS gagal.') },
    ],
    previousLatest: null,
    previousEvents: [],
    previousHistory: {},
  });

  assert.equal(resolved.latest, null);
  assert.equal(resolved.latestError, 'Latest gagal.');
  assert.deepEqual(resolved.events, []);
  assert.equal(resolved.eventsError, '');
  assert.deepEqual(resolved.history, { ph: { sensor: 'ph', points: [] } });
  assert.deepEqual(resolved.historyErrors, { tds: 'Riwayat TDS gagal.' });
  assert.equal(resolved.error, 'Latest gagal. Riwayat TDS gagal.');
});

test('formatRentangAmbang prints "bawah – atas satuan" with Indonesian decimals', () => {
  assert.equal(formatRentangAmbang([6.5, 8.5], 'pH', 2), '6,50 – 8,50 pH');
  assert.equal(formatRentangAmbang([25, 30], '°C', 1), '25,0 – 30,0 °C');
  assert.equal(formatRentangAmbang([500, 900], 'ppm', 0), '500 – 900 ppm');
  assert.equal(formatRentangAmbang([6.5, 8.5], '', 1), '6,5 – 8,5');
  assert.equal(formatRentangAmbang(null, 'pH', 2), '·');
  assert.equal(formatRentangAmbang(undefined, 'pH', 2), '·');
});
