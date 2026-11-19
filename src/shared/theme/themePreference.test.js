import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PREFERENCE,
  MODE,
  STORAGE_KEY,
  TEMA,
  applyToRoot,
  migrateLegacyTheme,
  readPreference,
  resolveMode,
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

test('applyToRoot menulis data-theme dan data-mode serta jembatan kelas dark', () => {
  const el = fakeRoot();
  applyToRoot(el, { tema: 'lumina', mode: 'gelap' }, false);
  assert.equal(el.dataset.theme, 'lumina');
  assert.equal(el.dataset.mode, 'dark');
  assert.equal(el.classList.contains('dark'), true);

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
