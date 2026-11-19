import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

// Pemilih tema, mode, sidebar, dan top bar dirender SSR lewat Vite, sama seperti
// ui.test.js. Interaksi keyboard diuji lewat pembantu roving yang dipakai
// komponen (tidak ada DOM di node --test).
let vite;
let picker;
let toggle;
let roving;
let info;
let sidebar;
let topbar;
let store;

before(async () => {
  vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  [picker, toggle, roving, info, sidebar, topbar, store] = await Promise.all([
    vite.ssrLoadModule('/src/shared/theme/ThemePicker.jsx'),
    vite.ssrLoadModule('/src/shared/theme/ModeToggle.jsx'),
    vite.ssrLoadModule('/src/shared/theme/rovingRadio.js'),
    vite.ssrLoadModule('/src/shared/theme/temaInfo.js'),
    vite.ssrLoadModule('/src/app/layout/SmartSidebar.jsx'),
    vite.ssrLoadModule('/src/app/layout/SmartTopBar.jsx'),
    vite.ssrLoadModule('/src/shared/store/SmartStore.jsx'),
  ]);
});

after(() => vite?.close());

const h = React.createElement;
const noop = () => {};
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const radios = markup => [...markup.matchAll(/<button\b[^>]*role="radio"[^>]*>[\s\S]*?<\/button>/g)].map(m => m[0]);
const textOf = html => html.replace(/<[^>]+>/g, '').trim();
const nameOf = radio => radio.match(/^<button\b[^>]*aria-label="([^"]*)"/)?.[1];

const withShell = (child, path = '/') => renderToStaticMarkup(h(MemoryRouter, { initialEntries: [path] }, h(store.SmartProvider, null, child)));

test('ThemePicker: radiogroup berlabel dengan 5 radio, hanya Lumina yang tercentang', () => {
  const markup = renderToStaticMarkup(h(picker.ThemePicker, { value: 'lumina', onChange: noop }));
  assert.match(markup, /role="radiogroup"[^>]*aria-label="Tema tampilan"|aria-label="Tema tampilan"[^>]*role="radiogroup"/);
  const items = radios(markup);
  assert.equal(items.length, 5);
  const checked = items.filter(item => /aria-checked="true"/.test(item));
  assert.equal(checked.length, 1);
  assert.equal(nameOf(checked[0]), 'Lumina');
  assert.equal(items.filter(item => /aria-checked="false"/.test(item)).length, 4);
});

test('ThemePicker: roving tabIndex, hanya radio tercentang yang bisa di-Tab', () => {
  const items = radios(renderToStaticMarkup(h(picker.ThemePicker, { value: 'panel-instrumen', onChange: noop })));
  for (const item of items) {
    const on = /aria-checked="true"/.test(item);
    assert.match(item, on ? /tabindex="0"/ : /tabindex="-1"/);
  }
});

test('ThemePicker: nama dan deskripsi satu baris dari spec §5', () => {
  const markup = renderToStaticMarkup(h(picker.ThemePicker, { value: 'kebun-air', onChange: noop }));
  assert.deepEqual(radios(markup).map(nameOf), ['Kebun Air', 'Catatan Lapangan', 'Panel Instrumen', 'Tanah &amp; Lumut', 'Lumina']);
  // Deskripsi tampil dan terhubung lewat aria-describedby.
  for (const radio of radios(markup)) {
    const id = radio.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(id && radio.includes(`id="${id}"`), 'deskripsi terhubung');
  }
  assert.match(markup, /Krem tanah, hijau lumut, biru air\./);
  assert.match(markup, /Gradien, kaca, glow\./);
});

test('ThemePicker: tiap kartu memuat pratinjau mini bertema lokal (Ruling R11)', () => {
  const markup = renderToStaticMarkup(h(picker.ThemePicker, { value: 'kebun-air', mode: 'dark', onChange: noop }));
  for (const id of ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina']) {
    const preview = markup.match(new RegExp(`<span[^>]*data-pratinjau=""[^>]*data-theme="${id}"[^>]*>`))?.[0];
    assert.ok(preview, `pratinjau ${id}`);
    assert.match(preview, /data-mode="dark"/);
    // Warna dan latar pratinjau dari token tema itu sendiri, bukan warisan halaman.
    assert.match(preview, /\bbg-bg\b/);
    assert.match(preview, /\btext-text\b/);
    assert.match(preview, /aria-hidden="true"/);
  }
  assert.match(markup, /\bbg-primary\b/, 'swatch primary');
  assert.match(markup, /\bfont-head\b/, 'contoh teks dengan huruf judul tema');
  assert.doesNotMatch(markup, /#[0-9a-f]{3,8}\b|rgb\(/i);
});

test('roving radio: panah kanan dari lumina memanggil onChange("kebun-air")', () => {
  const ids = info.TEMA_INFO.map(t => t.id);
  const calls = [];
  let prevented = false;
  roving.handleRadioKeyDown(
    { key: 'ArrowRight', preventDefault: () => { prevented = true; } },
    { ids, value: 'lumina', onChange: id => calls.push(id) },
  );
  assert.deepEqual(calls, ['kebun-air']);
  assert.ok(prevented);
});

test('roving radio: panah, Home, End, dan tombol lain', () => {
  const ids = info.TEMA_INFO.map(t => t.id);
  assert.equal(roving.nextRadioId(ids, 'kebun-air', 'ArrowDown'), 'catatan-lapangan');
  assert.equal(roving.nextRadioId(ids, 'kebun-air', 'ArrowLeft'), 'lumina');
  assert.equal(roving.nextRadioId(ids, 'catatan-lapangan', 'ArrowUp'), 'kebun-air');
  assert.equal(roving.nextRadioId(ids, 'tanah-lumut', 'Home'), 'kebun-air');
  assert.equal(roving.nextRadioId(ids, 'kebun-air', 'End'), 'lumina');
  assert.equal(roving.nextRadioId(ids, 'kebun-air', 'Enter'), null);
  const calls = [];
  roving.handleRadioKeyDown({ key: 'Tab', preventDefault: () => assert.fail('Tab tidak boleh dicegah') }, { ids, value: 'lumina', onChange: id => calls.push(id) });
  assert.deepEqual(calls, []);
});

test('ModeToggle: tiga pilihan berlabel persis Terang, Gelap, Ikuti sistem', () => {
  const markup = renderToStaticMarkup(h(toggle.ModeToggle, { value: 'sistem', onChange: noop }));
  assert.match(markup, /role="radiogroup"/);
  const items = radios(markup);
  assert.deepEqual(items.map(textOf), ['Terang', 'Gelap', 'Ikuti sistem']);
  assert.deepEqual(items.map(item => /aria-checked="true"/.test(item)), [false, false, true]);
  assert.deepEqual(items.map(item => item.match(/tabindex="(-?\d)"/)?.[1]), ['-1', '-1', '0']);
});

test('teks status Aktif sekarang memakai nama tema dan mode terhitung', () => {
  assert.equal(info.teksAktif('lumina', 'dark'), 'Aktif sekarang: Lumina, mode gelap');
  assert.equal(info.teksAktif('tanah-lumut', 'light'), 'Aktif sekarang: Tanah & Lumut, mode terang');
  assert.equal(info.namaTema('tidak-ada'), 'Kebun Air');
});

const OLD_HINTS = [
  'Ringkasan kolam & sensor aktif',
  'Semua perangkat terpasang',
  'Nilai sensor, area & kejadian',
  'Pindai QR alat & baca penjelasannya',
  'Kondisi seluruh farm',
  'API key Test dan sandbox',
];

test('SmartSidebar tidak merender deskripsi (hint) menu', () => {
  for (const role of ['pengguna', 'pengelola', 'mitra']) {
    const markup = withShell(h(sidebar.default, { role }));
    for (const hint of OLD_HINTS) assert.ok(!markup.includes(hint.replace('&', '&amp;')), `${role}: ${hint}`);
    for (const section of sidebar.MENUS[role]) {
      for (const item of section.items) {
        if (item.hint) assert.ok(!markup.includes(item.hint), `${role}: ${item.hint}`);
      }
    }
    assert.match(markup, /data-ui="sidebar"/);
  }
});

test('SmartSidebar memakai grup dan label kanvas (Ruling R12) dengan token sidebar', () => {
  const groups = role => sidebar.MENUS[role].map(section => section.group);
  const labels = role => sidebar.MENUS[role].flatMap(section => section.items.map(item => item.label));
  assert.deepEqual(groups('pengguna'), ['Pemantauan', 'Operasional', 'Belajar & poin', 'Integrasi']);
  assert.deepEqual(labels('pengguna'), ['Pantauan', 'Alat IoT', 'Monitoring', 'Pindai QR', 'Area & kolam', 'V-Pet', 'Misi & poin', 'Chatbot akuaponik', 'Developer']);
  assert.deepEqual(groups('pengelola'), ['Ringkasan', 'Kelola data', 'Integrasi']);
  assert.deepEqual(labels('pengelola'), ['Dashboard pengelola', 'Monitoring', 'Pengguna', 'Alat IoT', 'Detail informasi', 'Kategori alat', 'Area', 'V-Pet', 'Sistem poin', 'Developer']);
  const source = read('../../app/layout/SmartSidebar.jsx');
  assert.doesNotMatch(source, /gradient|rgb\(|#[0-9a-f]{3,8}\b|material-symbols/i);
  assert.match(source, /bg-side-bg/);
  assert.match(source, /bg-side-active text-side-active-text font-semibold/);
  assert.match(source, /(?:ring|outline)-side-text/);
});

test('SmartTopBar tanpa eyebrow Mode; tombol tema cepat membuka dialog', () => {
  // Tanpa sesi, role ikut URL: /admin -> pengelola.
  for (const path of ['/', '/admin']) {
    const markup = withShell(h(topbar.default, { title: 'Pantauan', onMenuClick: noop }), path);
    assert.doesNotMatch(markup, /Mode Pengguna|Mode Pengelola|Mode Mitra/);
  }
  const markup = withShell(h(topbar.default, { title: 'Pantauan', onMenuClick: noop }));
  const button = markup.match(/<button\b[^>]*aria-haspopup="dialog"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(button, 'tombol tema cepat');
  assert.match(button, /aria-expanded="false"/);
  assert.match(textOf(button), /Kebun Air/);
  assert.doesNotMatch(markup, /uppercase/);
});

test('Profil: kartu Tampilan dan tombol Keluar varian danger', () => {
  const source = read('../../profil-saya/pages/Profil.jsx');
  assert.match(source, /<ThemePicker\b/);
  assert.match(source, /<ModeToggle\b/);
  assert.match(source, /teksAktif\(/);
  assert.match(source, /variant="danger"[^>]*onClick=\{keluar\}|onClick=\{keluar\}[^>]*variant="danger"/);
  assert.doesNotMatch(source, /tombol-keluar/);
  assert.doesNotMatch(read('../../app/styles/index.css'), /tombol-keluar/);
});
