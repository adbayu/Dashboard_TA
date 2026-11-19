import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { KEBUN_AIR_TERANG, readThemeColor } from './readThemeColor.js';

function withDom(values, run) {
  const hadDocument = 'document' in globalThis;
  const previousDocument = globalThis.document;
  const previousStyle = globalThis.getComputedStyle;
  globalThis.document = { documentElement: {} };
  globalThis.getComputedStyle = () => ({ getPropertyValue: name => values[name] ?? '' });
  try {
    return run();
  } finally {
    if (hadDocument) globalThis.document = previousDocument; else delete globalThis.document;
    if (previousStyle) globalThis.getComputedStyle = previousStyle; else delete globalThis.getComputedStyle;
  }
}

test('readThemeColor reads --c-<name> from the root and formats rgb()', () => {
  withDom({ '--c-chart-1': ' 10 20 30 ' }, () => {
    assert.equal(readThemeColor('chart-1'), 'rgb(10 20 30)');
    assert.equal(readThemeColor('chart-1', 0.5), 'rgb(10 20 30 / 0.5)');
  });
});

test('readThemeColor falls back to Kebun Air terang without a document or a value', () => {
  assert.equal(readThemeColor('chart-1'), `rgb(${KEBUN_AIR_TERANG['chart-1']})`);
  assert.equal(readThemeColor('warn-fg', 0.14), `rgb(${KEBUN_AIR_TERANG['warn-fg']} / 0.14)`);
  withDom({}, () => {
    assert.equal(readThemeColor('border'), `rgb(${KEBUN_AIR_TERANG.border})`);
  });
  withDom({ '--c-border': 'not a colour' }, () => {
    assert.equal(readThemeColor('border'), `rgb(${KEBUN_AIR_TERANG.border})`);
  });
});

test('the fallback table equals the kebun-air-light column of design/tokens.json', async () => {
  const tokens = JSON.parse(await readFile(new URL('../../../design/tokens.json', import.meta.url), 'utf8'));
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(' ');
  for (const { name, value } of tokens.color.tokens) {
    assert.equal(KEBUN_AIR_TERANG[name], rgb(value['kebun-air-light']), `token ${name}`);
  }
  assert.equal(Object.keys(KEBUN_AIR_TERANG).length, tokens.color.tokens.length);
});
