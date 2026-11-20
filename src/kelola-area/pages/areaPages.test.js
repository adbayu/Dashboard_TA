import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

async function muat(t) {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  return vite;
}

const baca = nama => readFile(new URL(`./${nama}`, import.meta.url), 'utf8');
const jumlahH1 = markup => (markup.match(/<h1[\s>]/g) || []).length;

async function render(vite, rute, halaman, nama) {
  const { SmartProvider } = await vite.ssrLoadModule('/src/shared/store/SmartStore.jsx');
  const modul = await vite.ssrLoadModule(`/src/kelola-area/pages/${nama}.jsx`);
  return renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: [rute] },
    React.createElement(
      SmartProvider,
      null,
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: halaman, element: React.createElement(modul.default) }),
      ),
    ),
  ));
}

test('Area & kolam: satu h1 dari PageHeader, tanpa tombol tambah area', async t => {
  const vite = await muat(t);
  const markup = await render(vite, '/area', '/area', 'KelolaArea');
  assert.equal(jumlahH1(markup), 1);
  assert.match(markup, /data-ui="page-header"[\s\S]*?<h1[^>]*>Area &amp; kolam<\/h1>/);
  assert.doesNotMatch(markup, /Tambah area/);
  const sumber = await baca('KelolaArea.jsx');
  assert.doesNotMatch(sumber, /Tambah area/);
  assert.doesNotMatch(sumber, /<h1[\s>]/);
  assert.doesNotMatch(sumber, /StatCard/);
});

test('Detail area: tanpa akses dan area tidak ada tetap satu h1 dengan tautan kembali', async t => {
  const vite = await muat(t);
  const markup = await render(vite, '/area/tidak-ada', '/area/:id', 'AreaDetail');
  assert.equal(jumlahH1(markup), 1);
  assert.match(markup, /href="\/area"/);
  assert.match(markup, /Kembali ke Area &amp; kolam/);
});

test('Detail area penuh: satu h1 nama area, kartu bertinta area, bagian misi, panen, dan riwayat', async t => {
  const vite = await muat(t);
  // Rute /admin/... membuat peran pengelola sehingga seluruh area dapat dibuka.
  const kolam = await render(vite, '/admin/area/AR-01', '/admin/area/:id', 'AreaDetail');
  assert.equal(jumlahH1(kolam), 1);
  assert.match(kolam, /data-ui="page-header"[\s\S]*?<h1[^>]*>Kolam Nila A<\/h1>/);
  assert.match(kolam, /data-ui="card"[^>]*data-area="water"/);
  assert.match(kolam, /data-ui="area-section"[^>]*data-area="water"/);
  assert.match(kolam, /id="form-pemantauan"/);
  for (const teks of ['Pembersihan area kolam ikan', 'Catat hasil panen', 'Catatan pemantauan area', 'Item biaya [(]HPP[)]', 'Catat jumlah ikan mati hari ini', 'Alat IoT di area ini']) {
    assert.match(kolam, new RegExp(teks), teks);
  }
  assert.doesNotMatch(kolam, /material-symbols|glass-card|uppercase tracking-widest/);

  // Growbed tidak memuat bagian khusus kolam dan memakai tinta daun.
  const { SEED_AREAS } = await vite.ssrLoadModule('/src/kelola-area/data/seed.js');
  const growbed = SEED_AREAS.find(a => a.type === 'growbed');
  const html = await render(vite, `/admin/area/${growbed.id}`, '/admin/area/:id', 'AreaDetail');
  assert.equal(jumlahH1(html), 1);
  assert.match(html, /data-ui="card"[^>]*data-area="leaf"|data-ui="area-section"[^>]*data-area="leaf"/);
  assert.doesNotMatch(html, /Pembersihan area kolam ikan|Catat jumlah ikan mati hari ini/);
});

test('Detail area: misi bulanan, panen, dan riwayat tetap ada, tanpa eyebrow atau StatCard pembuka', async () => {
  const sumber = await baca('AreaDetail.jsx');
  assert.doesNotMatch(sumber, /<h1[\s>]/);
  assert.match(sumber, /<PageHeader/);
  for (const teks of ['Quest bulanan', 'Pembersihan area kolam ikan', 'Catat hasil panen', 'Catatan pemantauan area', 'Catat pembersihan kolam']) {
    assert.ok(sumber.includes(teks), teks);
  }
  assert.match(sumber, /id="form-pemantauan"/);
  assert.doesNotMatch(sumber, /<StatCard/);
  assert.match(sumber, /<Card[^>]*area=\{tone\}/);
});

test('Kelola area pengelola: satu h1, tombol Tambah area, tanpa StatCard', async t => {
  const vite = await muat(t);
  const markup = await render(vite, '/admin/area', '/admin/area', 'AdminAreas');
  assert.equal(jumlahH1(markup), 1);
  assert.match(markup, /data-ui="page-header"[\s\S]*?<h1[^>]*>Kelola area<\/h1>/);
  assert.match(markup, /Tambah area/);
  const sumber = await baca('AdminAreas.jsx');
  assert.doesNotMatch(sumber, /<h1[\s>]/);
  assert.doesNotMatch(sumber, /<StatCard/);
  assert.match(sumber, /minimum`/);
  assert.match(sumber, /maksimum`/);
});

test('warna area pada TaskList mengalahkan warna garis bawaan', async () => {
  const css = await readFile(new URL('../../app/styles/theme-surfaces.css', import.meta.url), 'utf8');
  const aturan = css.match(/([^{}]*)\{[^{}]*var\(--area-line[^{}]*\}/g)
    .filter(blok => blok.includes('task'));
  assert.ok(aturan.length, 'aturan garis TaskList ada');
  // Kelas utilitas Tailwind `border-border` (satu kelas) tidak boleh menang:
  // pemilih harus lebih spesifik daripada satu kelas.
  assert.match(aturan[0], /\[data-ui="task-list"\]\s*>\s*\[data-ui="task"\]|\[data-ui="task-list"\]\s+\[data-ui="task"\]/);
});
