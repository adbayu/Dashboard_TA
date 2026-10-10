import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseLevelArtworkPath,
  resolvePetArtwork,
  spriteSheetLayoutForArtwork,
  spriteStateForExpression,
} from '../src/data/petCharacterLevels.js';

test('parses a supplied level image path and title', () => {
  assert.deepEqual(
    parseLevelArtworkPath('../assets/v-pet/karakter-level/nila/level-3-4__nener.png', '/assets/nener.png'),
    {
      speciesKey: 'nila',
      minLevel: 3,
      maxLevel: 4,
      title: 'Nener',
      src: '/assets/nener.png',
      format: 'png',
      expression: null,
      animated: false,
    },
  );
});

test('parses a supplied single-level image', () => {
  assert.deepEqual(
    parseLevelArtworkPath('karakter-level/nila/level-5__ikan-muda.png', '/assets/level-5.png'),
    { speciesKey: 'nila', minLevel: 5, maxLevel: 5, title: 'Ikan Muda', src: '/assets/level-5.png', format: 'png', expression: null, animated: false },
  );
});

test('parses an expression-specific supplied GIF', () => {
  assert.deepEqual(
    parseLevelArtworkPath('karakter-level/nila/level-1__senang.gif', '/assets/nila-level-1-senang.gif'),
    {
      speciesKey: 'nila',
      minLevel: 1,
      maxLevel: 1,
      title: null,
      src: '/assets/nila-level-1-senang.gif',
      format: 'gif',
      expression: 'senang',
      animated: false,
    },
  );
});

test('marks other supplied GIFs as animated unless their path is explicitly verified static', () => {
  assert.equal(parseLevelArtworkPath('karakter-level/nila/level-2__senang.gif', '/assets/level-2.gif')?.animated, true);
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

test('prefers the matching emotion GIF and never reuses it for another unsupported emotion', () => {
  const happy = parseLevelArtworkPath('karakter-level/nila/level-1__senang.gif', '/assets/happy.gif');
  const sad = parseLevelArtworkPath('karakter-level/nila/level-1__sedih.gif', '/assets/sad.gif');
  const sheet = parseLevelArtworkPath('karakter-level/nila/level-1__nila-level-1.png', '/assets/level-1.png');
  const levelArt = [happy, sad, sheet].filter(Boolean);
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 1, expression: 'senang', levelArt })?.src, '/assets/happy.gif');
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 1, expression: 'sedih', levelArt })?.src, '/assets/sad.gif');
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 1, expression: 'kepanasan', levelArt })?.src, '/assets/level-1.png');
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 1, expression: 'sedih', levelArt: [happy] }), null);
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

test('returns no art for species without supplied assets, including Nila while GIFs are pending', () => {
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 1, levelArt: [], speciesArt: {} }), null);
  assert.equal(resolvePetArtwork({ speciesKey: 'lele', level: 1, levelArt: [], speciesArt: {} }), null);
});

test('keeps Nila sprite-sheet layout metadata available for compatible supplied art', () => {
  const artworks = [1, 2, 3, 4].map(level => ({
    level,
    src: `/assets/nila-level-${level}.png`,
    artwork: parseLevelArtworkPath(`karakter-level/nila/level-${level}__nila-level-${level}.png`, `/assets/nila-level-${level}.png`),
  }));
  for (const { level, src, artwork } of artworks) {
    const layout = spriteSheetLayoutForArtwork(artwork);
    assert.equal(layout.frameCount, 4);
    assert.deepEqual(layout.rows, { senang: 233, sedih: 492, kepanasan: 751, kedinginan: 1014 });
    assert.equal(resolvePetArtwork({ speciesKey: 'nila', level, levelArt: [artwork] })?.src, src);
    assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: level + 1, levelArt: [artwork] }), null);
  }
  const level5 = parseLevelArtworkPath('karakter-level/nila/level-5__nila-level-5.png', '/assets/nila-level-5.png');
  assert.equal(spriteSheetLayoutForArtwork(level5), null);
});

test('maps sensor temperature directly and other non-happy states to supplied rows', () => {
  assert.equal(spriteStateForExpression('senang'), 'senang');
  assert.equal(spriteStateForExpression('mengantuk'), 'senang');
  assert.equal(spriteStateForExpression('kepanasan'), 'kepanasan');
  assert.equal(spriteStateForExpression('kedinginan'), 'kedinginan');
  assert.equal(spriteStateForExpression('lapar'), 'sedih');
  assert.equal(spriteStateForExpression('asam'), 'sedih');
});
