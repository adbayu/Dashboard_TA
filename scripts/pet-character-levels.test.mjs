import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLevelArtworkPath, resolvePetArtwork } from '../src/data/petCharacterLevels.js';

test('parses a supplied level image path and title', () => {
  assert.deepEqual(
    parseLevelArtworkPath('../assets/v-pet/karakter-level/nila/level-3-4__nener.png', '/assets/nener.png'),
    {
      speciesKey: 'nila',
      minLevel: 3,
      maxLevel: 4,
      title: 'Nener',
      src: '/assets/nener.png',
    },
  );
});

test('parses a supplied single-level image', () => {
  assert.deepEqual(
    parseLevelArtworkPath('karakter-level/nila/level-5__ikan-muda.png', '/assets/level-5.png'),
    { speciesKey: 'nila', minLevel: 5, maxLevel: 5, title: 'Ikan Muda', src: '/assets/level-5.png' },
  );
});

test('rejects reversed level ranges and unrelated paths', () => {
  assert.equal(parseLevelArtworkPath('karakter-level/nila/level-5-2__judul.png', '/bad.png'), null);
  assert.equal(parseLevelArtworkPath('karakter-arcade/nila/body.png', '/base.png'), null);
});

test('uses an exact-level image before a broader range', () => {
  const artwork = [
    { speciesKey: 'nila', minLevel: 1, maxLevel: 4, title: 'Benih', src: '/range.png' },
    { speciesKey: 'nila', minLevel: 3, maxLevel: 3, title: 'Nila Level 3', src: '/exact.png' },
  ];
  const result = resolvePetArtwork({ speciesKey: 'nila', level: 3, levelArt: artwork, speciesArt: {} });
  assert.equal(result.src, '/exact.png');
  assert.equal(result.title, 'Nila Level 3');
  assert.equal(result.isLevelSpecific, true);
});

test('selects by species and inclusive level range', () => {
  const artwork = [
    { speciesKey: 'nila', minLevel: 1, maxLevel: 2, src: '/nila.png' },
    { speciesKey: 'lele', minLevel: 1, maxLevel: 2, src: '/lele.png' },
  ];
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 2, levelArt: artwork }).src, '/nila.png');
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 3, levelArt: artwork })?.src, undefined);
});

test('falls back to the supplied species image until level art is added', () => {
  const result = resolvePetArtwork({
    speciesKey: 'nila',
    level: 7,
    levelArt: [],
    speciesArt: { nila: '/user-nila.png' },
  });
  assert.equal(result.src, '/user-nila.png');
  assert.equal(result.isLevelSpecific, false);
});

test('returns no art for an unsupplied species', () => {
  assert.equal(resolvePetArtwork({ speciesKey: 'lele', level: 1, levelArt: [], speciesArt: {} }), null);
});
