import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Ratchet migrasi tema (Fase B). Setiap halaman yang sudah dimigrasi
// ditambahkan ke MIGRATED dan sejak itu tidak boleh memuat gaya lama lagi:
// kelas warna palet mentah, Material Symbols, kelas kaca, hex, gradien Tailwind,
// atau eyebrow. Task berikutnya cukup menambah path ke MIGRATED.
export const MIGRATED = [
  'src/masuk/pages/Login.jsx',
  'src/daftar/pages/Daftar.jsx',
  'src/kelola-area/pages/DeviceClaim.jsx',
  'src/profil-saya/pages/Profil.jsx',
  'src/shared/components/PublicFrame.jsx',
  'src/components/iot/PublicAreaLabel.jsx',
];

// Hex memakai pola yang diperketat (R9): tidak mengenai entitas HTML
// (&#8212;) maupun id/kata yang menempel pada '#'.
export const LEGACY = [
  /\b(text|bg|border)-(red|amber|emerald|sky|green|slate|gray)-\d{2,3}\b/,
  /material-symbols-outlined/,
  /\bglass-(card|panel|input)\b/,
  /\bpanel-inset\b/,
  /bg-gradient-to-/,
  /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/,
  /eyebrow=/,
];

// Ganti komentar dengan spasi (nomor baris tetap) supaya catatan di komentar
// yang menyebut gaya lama tidak dianggap pelanggaran. Komentar `//` hanya
// dibuang bila jumlah tanda kutip sebelum `//` genap (bukan di dalam string/URL).
export function stripComments(source) {
  const blank = (text) => text.replace(/[^\r\n]/g, ' ');
  const tanpaBlok = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  return tanpaBlok
    .split('\n')
    .map((line) => {
      for (let i = line.indexOf('//'); i !== -1; i = line.indexOf('//', i + 2)) {
        const sebelum = line.slice(0, i);
        const genap = ['\'', '"', '`'].every((q) => (sebelum.split(q).length - 1) % 2 === 0);
        if (genap && (i === 0 || /\s/.test(line[i - 1]))) return sebelum + blank(line.slice(i));
      }
      return line;
    })
    .join('\n');
}

export function findLegacy(path, source) {
  const hasil = [];
  stripComments(source).split(/\r?\n/).forEach((line, index) => {
    for (const pola of LEGACY) {
      const cocok = line.match(pola);
      if (cocok) hasil.push(`${path}:${index + 1}: ${cocok[0]}`);
    }
  });
  return hasil;
}

test('stripComments mempertahankan nomor baris dan string dengan //', () => {
  const sumber = ['a // text-red-600', '/* glass-card', 'panel-inset */ b', 'href="http://x/#ffffff"'].join('\n');
  const bersih = stripComments(sumber);
  assert.equal(bersih.split('\n').length, 4);
  assert.doesNotMatch(bersih.split('\n').slice(0, 3).join('\n'), /red|glass|inset/);
  assert.match(bersih, /#ffffff/);
});

test('pola hex tidak mengenai entitas HTML atau id', () => {
  const hex = LEGACY.find((p) => p.source.includes('#'));
  assert.doesNotMatch('Keluar &#8212; Masuk', hex);
  assert.doesNotMatch('id="a#abc"', hex);
  assert.match('color: #0f5238;', hex);
  assert.match("fill='#fff'", hex);
});

test('halaman yang sudah dimigrasi bebas dari gaya lama', async () => {
  const pelanggaran = [];
  for (const path of MIGRATED) {
    const sumber = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    pelanggaran.push(...findLegacy(path, sumber));
  }
  assert.deepEqual(pelanggaran, [], `Gaya lama masih ada:\n${pelanggaran.join('\n')}`);
});
