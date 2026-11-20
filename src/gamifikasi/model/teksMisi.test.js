import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SEED_BADGES, SEED_MISSIONS } from '../data/seed.js';
import { ejaanPoin, labelSasaranMisi } from './teksMisi.js';

test('labelSasaranMisi menerjemahkan id aksi ke bahasa Indonesia', () => {
  assert.equal(labelSasaranMisi('feed'), 'beri pakan');
  assert.equal(labelSasaranMisi('clean-or-heal'), 'bersihkan atau rawat');
  assert.equal(labelSasaranMisi('catat-minimal-2-parameter'), 'catat minimal 2 parameter');
  assert.equal(labelSasaranMisi(undefined), '');
});

test('sasaran semua misi seed tidak memuat kata Inggris mentah', () => {
  for (const misi of SEED_MISSIONS) {
    const label = labelSasaranMisi(misi.target);
    assert.ok(label.length > 0, misi.id);
    assert.ok(!/\b(feed|clean|heal|or|care)\b/.test(label), `${misi.id}: "${label}" masih Inggris`);
  }
});

test('ejaanPoin mengganti "point" menjadi "poin" dan membiarkan teks lain', () => {
  assert.equal(ejaanPoin('Kumpulkan 200 point'), 'Kumpulkan 200 poin');
  assert.equal(ejaanPoin('Point menaikkan level'), 'Poin menaikkan level');
  assert.equal(ejaanPoin('Kumpulkan 750 poin'), 'Kumpulkan 750 poin');
  assert.equal(ejaanPoin('checkpoint'), 'checkpoint', 'bukan kata utuh');
  assert.equal(ejaanPoin(undefined), undefined);
});

test('teks yang tampil ke pengguna memakai "poin" dan tanpa salah ketik "basis basis"', async () => {
  for (const badge of SEED_BADGES) assert.ok(!/\bpoints?\b/i.test(badge.desc), `${badge.id}: ${badge.desc}`);
  const dibaca = (berkas) => readFile(new URL(berkas, import.meta.url), 'utf8');
  const bot = await dibaca('../../chatbot-aquaponik/services/aquaBot.js');
  assert.match(bot, /Jawaban saya berbasis pengetahuan lokal/);
  assert.doesNotMatch(bot, /berbasis basis/);
  const pengetahuan = await dibaca('../../chatbot-aquaponik/data/knowledge.js');
  assert.doesNotMatch(pengetahuan, /menerima point|Point menaikkan/);
  const area = await dibaca('../../kelola-area/pages/AreaDetail.jsx');
  assert.doesNotMatch(area, /\+100 point/);
});

test('Gamifikasi menampilkan sasaran lewat labelSasaranMisi, bukan id mentah', async () => {
  const sumber = await readFile(new URL('../pages/Gamifikasi.jsx', import.meta.url), 'utf8');
  assert.match(sumber, /Sasaran: \{labelSasaranMisi\(mission\.target\)\}/);
  assert.doesNotMatch(sumber, /mission\.target\.replaceAll/);
});
