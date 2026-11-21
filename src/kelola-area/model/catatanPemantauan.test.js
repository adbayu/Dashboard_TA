import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buatEntriPemantauan, GALAT_TANPA_PARAMETER } from './catatanPemantauan.js';

const area = { areaId: 'AR-01', areaName: 'Kolam Nila A', by: 'Budi' };
const kosong = { ph: '', temp: '', tds: '', note: '' };

test('catatan pemantauan: formulir kosong ditolak dengan galat, tanpa entri', () => {
  const hasil = buatEntriPemantauan(kosong, area);
  assert.equal(hasil.entry, undefined);
  assert.equal(hasil.galat, GALAT_TANPA_PARAMETER);
});

test('catatan pemantauan: teks catatan saja tanpa parameter tetap ditolak', () => {
  const hasil = buatEntriPemantauan({ ...kosong, note: 'Air jernih' }, area);
  assert.equal(hasil.galat, GALAT_TANPA_PARAMETER);
});

test('catatan pemantauan: nilai bukan angka atau hanya spasi tidak dihitung sebagai parameter', () => {
  assert.equal(buatEntriPemantauan({ ...kosong, ph: '   ' }, area).galat, GALAT_TANPA_PARAMETER);
  assert.equal(buatEntriPemantauan({ ...kosong, tds: 'abc' }, area).galat, GALAT_TANPA_PARAMETER);
});

test('catatan pemantauan: satu parameter cukup, angka nol sah, kunci kosong tidak ikut', () => {
  const { entry, galat } = buatEntriPemantauan({ ...kosong, temp: '0', note: 'Pagi' }, area);
  assert.equal(galat, undefined);
  assert.deepEqual(entry, { areaId: 'AR-01', areaName: 'Kolam Nila A', by: 'Budi', temp: 0, note: 'Pagi' });
});

test('catatan pemantauan: tiga parameter diubah ke Number', () => {
  const { entry } = buatEntriPemantauan({ ph: '6.8', temp: '27', tds: '350', note: '' }, area);
  assert.equal(entry.ph, 6.8);
  assert.equal(entry.temp, 27);
  assert.equal(entry.tds, 350);
});
