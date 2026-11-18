import assert from 'node:assert/strict';
import test from 'node:test';
import { getAreaFeatures } from '../../src/kelola-area/model/areaFeatures.js';

test('pond areas include fish-only features and shared features', () => {
  assert.deepEqual(
    getAreaFeatures(true).map(({ id }) => id),
    ['sensor', 'kematian', 'pembersihan', 'hpp', 'pemantauan', 'riwayat', 'panen', 'perangkat'],
  );
});

test('non-pond areas omit mortality and cleaning features', () => {
  assert.deepEqual(
    getAreaFeatures(false).map(({ id }) => id),
    ['sensor', 'hpp', 'pemantauan', 'riwayat', 'panen', 'perangkat'],
  );
});
