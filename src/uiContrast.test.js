import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Kontras dihitung langsung dari design/tokens.json (sumber tunggal warna kelima
// tema, terang dan gelap). Komponen bersama hanya memakai pasangan token di
// bawah ini, jadi bila semua palet lulus, teks dan batas kontrol ikut lulus.
const tokens = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
const palettes = tokens.color.themes.map(theme => theme.id);
const values = Object.fromEntries(tokens.color.tokens.map(token => [token.name, token.value]));

function parseHex(value) {
  const hex = value.replace('#', '');
  const full = hex.length === 3 ? [...hex].map(channel => channel + channel).join('') : hex;
  assert.match(full, /^[0-9a-f]{6}$/i, `Unsupported token colour: ${value}`);
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
}

function luminance(color) {
  const [red, green, blue] = color.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function ratio(palette, foreground, background) {
  const fg = values[foreground]?.[palette];
  const bg = values[background]?.[palette];
  assert.ok(fg, `${foreground} is missing in ${palette}`);
  assert.ok(bg, `${background} is missing in ${palette}`);
  return contrast(parseHex(fg), parseHex(bg));
}

// Teks: WCAG 1.4.3 (4,5:1).
const TEXT_PAIRS = [
  ['on-primary', 'primary'],
  ['text', 'surface'],
  ['text-2', 'surface'],
  ['warn-fg', 'warn-bg'],
  ['bad-fg', 'bad-bg'],
  ['info-fg', 'info-bg'],
  ['side-text', 'side-bg'],
  ['side-active-text', 'side-active'],
];

// Batas non-teks: WCAG 1.4.11 (3:1). Cincin fokus memakai `focus`; garis tepi
// input, select, checkbox, dan tombol sekunder memakai `text-2`.
const BOUNDARY_PAIRS = [
  ['focus', 'surface'],
  ['text-2', 'surface'],
];

// Isi batang progres (Bar) di atas lintasan `track`: WCAG 1.4.11 (3:1).
const PROGRESS_FILL_PAIRS = [
  ['primary', 'track'],
  ['warn-fg', 'track'],
  ['bad-fg', 'track'],
];

test('tokens.json covers all ten palettes', () => {
  assert.equal(palettes.length, 10);
  for (const tema of ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina']) {
    assert.ok(palettes.includes(`${tema}-light`), `${tema}-light missing`);
    assert.ok(palettes.includes(`${tema}-dark`), `${tema}-dark missing`);
  }
});

for (const palette of palettes) {
  test(`${palette}: text pairs reach 4.5:1`, () => {
    for (const [foreground, background] of TEXT_PAIRS) {
      const value = ratio(palette, foreground, background);
      assert.ok(value >= 4.5, `${foreground}/${background} in ${palette} is ${value.toFixed(2)}:1, needs 4.5:1`);
    }
  });

  test(`${palette}: focus ring, input border, and progress fill reach 3:1`, () => {
    for (const [foreground, background] of [...BOUNDARY_PAIRS, ...PROGRESS_FILL_PAIRS]) {
      const value = ratio(palette, foreground, background);
      assert.ok(value >= 3, `${foreground}/${background} in ${palette} is ${value.toFixed(2)}:1, needs 3:1`);
    }
  });
}
