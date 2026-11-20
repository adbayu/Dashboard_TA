import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
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
  return vite.ssrLoadModule('/src/shared/store/SmartStore.jsx');
}

test('nilaiMetrik: null, undefined, kosong, dan non-angka bukan 0', async t => {
  const { nilaiMetrik } = await muat(t);
  assert.equal(nilaiMetrik({ value: null }), null);
  assert.equal(nilaiMetrik({ value: undefined }), null);
  assert.equal(nilaiMetrik({ value: '' }), null);
  assert.equal(nilaiMetrik({ value: 'abc' }), null);
  assert.equal(nilaiMetrik({ value: Number.NaN }), null);
  assert.equal(nilaiMetrik(undefined), null);
  assert.equal(nilaiMetrik({}), null);
  assert.equal(nilaiMetrik({ value: 0 }), 0, 'nol yang sungguhan tetap nol');
  assert.equal(nilaiMetrik({ value: '6.8' }), 6.8);
  assert.equal(nilaiMetrik({ value: 780 }), 780);
});

test('ambangSah: dua angka terhingga dengan rendah < tinggi', async t => {
  const { ambangSah } = await muat(t);
  assert.equal(ambangSah([6.2, 7.6]), true);
  assert.equal(ambangSah([7.6, 6.2]), false, 'terbalik');
  assert.equal(ambangSah([7, 7]), false, 'sama');
  assert.equal(ambangSah([Number.NaN, 7]), false);
  assert.equal(ambangSah([6, null]), false);
  assert.equal(ambangSah(null), false);
  assert.equal(ambangSah(undefined), false);
  assert.equal(ambangSah([6]), false);
});

test('pembacaan tanpa nilai tidak dinilai terhadap ambang (bukan 0 di bawah batas)', async t => {
  const { nilaiMetrik, nilaiTerhadapAmbang, ambangSah } = await muat(t);
  const ambang = [6.2, 7.6];
  assert.equal(nilaiTerhadapAmbang(nilaiMetrik({ value: null }), ambang), null);
  assert.equal(nilaiTerhadapAmbang(nilaiMetrik({ value: '' }), ambang), null);
  assert.equal(nilaiTerhadapAmbang(Number(null), ambang), 'bawah', 'contoh bug lama: Number(null) = 0');
  assert.equal(ambangSah(ambang) ? nilaiTerhadapAmbang(5.9, ambang) : null, 'bawah');
});

test('teks "Keluar ambang" tidak lagi dipakai; bahasanya "Di luar batas"', async () => {
  const jalur = [];
  const telusuri = async dir => {
    for (const entri of await readdir(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (entri.isDirectory()) await telusuri(`${dir}${entri.name}/`);
      else if (/\.(jsx?)$/.test(entri.name) && !entri.name.endsWith('.test.js')) jalur.push(`${dir}${entri.name}`);
    }
  };
  await telusuri('../../');
  assert.ok(jalur.length > 50);
  for (const berkas of jalur) {
    const sumber = await readFile(new URL(berkas, import.meta.url), 'utf8');
    assert.doesNotMatch(sumber.replace(/\/\/.*$/gm, ''), /Keluar ambang/, `${berkas} memakai "Keluar ambang"`);
  }
});
