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
// yang menyebut gaya lama tidak dianggap pelanggaran. Pemindai satu lintasan
// yang sadar string: `/*` dan `//` di dalam '...', "..." atau `...` bukan
// komentar (glob rute, accept="image/*", URL). String ' dan " berakhir di
// akhir baris supaya apostrof nyasar di teks JSX hanya berdampak pada barisnya.
// `//` hanya dianggap komentar di awal baris atau setelah spasi (bukan http://).
export function stripComments(source) {
  const blank = (text) => text.replace(/[^\r\n]/g, ' ');
  let hasil = '';
  let kutip = null;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const dua = source.slice(i, i + 2);
    if (kutip) {
      if (c === '\\') {
        hasil += source.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === kutip || (c === '\n' && kutip !== '`')) kutip = null;
      hasil += c;
      i += 1;
    } else if (c === '\'' || c === '"' || c === '`') {
      kutip = c;
      hasil += c;
      i += 1;
    } else if (dua === '/*') {
      const akhir = source.indexOf('*/', i + 2);
      const sampai = akhir === -1 ? source.length : akhir + 2;
      hasil += blank(source.slice(i, sampai));
      i = sampai;
    } else if (dua === '//' && (i === 0 || /\s/.test(source[i - 1]))) {
      let sampai = source.indexOf('\n', i);
      if (sampai === -1) sampai = source.length;
      hasil += blank(source.slice(i, sampai));
      i = sampai;
    } else {
      hasil += c;
      i += 1;
    }
  }
  return hasil;
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

// Regresi: string yang memuat `/*` (glob rute, accept="image/*") tidak boleh
// membuka komentar palsu yang menelan baris asli sampai `*/` berikutnya.
test('stripComments sadar string: "/admin/*" tidak menelan baris sesudahnya', () => {
  const sumber = '<Route path="/admin/*" />\n<p className="text-red-600" />\n{/* catatan */}';
  assert.deepEqual(findLegacy('x.jsx', sumber), ['x.jsx:2: text-red-600']);
  assert.equal(stripComments(sumber).split('\n').length, 3);
});

test('stripComments sadar string: glob dan accept tidak membuka komentar palsu', () => {
  const kasus = [
    'const m = import.meta.glob(\'./pages/*.jsx\');\n<i className="bg-emerald-50" />\n/* tutup */',
    '<input accept="image/*" />\n<b className="glass-card" />\n{/* tutup */}',
    'const re = `src/**/*.jsx`;\n<b className="panel-inset" />\n/* tutup */',
  ];
  for (const sumber of kasus) {
    const hasil = findLegacy('x.jsx', sumber);
    assert.equal(hasil.length, 1, sumber);
    assert.match(hasil[0], /^x\.jsx:2: /);
  }
});

test('stripComments tetap membuang komentar asli dan menjaga nomor baris', () => {
  const sumber = [
    '<a href="/x/*">ok</a> /* text-red-600',
    'glass-card */ <b className="bg-red-50" />',
    '{/* material-symbols-outlined */}',
    "const u = 'http://x'; // eyebrow=",
    '<c className="panel-inset" />',
  ].join('\n');
  assert.equal(stripComments(sumber).split('\n').length, 5);
  assert.deepEqual(findLegacy('x.jsx', sumber), ['x.jsx:2: bg-red-50', 'x.jsx:5: panel-inset']);
});

// Setiap pola LEGACY harus terdeteksi lewat findLegacy; kalau pembersih
// komentar rusak lagi, ratchet tidak boleh lulus karena menelan semuanya.
const CONTOH_PELANGGARAN = [
  ['kelas warna palet', '<p className="bg-red-50" />', 'bg-red-50'],
  ['material symbols', '<span className="material-symbols-outlined">eco</span>', 'material-symbols-outlined'],
  ['glass', '<div className="glass-card" />', 'glass-card'],
  ['panel-inset', '<div className="panel-inset" />', 'panel-inset'],
  ['gradien tailwind', '<div className="bg-gradient-to-r" />', 'bg-gradient-to-'],
  ['hex 6 digit', "const c = '#0f5238';", '#0f5238'],
  ['hex 3 digit', 'color: #fff;', '#fff'],
  ['eyebrow', '<SectionTitle eyebrow="Data" />', 'eyebrow='],
];

test('setiap pola LEGACY terdeteksi oleh findLegacy (uji diri positif)', () => {
  for (const [nama, sumber, cocok] of CONTOH_PELANGGARAN) {
    assert.deepEqual(findLegacy('x.jsx', sumber), [`x.jsx:1: ${cocok}`], nama);
  }
  for (const pola of LEGACY) {
    assert.ok(CONTOH_PELANGGARAN.some(([, sumber]) => pola.test(sumber)), `pola ${pola} punya contoh`);
  }
});

test('halaman yang sudah dimigrasi bebas dari gaya lama', async () => {
  const pelanggaran = [];
  for (const path of MIGRATED) {
    const sumber = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    pelanggaran.push(...findLegacy(path, sumber));
  }
  assert.deepEqual(pelanggaran, [], `Gaya lama masih ada:\n${pelanggaran.join('\n')}`);
});
