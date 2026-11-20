import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('DeviceClaimLoadingState announces that QR information is loading', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { DeviceClaimLoadingState } = await vite.ssrLoadModule('/src/kelola-area/pages/DeviceClaim.jsx');
  const markup = renderToStaticMarkup(React.createElement(DeviceClaimLoadingState));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Memuat informasi QR/);
});

test('ActivationRequiredState renders the empty manual activation-code form', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { ActivationRequiredState } = await vite.ssrLoadModule('/src/kelola-area/pages/DeviceClaim.jsx');
  const markup = renderToStaticMarkup(React.createElement(ActivationRequiredState, {
    manualActivationCode: '',
    viewError: '',
    onManualActivationCodeChange: () => {},
    onSubmit: () => {},
  }));

  assert.match(markup, /Masukkan kode aktivasi/);
  assert.match(markup, /<input\b(?=[^>]*\bid="manual-activation-code")(?=[^>]*\btype="password")(?=[^>]*\bvalue="")[^>]*>/);
  assert.match(markup, /Periksa kode/);
});

async function muatKlaim(t) {
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

const jumlahH1 = markup => (markup.match(/<h1[\s>]/g) || []).length;

test('DeviceClaim: judul langkah aktif menjadi satu-satunya h1 di tiap keadaan awal', async t => {
  const vite = await muatKlaim(t);
  const { default: DeviceClaim, ActivationRequiredState, DeviceClaimLoadingState } = await vite.ssrLoadModule('/src/kelola-area/pages/DeviceClaim.jsx');
  const { SmartProvider } = await vite.ssrLoadModule('/src/shared/store/SmartStore.jsx');
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');

  // Halaman utuh tanpa kode aktivasi: langkah "Masukkan kode aktivasi".
  const halaman = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: ['/d/AQ-PKT-001'] },
    React.createElement(SmartProvider, null, React.createElement(Routes, null, React.createElement(Route, { path: '/d/:code', element: React.createElement(DeviceClaim) }))),
  ));
  assert.equal(jumlahH1(halaman), 1, 'tepat satu h1');
  assert.match(halaman, /<h1[^>]*>Masukkan kode aktivasi<\/h1>/);

  const langkah = renderToStaticMarkup(React.createElement(ActivationRequiredState, { manualActivationCode: '', viewError: '', onManualActivationCodeChange() {}, onSubmit() {} }));
  assert.match(langkah, /<h1[^>]*>Masukkan kode aktivasi<\/h1>/);

  const memuat = renderToStaticMarkup(React.createElement(DeviceClaimLoadingState));
  assert.equal(jumlahH1(memuat), 1, 'keadaan memuat juga punya h1 (tersembunyi secara visual)');
  assert.match(memuat, /role="status"/);
});

test('DeviceClaim: langkah hasil memakai h1 hanya saat tidak ada kartu pratinjau (yang sudah memuat h1)', async t => {
  const { readFile } = await import('node:fs/promises');
  const sumber = await readFile(new URL('./DeviceClaim.jsx', import.meta.url), 'utf8');
  assert.match(sumber, /const judulStep = viewPreview \? 'p' : 'h1'/);
  assert.equal((sumber.match(/<Empty titleAs=\{judulStep\}/g) || []).length, 7, 'semua langkah hasil ikut aturan satu h1');
  assert.doesNotMatch(sumber, /<Empty title=/);
  const vite = await muatKlaim(t);
  const { EmptyState } = await vite.ssrLoadModule('/src/shared/components/ui/EmptyState.jsx');
  assert.match(renderToStaticMarkup(React.createElement(EmptyState, { title: 'Judul', titleAs: 'h1' })), /<h1[^>]*>Judul<\/h1>/);
  assert.match(renderToStaticMarkup(React.createElement(EmptyState, { title: 'Judul' })), /<p[^>]*>Judul<\/p>/);
});
