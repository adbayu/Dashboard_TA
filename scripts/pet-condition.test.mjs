import assert from 'node:assert/strict';
import test from 'node:test';
import { penjelasanKondisiAir } from '../src/data/reaksiPet.js';

test('explains an in-range sensor reading without marking the pet stressed', () => {
  const text = penjelasanKondisiAir({ key: 'temp', value: 26, unit: '°C', ambang: [24, 28] });
  assert.match(text, /di dalam rentang ideal 24–28 °C/);
  assert.match(text, /tidak membebani kondisi pet/);
});

test('explains a low temperature as a cold-water reaction', () => {
  const text = penjelasanKondisiAir({ key: 'temp', value: 22, unit: '°C', ambang: [24, 28] });
  assert.match(text, /di bawah ambang ideal/);
  assert.match(text, /kedinginan/);
});

test('explains a high TDS reading as overly concentrated water', () => {
  const text = penjelasanKondisiAir({ key: 'tds', value: 900, unit: 'ppm', ambang: [500, 800] });
  assert.match(text, /di atas ambang ideal/);
  assert.match(text, /terlalu pekat/);
});

test('reports missing readings and missing thresholds honestly', () => {
  assert.match(penjelasanKondisiAir({ key: 'ph', value: null, unit: '', ambang: [6, 8] }), /Belum ada pembacaan sensor/);
  assert.match(penjelasanKondisiAir({ key: 'ph', value: 7, unit: '', ambang: null }), /Ambang ideal belum diatur/);
});
