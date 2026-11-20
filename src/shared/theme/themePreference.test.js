import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_PREFERENCE,
  MODE,
  STORAGE_KEY,
  TEMA,
  applyToRoot,
  mergePreference,
  migrateLegacyTheme,
  readPreference,
  resolveMode,
  watchMediaQuery,
  writePreference,
} from './themePreference.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
  };
}

function fakeRoot() {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      toggle: (name, force) => { if (force) classes.add(name); else classes.delete(name); },
      contains: (name) => classes.has(name),
    },
  };
}

test('daftar tema, mode, dan kunci penyimpanan sesuai kontrak', () => {
  assert.deepEqual(TEMA, ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina']);
  assert.deepEqual(MODE, ['terang', 'gelap', 'sistem']);
  assert.equal(STORAGE_KEY, 'jagofarm.tampilan');
  assert.deepEqual(DEFAULT_PREFERENCE, { tema: 'kebun-air', mode: 'sistem' });
});

test('readPreference memakai bawaan untuk storage kosong', () => {
  assert.deepEqual(readPreference(fakeStorage()), { tema: 'kebun-air', mode: 'sistem' });
});

test('readPreference memakai bawaan untuk JSON rusak dan membuang tema tak dikenal', () => {
  assert.deepEqual(readPreference(fakeStorage({ [STORAGE_KEY]: '{rusak' })), DEFAULT_PREFERENCE);
  assert.deepEqual(
    readPreference(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ tema: 'ungu', mode: 'gelap' }) })),
    { tema: 'kebun-air', mode: 'gelap' },
  );
  assert.deepEqual(
    readPreference(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ tema: 'lumina', mode: 'gaib' }) })),
    { tema: 'lumina', mode: 'sistem' },
  );
});

test('readPreference dan writePreference tidak melempar saat storage gagal', () => {
  const rusak = {
    getItem() { throw new Error('diblokir'); },
    setItem() { throw new Error('penuh'); },
  };
  assert.deepEqual(readPreference(rusak), DEFAULT_PREFERENCE);
  assert.doesNotThrow(() => writePreference(rusak, { tema: 'lumina', mode: 'gelap' }));
  assert.deepEqual(readPreference(null), DEFAULT_PREFERENCE);
});

test('writePreference menyimpan preferensi yang bisa dibaca kembali', () => {
  const storage = fakeStorage();
  writePreference(storage, { tema: 'tanah-lumut', mode: 'terang' });
  assert.deepEqual(readPreference(storage), { tema: 'tanah-lumut', mode: 'terang' });
});

test('resolveMode menerjemahkan mode tersimpan ke light atau dark', () => {
  assert.equal(resolveMode('sistem', true), 'dark');
  assert.equal(resolveMode('sistem', false), 'light');
  assert.equal(resolveMode('terang', true), 'light');
  assert.equal(resolveMode('gelap', false), 'dark');
});

test('applyToRoot menulis data-theme dan data-mode tanpa kelas dark', () => {
  const el = fakeRoot();
  applyToRoot(el, { tema: 'lumina', mode: 'gelap' }, false);
  assert.equal(el.dataset.theme, 'lumina');
  assert.equal(el.dataset.mode, 'dark');
  assert.equal(el.classList.contains('dark'), false);

  applyToRoot(el, { tema: 'lumina', mode: 'sistem' }, false);
  assert.equal(el.dataset.mode, 'light');
  assert.equal(el.classList.contains('dark'), false);
});

test('migrateLegacyTheme memindahkan tema lama sekali saja', () => {
  const storage = fakeStorage();
  assert.deepEqual(migrateLegacyTheme(storage, 'dark'), { tema: 'kebun-air', mode: 'gelap' });
  assert.deepEqual(readPreference(storage), { tema: 'kebun-air', mode: 'gelap' });

  const sudahAda = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ tema: 'lumina', mode: 'terang' }) });
  assert.equal(migrateLegacyTheme(sudahAda, 'dark'), null);
  assert.deepEqual(readPreference(sudahAda), { tema: 'lumina', mode: 'terang' });
});

test('migrateLegacyTheme hanya memindahkan dark; light adalah bawaan lama sehingga tidak mengunci mode', () => {
  const storage = fakeStorage();
  for (const legacy of [null, undefined, 'ungu', 'light']) {
    assert.equal(migrateLegacyTheme(storage, legacy), null);
  }
  assert.equal(storage.map.has(STORAGE_KEY), false);
});

// R13: setTema dan setMode dipanggil di tick yang sama (mis. satu klik yang
// mengubah keduanya). React menjalankan antrean updater berurutan, jadi
// updater fungsional harus memegang kedua perubahan.
test('mergePreference menggabungkan patch ke preferensi sebelumnya dan menolak nilai tak dikenal', () => {
  const awal = { tema: 'kebun-air', mode: 'sistem' };
  assert.deepEqual(mergePreference(awal, { tema: 'lumina' }), { tema: 'lumina', mode: 'sistem' });
  assert.deepEqual(mergePreference(awal, { mode: 'gelap' }), { tema: 'kebun-air', mode: 'gelap' });
  assert.deepEqual(mergePreference(awal, { tema: 'tak-ada', mode: 'ungu' }), awal);
  assert.equal(mergePreference(awal, {}), awal, 'tanpa perubahan mengembalikan objek yang sama');
  assert.deepEqual(awal, { tema: 'kebun-air', mode: 'sistem' }, 'objek sebelumnya tidak dimutasi');
});

test('setTema("lumina") lalu setMode("gelap") di tick yang sama menyimpan keduanya', () => {
  // Antrean updater setPref(prev => ...) yang dijalankan React berurutan.
  const antrean = [
    (prev) => mergePreference(prev, { tema: 'lumina' }),
    (prev) => mergePreference(prev, { mode: 'gelap' }),
  ];
  const akhir = antrean.reduce((prev, updater) => updater(prev), { ...DEFAULT_PREFERENCE });
  assert.deepEqual(akhir, { tema: 'lumina', mode: 'gelap' });

  // Urutan sebaliknya juga tidak boleh menjatuhkan salah satunya.
  const terbalik = [...antrean].reverse().reduce((prev, updater) => updater(prev), { ...DEFAULT_PREFERENCE });
  assert.deepEqual(terbalik, { tema: 'lumina', mode: 'gelap' });

  const storage = fakeStorage();
  writePreference(storage, akhir);
  assert.deepEqual(readPreference(storage), { tema: 'lumina', mode: 'gelap' });
});

test('TampilanProvider memakai updater fungsional dan menyimpan nilai gabungan, bukan closure', () => {
  const source = readFileSync(new URL('./TampilanProvider.jsx', import.meta.url), 'utf8');
  assert.match(source, /setPref\(\(prev\) => mergePreference\(prev, patch\)\)/);
  assert.doesNotMatch(source, /\.\.\.pref,\s*\.\.\.patch/, 'update() tidak boleh menggabung ke pref hasil closure');
  assert.match(source, /writePreference\(browserStorage\(\), pref\)/, 'yang disimpan adalah state terbaru');
  assert.match(source, /const update = useCallback\(\(patch\) => \{[^}]*\}, \[\]\);/, 'update() tidak bergantung pada pref');
});

// ── Langganan perubahan skema warna OS ─────────────────────────────────────────
test('watchMediaQuery memakai addEventListener bila ada dan melepasnya saat berhenti', () => {
  const calls = [];
  const query = {
    addEventListener: (type, handler) => calls.push(['add', type, handler]),
    removeEventListener: (type, handler) => calls.push(['remove', type, handler]),
  };
  const handler = () => {};
  const stop = watchMediaQuery(query, handler);
  assert.deepEqual(calls, [['add', 'change', handler]]);
  stop();
  assert.deepEqual(calls[1], ['remove', 'change', handler]);
});

test('watchMediaQuery jatuh ke addListener/removeListener di Safari lama tanpa melempar', () => {
  const calls = [];
  const query = {
    addListener: (handler) => calls.push(['add', handler]),
    removeListener: (handler) => calls.push(['remove', handler]),
  };
  const handler = () => {};
  const stop = watchMediaQuery(query, handler);
  stop();
  assert.deepEqual(calls, [['add', handler], ['remove', handler]]);
});

test('watchMediaQuery tanpa API langganan atau tanpa query menjadi no-op', () => {
  assert.doesNotThrow(() => watchMediaQuery({}, () => {})());
  assert.doesNotThrow(() => watchMediaQuery(null, () => {})());
});
