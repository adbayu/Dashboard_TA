import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync } from 'node:fs';
import { reaksiPet } from '../../src/v-pet/model/reaksiPet.js';
import {
  parseLevelArtworkPath,
  resolvePetArtwork,
  spriteSheetLayoutForArtwork,
  spriteStateForExpression,
} from '../../src/v-pet/model/petCharacterLevels.js';

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
      animated: true,
    },
  );
});

test('marks supplied GIFs as animated', () => {
  assert.equal(parseLevelArtworkPath('karakter-level/nila/level-2__senang.gif', '/assets/level-2.gif')?.animated, true);
});

test('keeps character asset directories limited to supported species', () => {
  const root = new URL('../../src/v-pet/assets/karakter-level/', import.meta.url);
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(directories.every((species) => ['gurame', 'kangkung', 'nila'].includes(species)), `unsupported asset directories: ${directories.join(', ')}`);
});

test('keeps installed Nila, Gurame, and Kangkung condition GIFs across levels 1–4', () => {
  const states = ['normal', 'senang', 'sedih', 'kepanasan', 'kedinginan'];
  const characters = ['nila', 'gurame', 'kangkung'].flatMap((speciesKey) => [1, 2, 3, 4].map((level) => [speciesKey, level]));
  const levelArt = characters.flatMap(([speciesKey, level]) => states.map((state) => {
    const path = `karakter-level/${speciesKey}/level-${level}__${state}.gif`;
    assert.ok(existsSync(new URL(`../../src/v-pet/assets/${path}`, import.meta.url)));
    return parseLevelArtworkPath(path, path);
  }));
  for (const [speciesKey, level] of characters) {
    for (const expression of states) {
      const art = resolvePetArtwork({ speciesKey, level, expression, levelArt });
      assert.equal(art.src, `karakter-level/${speciesKey}/level-${level}__${expression}.gif`);
      assert.equal(art.animated, true);
    }
  }
  assert.equal(resolvePetArtwork({ speciesKey: 'unknown', level: 1, expression: 'senang', levelArt, speciesArt: {} }), null);
});

test('selects the installed Nila condition GIFs from sensor and care reactions', () => {
  const states = ['normal', 'senang', 'sedih', 'kepanasan', 'kedinginan'];
  const levelArt = states.map((state) => {
    const path = `karakter-level/nila/level-1__${state}.gif`;
    assert.ok(existsSync(new URL(`../../src/v-pet/assets/${path}`, import.meta.url)));
    return parseLevelArtworkPath(path, path);
  });
  const temperature = (value) => [{ key: 'temp', value, unit: '°C', ambang: [25, 29] }];
  const cases = [
    [reaksiPet([]), 'normal'],
    [reaksiPet(temperature(27)), 'senang'],
    [reaksiPet(temperature(20)), 'kedinginan'],
    [reaksiPet(temperature(32)), 'kepanasan'],
    [reaksiPet(temperature(27), { lapar: 80 }), 'sedih'],
    [reaksiPet(temperature(27), { kotor: 80 }), 'sedih'],
    [reaksiPet(temperature(27), { sakit: 80 }), 'sedih'],
    [reaksiPet([{ key: 'ph', value: 4, ambang: [6, 8] }]), 'sedih'],
  ];
  for (const [reaction, expected] of cases) {
    const artwork = resolvePetArtwork({ speciesKey: 'nila', level: 1,
      expression: spriteStateForExpression(reaction.ekspresi), levelArt });
    assert.equal(artwork.expression, expected);
    assert.equal(artwork.animated, true);
  }
  assert.equal(resolvePetArtwork({ speciesKey: 'nila', level: 2, expression: 'senang', levelArt }), null);
  assert.equal(resolvePetArtwork({ speciesKey: 'gurame', level: 1, expression: 'senang', levelArt }), null);
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
    { speciesKey: 'gurame', minLevel: 1, maxLevel: 2, src: '/gurame.png' },
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

test('returns no character art for unsupported species until the user supplies it', () => {
  assert.equal(resolvePetArtwork({ speciesKey: 'unknown', level: 1, expression: 'senang', levelArt: [], speciesArt: {} }), null);
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
  assert.equal(spriteStateForExpression('mengantuk'), 'normal');
  assert.equal(spriteStateForExpression('normal'), 'normal');
  assert.equal(spriteStateForExpression('kepanasan'), 'kepanasan');
  assert.equal(spriteStateForExpression('kedinginan'), 'kedinginan');
  assert.equal(spriteStateForExpression('lapar'), 'sedih');
  assert.equal(spriteStateForExpression('asam'), 'sedih');
});
