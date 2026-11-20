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
  ['text-2', 'bg'],
  ['warn-fg', 'warn-bg'],
  ['bad-fg', 'bad-bg'],
  ['info-fg', 'info-bg'],
  ['side-text', 'side-bg'],
  ['side-active-text', 'side-active'],
  // Menu sidebar yang di-hover memakai latar side-active. Baris kecil di footer
  // (peran dan poin) berhuruf side-text-2, yang di Catatan Lapangan terang hanya
  // 4,00:1 di atas side-active, jadi saat hover hurufnya naik ke side-text.
  ['side-text', 'side-active'],
  // Label tombol utama Lumina: gradien primary ke info-fg, hover primary-hover ke info-fg.
  ['on-primary', 'primary-hover'],
  ['on-primary', 'info-fg'],
];

// Batas non-teks: WCAG 1.4.11 (3:1). Cincin fokus memakai `focus`; garis tepi
// input, select, checkbox, dan tombol sekunder memakai `text-2`.
const BOUNDARY_PAIRS = [
  ['focus', 'surface'],
  ['text-2', 'surface'],
  // Penanda keadaan terpilih (WCAG 1.4.11): garis primary di bawah segmen
  // ModeToggle (di atas surface dan surface-2) dan di bawah tab (di atas bg),
  // serta garis side-active-text di sisi kiri menu sidebar aktif (di atas side-bg).
  ['primary', 'surface'],
  ['primary', 'surface-2'],
  ['primary', 'bg'],
  ['side-active-text', 'side-bg'],
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

// Latar halaman Lumina berupa gradien. Teks (subjudul PageHeader memakai text-2,
// tautan memakai primary) duduk langsung di atasnya, jadi kontras dihitung di
// titik terburuk gradien, bukan di `bg` saja. Alfa diambil dari CSS supaya uji
// dan gaya tidak bisa menyimpang.
const css = readFileSync(new URL('./app/styles/theme-surfaces.css', import.meta.url), 'utf8');

function mixOver(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

function tokenColor(palette, name) {
  return parseHex(values[name][palette]);
}

test('Lumina dark: radial page gradient keeps text-2 and primary at 4.5:1 at its worst point', () => {
  const rule = css.match(/\[data-theme="lumina"\]\[data-mode="dark"\] body \{([^}]*)\}/)?.[1] || '';
  const stop = rule.match(/radial-gradient\(circle at 20% 0%, rgb\(var\(--c-leaf-line\)(?: \/ ([\d.]+))?\), rgb\(var\(--c-bg\)\)/);
  assert.ok(stop, 'dark Lumina body gradient is leaf-line over bg');
  const alpha = stop[1] === undefined ? 1 : Number(stop[1]);
  assert.ok(alpha < 1, 'first stop must be translucent');
  const palette = 'lumina-dark';
  const worst = mixOver(tokenColor(palette, 'leaf-line'), tokenColor(palette, 'bg'), alpha);
  for (const name of ['text-2', 'primary', 'text']) {
    const value = contrast(tokenColor(palette, name), worst);
    assert.ok(value >= 4.5, `${name} over the dark Lumina gradient (leaf-line at ${alpha}) is ${value.toFixed(2)}:1, needs 4.5:1`);
  }
  // Pratinjau tema di ThemePicker memakai gradien yang sama.
  assert.equal([...css.matchAll(/radial-gradient\(circle at 20% 0%, rgb\(var\(--c-leaf-line\) \/ ([\d.]+)\)/g)].length, 2, 'body and pratinjau use the translucent stop');
});

test('Lumina light: linear page gradient stops keep text-2 and primary at 4.5:1', () => {
  const rule = css.match(/\[data-theme="lumina"\]\[data-mode="light"\] body \{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /linear-gradient\(135deg, rgb\(var\(--c-bg\)\), rgb\(var\(--c-water-bg\)\) 55%, rgb\(var\(--c-leaf-bg\)\)\)/);
  const palette = 'lumina-light';
  for (const stop of ['bg', 'water-bg', 'leaf-bg']) {
    for (const name of ['text-2', 'primary']) {
      const value = contrast(tokenColor(palette, name), tokenColor(palette, stop));
      assert.ok(value >= 4.5, `${name} over light Lumina stop ${stop} is ${value.toFixed(2)}:1, needs 4.5:1`);
    }
  }
});

// Penanda terpilih tidak boleh hanya warna latar (WCAG 1.4.11): tiap kontrol
// punya garis berwarna yang pasangannya diuji di atas.
test('selected state of ModeToggle, sidebar item, and Lumina tab carries a line cue', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('./shared/theme/ModeToggle.jsx'), /on\s*\? "[^"]*before:bg-primary/);
  assert.match(read('./app/layout/SmartSidebar.jsx'), /isActive\s*\? "[^"]*before:bg-side-active-text/);
  const tab = css.match(/\[data-theme="lumina"\] \[data-ui="tab"\]\[aria-selected="true"\]::after \{([^}]*)\}/)?.[1] || '';
  assert.match(tab, /background: rgb\(var\(--c-primary\)\)/);
});

test('sidebar footer link lifts its secondary line to side-text on hover (side-text-2 is 4.00:1 on side-active)', () => {
  const sidebar = readFileSync(new URL('./app/layout/SmartSidebar.jsx', import.meta.url), 'utf8');
  assert.match(sidebar, /group-hover:text-side-text(?![-\w])/);
  assert.match(sidebar, /className=\{clsx\('group /);
});

test('Lumina primary button hover changes the gradient and keeps label contrast', () => {
  const hover = css.match(/\[data-theme="lumina"\] \[data-ui="button"\]\[data-variant="primary"\]:not\(:disabled\):hover \{([^}]*)\}/)?.[1] || '';
  assert.match(hover, /linear-gradient\(135deg, rgb\(var\(--c-primary-hover\)\), rgb\(var\(--c-info-fg\)\)\)/);
});
