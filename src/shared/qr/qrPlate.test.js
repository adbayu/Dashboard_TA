import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';

// QR alat harus tetap bisa dipindai di kelima tema, terang maupun gelap:
// modul gelap di atas zona tenang terang, tidak pernah mengikuti warna tema.

const luma = (data, offset) => 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];

test('gambar QR alat memakai modul gelap di atas zona tenang terang dan terbaca decoder aplikasi', async () => {
  const { opsiGambarQr } = await import('./opsiQr.js');
  const { decodeQrFrame } = await import('../../detail-information/model/qrScanner.js');
  const value = 'https://jagofarm.example/iot/IOT-001';
  const url = await QRCode.toDataURL(value, opsiGambarQr(128));
  const png = PNG.sync.read(Buffer.from(url.split(',')[1], 'base64'));

  const pixels = Array.from({ length: png.width * png.height }, (_, index) => luma(png.data, index * 4));
  assert.ok(luma(png.data, 0) >= 250, 'sudut kiri atas (zona tenang) putih');
  assert.ok(Math.min(...pixels) <= 5, 'modul gelap hitam');
  assert.equal(new Set(pixels.map(value => (value > 128 ? 'terang' : 'gelap'))).size, 2);
  assert.equal(decodeQrFrame({ data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }), value);
});

function tanpaMedia(css) {
  let hasil = '';
  let i = 0;
  while (i < css.length) {
    const media = css.indexOf('@media', i);
    if (media === -1) return hasil + css.slice(i);
    hasil += css.slice(i, media);
    let kedalaman = 0;
    let j = css.indexOf('{', media);
    for (; j < css.length; j += 1) {
      if (css[j] === '{') kedalaman += 1;
      if (css[j] === '}' && --kedalaman === 0) break;
    }
    i = j + 1;
  }
  return hasil;
}

function blokMediaPrint(css) {
  const awal = css.indexOf('@media print');
  assert.ok(awal >= 0, 'ada @media print');
  let kedalaman = 0;
  for (let j = css.indexOf('{', awal); j < css.length; j += 1) {
    if (css[j] === '{') kedalaman += 1;
    if (css[j] === '}' && --kedalaman === 0) return css.slice(awal, j + 1);
  }
  return css.slice(awal);
}

test('QR tampil di pelat terang tetap; warna cetak ada di @media print, bukan di JSX', async () => {
  const [qrCode, aksiQr, css] = await Promise.all([
    readFile(new URL('./components/QrCode.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./components/AksiQr.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/styles/index.css', import.meta.url), 'utf8'),
  ]);

  for (const [nama, sumber] of [['QrCode', qrCode], ['AksiQr', aksiQr]]) {
    assert.match(sumber, /opsiGambarQr\(/, `${nama} memakai opsi QR bersama`);
    assert.doesNotMatch(sumber, /\bcolor:\s*\{/, `${nama} tidak menimpa warna modul QR`);
  }
  assert.match(qrCode, /className="[^"]*\bqr-plate\b/);

  const tanpaKomentar = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const layar = tanpaMedia(tanpaKomentar);
  const pelat = layar.match(/\.qr-plate\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(pelat, /background(?:-color)?:\s*(?:white|var\(--qr-terang\))/, 'pelat QR terang di layar');
  assert.doesNotMatch(pelat, /--c-/, 'pelat QR tidak ikut token tema');
  assert.match(layar, /--qr-terang:\s*white/);
  assert.match(blokMediaPrint(tanpaKomentar), /\.qr-plate[\s\S]*?background(?:-color)?:\s*white/, 'warna cetak di @media print');
});
