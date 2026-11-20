import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Ratchet migrasi tema. Semua berkas JSX di src/ (kecuali /pilot, di luar
// cakupan desain ini) tidak boleh memuat gaya lama: kelas warna palet mentah,
// Material Symbols, kelas kaca, hex, gradien Tailwind, atau eyebrow. Halaman
// baru otomatis ikut dipindai; tidak ada daftar yang perlu dirawat.
const AKAR = new URL('../../', import.meta.url);

function kumpulkanJsx(dir, prefiks, hasil) {
  for (const entri of readdirSync(new URL(dir, AKAR), { withFileTypes: true })) {
    const jalur = `${prefiks}${entri.name}`;
    if (entri.isDirectory()) {
      if (jalur === 'src/pilot') continue;
      kumpulkanJsx(`${jalur}/`, `${jalur}/`, hasil);
    } else if (entri.name.endsWith('.jsx')) {
      hasil.push(jalur);
    }
  }
  return hasil;
}

// Berkas non-JSX yang dijaga sejak dulu atau dibuat di Fase B. Sengaja bukan
// semua .js: data seed lama (warna hex avatar/kategori) akan melanggar pola hex.
export const EKSTRA = [
  'src/v-pet/styles/pet.css',
  'src/shared/qr/opsiQr.js',
  'src/shared/components/ui/tombol.js',
  'src/shared/components/ui/avatarKeluarga.js',
  'src/shared/model/rona.js',
  'src/kelola-area/model/areaTone.js',
  'src/kelola-area/model/areaTampil.js',
  'src/kategori-device/model/nadaKategori.js',
  'src/kelola-user/model/statusAkun.js',
  'src/dashboard-pengelola/model/daftarTindakan.js',
  'src/shared/store/migrasiIkon.js',
];

export const MIGRATED = [...kumpulkanJsx('src/', 'src/', []), ...EKSTRA].sort();

// Hex memakai pola yang diperketat (R9): tidak mengenai entitas HTML
// (&#8212;) maupun id/kata yang menempel pada '#'.
export const LEGACY = [
  // Palet Tailwind mentah (semua nama berlangkah angka) pada utilitas warna.
  /\b(?:text|bg|border|ring|from|to|via|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
  // Varian dark: (mode gelap datang dari token lewat data-mode, bukan kelas).
  /(?<![\w-])dark:/,
  // Literal rgb()/rgba() berangka; rgb(var(--c-...)) yang memakai token tetap sah.
  /\brgba?\((?=\s*[\d.])/,
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
  ['palet text-', '<p className="text-blue-600" />', 'text-blue-600'],
  ['palet ring-', '<input className="focus:ring-indigo-500" />', 'ring-indigo-500'],
  ['palet from-', '<div className="from-teal-400" />', 'from-teal-400'],
  ['palet to-', '<div className="to-violet-500" />', 'to-violet-500'],
  ['palet via-', '<div className="via-orange-300" />', 'via-orange-300'],
  ['palet fill-', '<svg className="fill-rose-500" />', 'fill-rose-500'],
  ['palet stroke-', '<svg className="stroke-zinc-300" />', 'stroke-zinc-300'],
  ['palet border- netral', '<div className="hover:border-slate-200" />', 'border-slate-200'],
  ['varian dark:', '<div className="dark:bg-surface" />', 'dark:'],
  ['literal rgb', "const c = 'rgb(15, 82, 56)';", 'rgb('],
  ['literal rgba', "const c = 'rgba(0,0,0,.5)';", 'rgba('],
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

test('pola baru tidak mengenai token, rgb(var(--c-...)), atau kata biasa', () => {
  const sah = [
    '<p className="bg-primary text-text-2 border-border" />',
    "const w = 'rgb(var(--c-primary) / 0.5)';",
    '<div data-mode="dark" className="bg-surface" />',
    '<p>Mode dark aktif</p>',
    '<p className="from-primary to-info-fg" />',
  ];
  for (const sumber of sah) assert.deepEqual(findLegacy('x.jsx', sumber), [], sumber);
});

test('semua halaman bebas dari gaya lama', async () => {
  assert.ok(MIGRATED.length >= 60, 'pemindaian menemukan berkas JSX');
  assert.ok(!MIGRATED.some((path) => path.startsWith('src/pilot/')), 'pilot dikecualikan');
  for (const path of EKSTRA) assert.ok(MIGRATED.includes(path), `${path} ikut dipindai`);
  assert.ok(EKSTRA.some((path) => path.endsWith('.css')) && EKSTRA.some((path) => path.endsWith('.js')));
  const pelanggaran = [];
  for (const path of MIGRATED) {
    const sumber = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    pelanggaran.push(...findLegacy(path, sumber));
  }
  assert.deepEqual(pelanggaran, [], `Gaya lama masih ada:\n${pelanggaran.join('\n')}`);
});
