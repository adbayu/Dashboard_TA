import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import {
  isPetActionAnimationSupported,
  parsePetActionAnimationPath,
  resolvePetActionAnimation,
} from '../../src/v-pet/model/petActionAnimations.js';

const assetUrl = (speciesKey, name) => new URL(`../../src/v-pet/assets/aksi/${speciesKey}/${name}`, import.meta.url);
const speciesKeys = ['nila', 'gurame'];
const levels = [1, 2, 3, 4];
const actions = ['feed', 'play'];
const actionConditions = ['normal', 'senang', 'sedih', 'kedinginan', 'kepanasan'];
const animationArt = speciesKeys.flatMap((speciesKey) => levels.flatMap((level) => actions.flatMap((action) => (
  actionConditions.map((condition) => {
  const actionSlug = action === 'feed' ? 'beri-pakan' : 'main';
  const conditionSuffix = condition === 'normal' ? '' : `__${condition}`;
  const filename = `${speciesKey}-L${level}-${actionSlug}${conditionSuffix}.gif`;
  const path = `../assets/aksi/${speciesKey}/${filename}`;
  assert.ok(existsSync(assetUrl(speciesKey, filename)), `missing ${filename}`);
  return parsePetActionAnimationPath(path, `/assets/${filename}`);
  })
))));

test('parses supplied Nila and Gurame action GIFs with the package durations', () => {
  assert.equal(animationArt.length, 80);
  assert.equal(animationArt.filter((item) => item.action === 'feed' && item.durationMs === 5000).length, 40);
  assert.equal(animationArt.filter((item) => item.action === 'play' && item.durationMs === 4000).length, 40);
  assert.equal(animationArt.filter((item) => item.speciesKey === 'nila').length, 40);
  assert.equal(animationArt.filter((item) => item.speciesKey === 'gurame').length, 40);
  assert.ok(animationArt.every((item) => item.animated && item.format === 'gif'));
  for (const speciesKey of speciesKeys) {
    for (const condition of actionConditions) {
      assert.equal(animationArt.filter((item) => item.speciesKey === speciesKey && item.condition === condition).length, 8);
    }
  }
});

test('resolves action artwork by species, level, action, and current Nila condition', () => {
  const feed = resolvePetActionAnimation({ speciesKey: 'nila', level: 2, action: 'feed', condition: 'normal', animationArt });
  const happyPlay = resolvePetActionAnimation({ speciesKey: 'nila', level: 1, action: 'play', condition: 'senang', animationArt });
  const sadFeed = resolvePetActionAnimation({ speciesKey: 'nila', level: 3, action: 'feed', condition: 'sedih', animationArt });
  const coldFeed = resolvePetActionAnimation({ speciesKey: 'nila', level: 2, action: 'feed', condition: 'kedinginan', animationArt });
  const hotPlay = resolvePetActionAnimation({ speciesKey: 'nila', level: 4, action: 'play', condition: 'kepanasan', animationArt });
  const fallbackPlay = resolvePetActionAnimation({ speciesKey: 'nila', level: 4, action: 'play', condition: 'mengantuk', animationArt });
  const gurameFeed = resolvePetActionAnimation({ speciesKey: 'gurame', level: 3, action: 'feed', condition: 'senang', animationArt });
  const gurameColdPlay = resolvePetActionAnimation({ speciesKey: 'gurame', level: 1, action: 'play', condition: 'kedinginan', animationArt });
  const gurameHotFeed = resolvePetActionAnimation({ speciesKey: 'gurame', level: 4, action: 'feed', condition: 'kepanasan', animationArt });
  assert.equal(feed.src, '/assets/nila-L2-beri-pakan.gif');
  assert.equal(happyPlay.src, '/assets/nila-L1-main__senang.gif');
  assert.equal(sadFeed.src, '/assets/nila-L3-beri-pakan__sedih.gif');
  assert.equal(coldFeed.src, '/assets/nila-L2-beri-pakan__kedinginan.gif');
  assert.equal(hotPlay.src, '/assets/nila-L4-main__kepanasan.gif');
  assert.equal(fallbackPlay.src, '/assets/nila-L4-main.gif');
  assert.equal(gurameFeed.src, '/assets/gurame-L3-beri-pakan__senang.gif');
  assert.equal(gurameColdPlay.src, '/assets/gurame-L1-main__kedinginan.gif');
  assert.equal(gurameHotFeed.src, '/assets/gurame-L4-beri-pakan__kepanasan.gif');
  assert.equal(resolvePetActionAnimation({ speciesKey: 'kangkung', level: 2, action: 'feed', animationArt }), null);
  assert.equal(resolvePetActionAnimation({ speciesKey: 'nila', level: 5, action: 'play', animationArt }), null);
});

test('only enables supplied action animation combinations', () => {
  for (const speciesKey of speciesKeys) {
    for (const level of levels) {
      for (const action of actions) assert.equal(isPetActionAnimationSupported({ speciesKey, level, action }), true);
    }
  }
  assert.equal(isPetActionAnimationSupported({ speciesKey: 'kangkung', level: 1, action: 'feed' }), false);
  assert.equal(isPetActionAnimationSupported({ speciesKey: 'nila', level: 5, action: 'play' }), false);
  assert.equal(isPetActionAnimationSupported({ speciesKey: 'nila', level: 1, action: 'clean' }), false);
});
