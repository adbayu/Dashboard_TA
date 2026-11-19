// Membaca warna tema aktif dari variable CSS `--c-<nama>` (triplet RGB, lihat
// src/app/styles/themes.css) untuk kode yang tidak bisa memakai kelas Tailwind,
// terutama kanvas Chart.js. Hasilnya string `rgb(R G B)` atau `rgb(R G B / a)`.

/**
 * Cadangan bila tidak ada `document` (SSR, tes) atau variable belum terisi:
 * kolom `kebun-air-light` dari design/tokens.json, ditulis sebagai triplet RGB.
 * Sengaja tabel kecil ini, bukan `import tokens.json`: berkas itu memuat sepuluh
 * palet (hex) dan akan ikut masuk bundel peramban. readThemeColor.test.js
 * membandingkan tabel ini dengan tokens.json sehingga keduanya tidak bisa
 * berselisih diam-diam.
 */
export const KEBUN_AIR_TERANG = {
  bg: '244 241 233',
  surface: '255 253 248',
  'surface-2': '236 231 218',
  border: '221 213 195',
  text: '38 35 24',
  'text-2': '102 94 76',
  primary: '63 95 38',
  'primary-hover': '51 78 30',
  'on-primary': '255 255 255',
  focus: '63 95 38',
  band: '207 223 174',
  track: '232 225 209',
  marker: '38 35 24',
  'ok-fg': '63 106 31',
  'ok-bg': '231 238 217',
  'warn-fg': '154 63 23',
  'warn-bg': '248 228 215',
  'warn-line': '226 163 127',
  'bad-fg': '143 29 20',
  'bad-bg': '246 217 211',
  'bad-line': '224 154 142',
  'info-fg': '31 111 139',
  'info-bg': '226 238 241',
  'side-bg': '38 48 24',
  'side-text': '241 237 226',
  'side-text-2': '188 192 166',
  'side-active': '58 71 39',
  'side-active-text': '255 255 255',
  'side-line': '50 62 33',
  'mark-bg': '166 196 111',
  'mark-fg': '24 32 11',
  'chart-1': '31 111 139',
  'water-bg': '226 238 241',
  'water-line': '192 216 222',
  'water-fg': '31 111 139',
  'leaf-bg': '231 238 217',
  'leaf-line': '202 216 176',
  'leaf-fg': '63 95 38',
  'chip-ink': '255 255 255',
};

const TRIPLET = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/;

function readTriplet(name) {
  try {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
    return TRIPLET.test(raw) ? raw.replace(/\s+/g, ' ') : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} name  nama token tanpa awalan, mis. 'chart-1', 'warn-fg'.
 * @param {number} [alpha]  0..1; dihilangkan untuk warna pekat.
 * @returns {string} `rgb(R G B)` atau `rgb(R G B / alpha)`.
 */
export function readThemeColor(name, alpha) {
  const triplet = readTriplet(name) ?? KEBUN_AIR_TERANG[name] ?? KEBUN_AIR_TERANG.text;
  return alpha === undefined ? `rgb(${triplet})` : `rgb(${triplet} / ${alpha})`;
}
