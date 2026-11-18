import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSensorPoints } from '../../src/dashboard/model/sensorHistoryChart.js';
import { nilaiTerhadapAmbang } from '../../src/shared/model/threshold.js';

test('filters by area and visible local dates, then sorts points chronologically', () => {
  const readings = [
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '11:00', at: '2026-10-26T11:00', readings: { ph: 7.1 } },
    { areaId: 'AR-02', tanggal: '2026-10-26', jam: '10:00', at: '2026-10-26T10:00', readings: { ph: 8.4 } },
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '10:30', at: '2026-10-26T10:30', readings: { ph: 7.0 } },
    { areaId: 'AR-01', tanggal: '2026-10-12', jam: '10:00', at: '2026-10-12T10:00', readings: { ph: 6.9 } },
  ];

  assert.deepEqual(
    buildSensorPoints(readings, 'AR-01', 'ph', ['2026-10-26']),
    [
      { at: '2026-10-26T10:30', value: 7.0 },
      { at: '2026-10-26T11:00', value: 7.1 },
    ],
  );
});

test('uses local date and time when at is malformed', () => {
  const readings = [
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '10:15', at: 'bad-date', readings: { temp: '27.5' } },
  ];

  assert.deepEqual(
    buildSensorPoints(readings, 'AR-01', 'temp', ['2026-10-26']),
    [{ at: '2026-10-26T10:15', value: 27.5 }],
  );
});

test('keeps missing, empty, and non-finite values as null points', () => {
  const readings = [
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '10:00', at: '2026-10-26T10:00', readings: {} },
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '10:30', at: '2026-10-26T10:30', readings: { tds: '' } },
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '11:00', at: '2026-10-26T11:00', readings: { tds: 'not-a-number' } },
    { areaId: 'AR-01', tanggal: '2026-10-26', jam: '11:30', at: '2026-10-26T11:30', readings: { tds: '   ' } },
  ];

  assert.deepEqual(
    buildSensorPoints(readings, 'AR-01', 'tds', ['2026-10-26']),
    [
      { at: '2026-10-26T10:00', value: null },
      { at: '2026-10-26T10:30', value: null },
      { at: '2026-10-26T11:00', value: null },
      { at: '2026-10-26T11:30', value: null },
    ],
  );
});

test('uses inclusive shared threshold bounds', () => {
  assert.equal(nilaiTerhadapAmbang(6.5, [6.5, 7.5]), 'dalam');
  assert.equal(nilaiTerhadapAmbang(7.5, [6.5, 7.5]), 'dalam');
  assert.equal(nilaiTerhadapAmbang(6.49, [6.5, 7.5]), 'bawah');
  assert.equal(nilaiTerhadapAmbang(7.51, [6.5, 7.5]), 'atas');
  assert.equal(nilaiTerhadapAmbang(7, null), null);
});
