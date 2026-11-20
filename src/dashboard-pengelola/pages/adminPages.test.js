import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { namaIkonTidakDikenal } from '../../../tests/helpers/ikon.mjs';

// Task 13: halaman pengelola dan developer.
const FILES = {
  AdminDashboard: 'src/dashboard-pengelola/pages/AdminDashboard.jsx',
  AdminUsers: 'src/kelola-user/pages/AdminUsers.jsx',
  AdminIotPage: 'src/kelola-area/pages/admin/AdminIotPage.jsx',
  AdminCategories: 'src/kategori-device/pages/AdminCategories.jsx',
  AdminDetailInformation: 'src/detail-information/pages/AdminDetailInformation.jsx',
  AdminVPet: 'src/kelola-virtual-pet/pages/AdminVPet.jsx',
  AdminPoints: 'src/sistem-point/pages/AdminPoints.jsx',
  Developer: 'src/kelola-area/pages/Developer.jsx',
  SandboxPanel: 'src/components/iot/SandboxPanel.jsx',
};
const baca = nama => readFile(new URL(`../../../${FILES[nama]}`, import.meta.url), 'utf8');
const jumlahH1 = markup => (markup.match(/<h1[\s>]/g) || []).length;

async function muat(t, define = {}) {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  return vite;
}

async function render(vite, nama, rute) {
  const { SmartProvider } = await vite.ssrLoadModule('/src/shared/store/SmartStore.jsx');
  const { default: Halaman } = await vite.ssrLoadModule(`/${FILES[nama]}`);
  return renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: [rute] },
    React.createElement(SmartProvider, null, React.createElement(Halaman)),
  ));
}

test('Dashboard pengelola: daftar "Perlu ditangani" sebelum menu pengelolaan, tanpa ubin ikon', async t => {
  const vite = await muat(t);
  const markup = await render(vite, 'AdminDashboard', '/admin');
  assert.equal(jumlahH1(markup), 1, 'tepat satu h1');
  assert.match(markup, /data-ui="page-header"[\s\S]*?<h1[^>]*>Perlu ditangani hari ini<\/h1>/);

  const daftar = markup.indexOf('aria-labelledby="tindakan-judul"');
  const menu = markup.indexOf('aria-labelledby="menu-judul"');
  assert.ok(daftar > -1, 'bagian daftar tindakan ada');
  assert.ok(menu > -1, 'bagian menu pengelolaan ada');
  assert.ok(daftar < menu, 'daftar tindakan dirender sebelum menu pengelolaan');

  // Menu pengelolaan = daftar tautan teks + keterangan, tanpa ubin ikon.
  const bagianMenu = markup.slice(menu, markup.indexOf('</section>', menu));
  for (const href of ['/admin/pengguna', '/admin/iot', '/admin/detail-informasi', '/admin/kategori', '/admin/area', '/admin/v-pet', '/admin/point']) {
    assert.match(bagianMenu, new RegExp(`href="${href}"`), href);
  }
  assert.doesNotMatch(bagianMenu, /<svg/, 'menu tanpa ikon');
  assert.doesNotMatch(markup, /data-ui="metric"/, 'tanpa baris StatCard pembuka');

  const sumber = await baca('AdminDashboard');
  assert.doesNotMatch(sumber, /StatCard|glass-card|material-symbols|bg-gradient/);
});

const MODEL_TINDAKAN = '/src/dashboard-pengelola/model/daftarTindakan.js';

test('Dashboard pengelola: alat bermasalah dan alat belum ditempatkan muncul sebagai tindakan', async t => {
  const vite = await muat(t);
  const { daftarTindakan } = await vite.ssrLoadModule(MODEL_TINDAKAN);
  const tindakan = daftarTindakan({
    devices: [
      { id: 'd1', code: 'AQ-1', name: 'Sensor pH', status: 'offline', areaId: 'A1', battery: 30 },
      { id: 'd2', code: 'AQ-2', name: 'Sensor suhu', status: 'online', areaId: null },
    ],
    areas: [{ id: 'A1', name: 'Kolam A' }],
    users: [{ id: 'u1', name: 'Dewi', email: 'dewi@x.id', status: 'menunggu', joinedAt: '2026-11-16' }],
    kematianHariIni: [{ id: 'k1', areaId: 'A1', jumlah: 3, catatan: '' }],
  });
  const masalah = tindakan.map(item => item.masalah);
  assert.deepEqual(masalah, ['Tidak terhubung', 'Ikan mati', 'Belum ditempatkan', 'Menunggu persetujuan']);
  for (const item of tindakan) {
    assert.ok(item.icon, `${item.masalah}: status selalu dengan ikon`);
    // Tindakan alat, area, dan akun menuju halaman pengelola. Hanya bacaan di
    // luar batas yang menuju /monitoring (diuji terpisah di bawah).
    assert.ok(item.to.startsWith('/admin'), `${item.masalah}: tindakan menuju halaman pengelola`);
  }
});

test('daftarTindakan: bacaan di luar batas memakai presisi sensor dan menuju /monitoring', async t => {
  const vite = await muat(t);
  const { daftarTindakan } = await vite.ssrLoadModule(MODEL_TINDAKAN);
  const tindakan = daftarTindakan({
    luarBatas: [
      { device: { id: 'd1', code: 'AQ-1' }, area: { id: 'A1', name: 'Kolam A' }, key: 'ph', value: 7.8, ambang: [6.2, 7.6], posisi: 'atas' },
      { device: { id: 'd2', code: 'AQ-2' }, area: null, key: 'temp', value: 22, ambang: [24, 30], posisi: 'bawah' },
      { device: { id: 'd3', code: 'AQ-3' }, area: { id: 'A1', name: 'Kolam A' }, key: 'tds', value: 950, ambang: [400, 900], posisi: 'atas' },
    ],
  });
  assert.equal(tindakan.length, 3);
  const [ph, suhu, tds] = tindakan;
  for (const item of tindakan) {
    assert.equal(item.masalah, 'Di luar batas');
    assert.equal(item.to, '/monitoring');
    assert.equal(item.aksi, 'Lihat monitoring');
    assert.ok(item.icon, 'status selalu dengan ikon');
  }
  // pH 2 desimal, suhu 1 desimal, TDS bulat: sama dengan SensorReading.
  assert.equal(ph.judul, 'pH Air Kolam A 7,80 pH');
  assert.equal(ph.rincian, 'Batas area 6,20–7,60 pH, nilai di atas batas.');
  assert.equal(suhu.judul, 'Suhu Air AQ-2 22,0 °C');
  assert.equal(suhu.rincian, 'Batas area 24,0–30,0 °C, nilai di bawah batas.');
  assert.equal(tds.judul, 'TDS Nutrisi Kolam A 950 ppm');
  assert.equal(tds.rincian, 'Batas area 400–900 ppm, nilai di atas batas.');
});

test('daftarTindakan: status alat selain online dianggap masalah, dengan urutan yang jelas', async t => {
  const vite = await muat(t);
  const { daftarTindakan } = await vite.ssrLoadModule(MODEL_TINDAKAN);
  const tindakan = daftarTindakan({
    devices: [
      { id: 'a', code: 'A', name: 'Alat A', status: 'maintenance', areaId: 'A1' },
      { id: 'b', code: 'B', name: 'Alat B', status: 'stale', areaId: 'A1' },
      { id: 'c', code: 'C', name: 'Alat C', status: 'online', areaId: 'A1' },
      { id: 'd', code: 'D', name: 'Alat D', status: 'warning', areaId: 'A1' },
      { id: 'e', code: 'E', name: 'Alat E', status: 'offline', areaId: 'A1' },
    ],
    areas: [{ id: 'A1', name: 'Kolam A' }],
  });
  assert.deepEqual(tindakan.map(item => item.kode), ['E', 'D', 'A', 'B'], 'online tidak muncul; status tak dikenal paling akhir');
  const takDikenal = tindakan.find(item => item.kode === 'B');
  assert.equal(takDikenal.masalah, 'stale');
  assert.ok(takDikenal.icon && takDikenal.tone === 'warn');
});

test('halaman pengelola dan developer: tepat satu h1 lewat PageHeader', async t => {
  const vite = await muat(t);
  for (const [nama, rute] of [
    ['AdminUsers', '/admin/pengguna'],
    ['AdminIotPage', '/admin/iot'],
    ['AdminCategories', '/admin/kategori'],
    ['AdminDetailInformation', '/admin/detail-informasi'],
    ['AdminVPet', '/admin/v-pet'],
    ['AdminPoints', '/admin/point'],
    ['Developer', '/developer'],
  ]) {
    const markup = await render(vite, nama, rute);
    assert.equal(jumlahH1(markup), 1, `${nama}: tepat satu h1`);
    assert.match(markup, /data-ui="page-header"/, `${nama}: memakai PageHeader`);
    assert.doesNotMatch(markup, /data-ui="metric"/, `${nama}: tanpa baris StatCard pembuka`);
    assert.doesNotMatch(await baca(nama), /<h1[\s>]|StatCard/, `${nama}: tanpa h1 sendiri dan tanpa StatCard`);
  }
});

test('Developer mode API: satu h1 dan tautan referensi API tetap ada', async t => {
  const vite = await muat(t, { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') });
  const markup = await render(vite, 'Developer', '/developer');
  assert.equal(jumlahH1(markup), 1);
  assert.match(markup, /<a[^>]*href="\/docs\/openapi\.json"[^>]*target="_blank"[^>]*>Referensi API<\/a>/);
});

test('chip di halaman admin memakai FilterChip (aria-pressed), bukan tombol buatan tangan', async t => {
  const [users, iot, kategori, poin, detail] = await Promise.all(
    ['AdminUsers', 'AdminIotPage', 'AdminCategories', 'AdminPoints', 'AdminDetailInformation'].map(baca),
  );
  // Pilihan dan filter yang berupa keping memakai FilterChip.
  assert.match(users, /aria-label="Filter peran"[\s\S]*?<FilterChip/);
  assert.match(users, /aria-label="Filter status"[\s\S]*?<FilterChip/);
  assert.match(users, /aria-label="Area yang dikelola"[\s\S]*?<FilterChip/);
  assert.match(kategori, /aria-label="Pilihan ikon"[\s\S]*?<FilterChip/);
  assert.match(kategori, /aria-label="Warna penanda"[\s\S]*?<FilterChip/);
  assert.match(detail, /aria-label="Filter kategori"[\s\S]*?<FilterChip/);
  // Pemilih bagian Kelola IoT = Tabs bersama (kanvas), saklar aturan poin = Switch.
  assert.match(iot, /<Tabs\b[\s\S]*?label="Bagian Kelola IoT"/);
  assert.match(poin, /<Switch\b/);
  for (const [nama, sumber] of [['AdminUsers', users], ['AdminIotPage', iot], ['AdminCategories', kategori], ['AdminPoints', poin], ['AdminDetailInformation', detail]]) {
    assert.doesNotMatch(sumber, /aria-pressed=/, `${nama}: aria-pressed hanya lewat komponen bersama`);
    assert.doesNotMatch(sumber, /rounded-full/, `${nama}: tanpa keping buatan tangan`);
  }

  const vite = await muat(t);
  const markupUsers = await render(vite, 'AdminUsers', '/admin/pengguna');
  const grupPeran = markupUsers.slice(markupUsers.indexOf('aria-label="Filter peran"'));
  assert.match(grupPeran, /<button[^>]*aria-pressed="true"[^>]*data-ui="chip"/);
  const markupDetail = await render(vite, 'AdminDetailInformation', '/admin/detail-informasi');
  assert.match(markupDetail.slice(markupDetail.indexOf('aria-label="Filter kategori"')), /<button[^>]*aria-pressed="true"[^>]*data-ui="chip"[^>]*>[\s\S]*?Semua kategori/);
});

test('warna kategori dari data menjadi nada area, bukan hex', async t => {
  const vite = await muat(t);
  const { nadaKategori } = await vite.ssrLoadModule('/src/kategori-device/model/nadaKategori.js');
  assert.equal(nadaKategori({ area: 'leaf', color: '#0369a1' }), 'leaf');
  assert.equal(nadaKategori({ color: '#0369a1' }), 'water');
  assert.equal(nadaKategori({ color: '#0f5238' }), 'leaf');
  assert.equal(nadaKategori({ color: '#b45309' }), 'neutral');
  assert.equal(nadaKategori({ color: 'bukan-warna' }), 'neutral');
  assert.equal(nadaKategori(null), 'neutral');

  const markup = await render(vite, 'AdminCategories', '/admin/kategori');
  assert.match(markup, /data-ui="card"[^>]*data-area="water"/);
  assert.doesNotMatch(markup, /style="[^"]*background/);
  assert.doesNotMatch(await baca('AdminCategories'), /type="color"|style=\{\{\s*background/);
});

test('avatar di Kelola pengguna memakai token, bukan warna hex dari seed', async t => {
  const vite = await muat(t);
  const markup = await render(vite, 'AdminUsers', '/admin/pengguna');
  assert.match(markup, /data-ui="avatar"/);
  assert.doesNotMatch(markup, /data-ui="avatar"[^>]*style="[^"]*background-color/);
});

test('halaman pengelola dan developer hanya memakai nama ikon lucide', async t => {
  const vite = await muat(t);
  const { ICON_MAP } = await vite.ssrLoadModule('/src/shared/components/Icon.jsx');
  for (const nama of Object.keys(FILES)) {
    const source = await baca(nama);
    assert.deepEqual(namaIkonTidakDikenal(source, ICON_MAP), [], `${nama} memakai nama ikon lama atau tidak dikenal`);
  }
});

test('AdminPoints: tiap saklar aturan bernama aksesibel dengan nama aturannya', async t => {
  const vite = await muat(t);
  const markup = await render(vite, 'AdminPoints', '/admin/point');
  const saklar = [...markup.matchAll(/<button[^>]*role="switch"[^>]*>/g)].map(cocok => cocok[0]);
  assert.ok(saklar.length >= 7, 'satu saklar per aturan seed');
  for (const tag of saklar) assert.match(tag, /aria-label="Aktifkan aturan [^"]+"/);
  assert.match(markup, /aria-label="Aktifkan aturan Isi data HPP area"/);
  assert.equal(new Set(saklar).size, saklar.length, 'nama tiap saklar unik');
});
