import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pilihSensorAwal } from './pilihSensorAwal.js';

const JENIS = [{ code: 'air_temperature' }, { code: 'ph' }, { code: 'tds' }];
const ALAT = [
  { id: 'a', type: { sensors: [{ code: 'ph' }] } },
  { id: 'b', sensors: [{ code: 'tds' }] },
];

test('pilihan pengguna yang valid selalu dipakai, walau belum ada alatnya', () => {
  assert.equal(pilihSensorAwal(JENIS, ALAT, 'air_temperature'), 'air_temperature');
});

test('tanpa pilihan, sensor pertama yang punya alat dipilih, bukan sekadar jenis pertama', () => {
  assert.equal(pilihSensorAwal(JENIS, ALAT, ''), 'ph');
  assert.equal(pilihSensorAwal(JENIS, ALAT, 'tidak_ada'), 'ph');
});

test('tanpa alat sama sekali, jenis pertama tetap dipilih; tanpa jenis hasilnya kosong', () => {
  assert.equal(pilihSensorAwal(JENIS, [], ''), 'air_temperature');
  assert.equal(pilihSensorAwal([], ALAT, ''), '');
});
