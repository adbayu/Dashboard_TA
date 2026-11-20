import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
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

test('areaTone memetakan jenis area ke nada area', async t => {
  const vite = await muat(t);
  const { areaTone } = await vite.ssrLoadModule('/src/kelola-area/model/areaTone.js');
  assert.equal(areaTone('kolam'), 'water');
  assert.equal(areaTone('tandon'), 'water');
  assert.equal(areaTone('growbed'), 'leaf');
  assert.equal(areaTone('lainnya'), 'neutral');
  assert.equal(areaTone(undefined), 'neutral');
  assert.equal(areaTone(''), 'neutral');
});

test('kartu area pengguna merender data-area dari areaTone', async t => {
  const vite = await muat(t);
  const [{ KartuArea }, { areaTone }] = await Promise.all([
    vite.ssrLoadModule('/src/kelola-area/pages/KelolaArea.jsx'),
    vite.ssrLoadModule('/src/kelola-area/model/areaTone.js'),
  ]);
  const dasar = {
    id: 'a1', name: 'Kolam Nila', location: 'Blok Barat', commodity: 'Ikan Nila', population: 120,
    populationUnit: 'ekor', volume: 12000, unit: 'liter', hpp: [{ id: 'h1' }],
  };
  const ringkasan = { total: 669000, perUnit: 5575, jumlahAlat: 2, catatan: 1, panen: 0, mati: 0 };
  for (const type of ['kolam', 'tandon', 'growbed', 'aneh']) {
    const markup = renderToStaticMarkup(React.createElement(
      MemoryRouter,
      null,
      React.createElement(KartuArea, { area: { ...dasar, type }, ...ringkasan }),
    ));
    assert.match(markup, new RegExp(`data-ui="card"[^>]*data-area="${areaTone(type)}"|data-area="${areaTone(type)}"[^>]*data-ui="card"`), type);
    assert.match(markup, /href="\/area\/a1"/);
    assert.match(markup, /Kolam Nila/);
  }
});

test('ringkasStatusAlat selalu berupa teks + ikon dan formatAngka memakai koma desimal', async t => {
  const vite = await muat(t);
  const { ringkasStatusAlat, formatAngka } = await vite.ssrLoadModule('/src/kelola-area/model/areaTampil.js');
  assert.deepEqual(ringkasStatusAlat([]), [{ tone: 'muted', icon: 'circle-minus', text: 'Belum ada alat' }]);
  assert.deepEqual(ringkasStatusAlat([{ status: 'online' }, { status: 'online' }]), [{ tone: 'ok', icon: 'wifi', text: 'Semua alat terhubung' }]);
  const campur = ringkasStatusAlat([{ status: 'offline' }, { status: 'warning' }, { status: 'online' }]);
  assert.deepEqual(campur.map(s => s.text), ['1 alat tidak terhubung', '1 alat perlu perhatian']);
  assert.ok(campur.every(s => s.icon));
  assert.equal(formatAngka(6.5), '6,5');
  assert.equal(formatAngka(1020, 0), '1.020');
  assert.equal(formatAngka(null), '·');
  assert.equal(formatAngka(''), '·');
});
