import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { migrasiIkonDaftar, namaIkonBaru } from './migrasiIkon.js';
import { SEED_BADGES } from '../../gamifikasi/data/seed.js';
import { SEED_CATEGORIES } from '../../kategori-device/data/categories.js';

test('namaIkonBaru memindahkan nama Material lama dan membiarkan nama lain', () => {
  assert.equal(namaIkonBaru('water_ec'), 'droplet');
  assert.equal(namaIkonBaru('potted_plant'), 'sprout');
  assert.equal(namaIkonBaru('emoji_events'), 'trophy');
  assert.equal(namaIkonBaru('settings_input_component'), 'cable');
  assert.equal(namaIkonBaru('radio'), 'radio');
  assert.equal(namaIkonBaru('tidak-ada'), 'tidak-ada');
  assert.equal(namaIkonBaru(undefined), undefined);
  assert.equal(namaIkonBaru('constructor'), 'constructor', 'bukan properti prototipe');
});

test('migrasiIkonDaftar memetakan field icon pada kategori dan badge tersimpan', () => {
  const lama = [
    { id: 'B-1', name: 'Peternak Tekun', icon: 'potted_plant', minPoints: 200 },
    { id: 'B-9', name: 'Baru', icon: 'trophy' },
    { id: 'B-8', name: 'Tanpa ikon' },
    null,
  ];
  const baru = migrasiIkonDaftar(lama);
  assert.equal(baru[0].icon, 'sprout');
  assert.equal(baru[0].name, 'Peternak Tekun');
  assert.equal(baru[1], lama[1], 'item yang sudah lucide tidak disalin');
  assert.equal(baru[2], lama[2]);
  assert.equal(baru[3], null);
  assert.equal(lama[0].icon, 'potted_plant', 'daftar asli tidak diubah');
  assert.equal(migrasiIkonDaftar(undefined), undefined);
});

test('seed kategori dan badge tidak lagi memakai nama Material', () => {
  // Icon.jsx berisi JSX; kecocokan dengan ICON_MAP diperiksa pemindai di
  // tests/design/icon-map.test.mjs. Di sini cukup menjaga seed bebas snake_case.
  const nama = [...SEED_BADGES, ...SEED_CATEGORIES].map((item) => item.icon);
  assert.ok(nama.length >= 5);
  for (const ikon of nama) assert.doesNotMatch(ikon, /_/, `${ikon} masih bernama Material`);
});

// R21: pengguna lama yang menyimpan nama Material di localStorage tidak boleh
// mendapat ikon kosong. SmartProvider memuat state tersimpan lewat migrateState.
test('SmartProvider memindahkan nama ikon lama pada kategori dan badge tersimpan', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  const { SmartProvider, useSmart } = await vite.ssrLoadModule('/src/shared/store/SmartStore.jsx');

  const tersimpan = {
    categories: [{ id: 'CAT-AIR', name: 'Sensor Kualitas Air', icon: 'water_ec', metrics: [] }],
    badges: [{ id: 'B-1', name: 'Peternak Tekun', icon: 'potted_plant', minPoints: 200, desc: 'Kumpulkan 200 point' }, { id: 'B-9', name: 'Kustom', icon: 'ikon-ketik-sendiri', minPoints: 1 }],
  };
  const asli = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(tersimpan), setItem: () => {}, removeItem: () => {} },
  });
  t.after(() => {
    if (asli) Object.defineProperty(globalThis, 'localStorage', asli);
    else delete globalThis.localStorage;
  });

  function Pembaca() {
    const { categories, badges } = useSmart();
    return React.createElement('pre', null, JSON.stringify({ kategori: categories.map(c => c.icon), badge: badges.map(b => b.icon), desc: badges.map(b => b.desc) }));
  }
  const markup = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    null,
    React.createElement(SmartProvider, null, React.createElement(Pembaca)),
  ));
  const hasil = JSON.parse(markup.replace(/<\/?pre>/g, '').replaceAll('&quot;', '"'));
  assert.deepEqual(hasil.kategori, ['droplet']);
  assert.deepEqual(hasil.badge, ['sprout', 'ikon-ketik-sendiri'], 'nama yang tak dikenal dibiarkan; Icon menampilkan ikon cadangan');
  assert.equal(hasil.desc[0], 'Kumpulkan 200 poin', 'teks badge lama dengan "point" dibetulkan');
});
