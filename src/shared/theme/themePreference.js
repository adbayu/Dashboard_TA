export const TEMA = ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina'];
export const MODE = ['terang', 'gelap', 'sistem'];
export const STORAGE_KEY = 'jagofarm.tampilan';
export const DEFAULT_PREFERENCE = { tema: 'kebun-air', mode: 'sistem' };

function normalize(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    tema: TEMA.includes(source.tema) ? source.tema : DEFAULT_PREFERENCE.tema,
    mode: MODE.includes(source.mode) ? source.mode : DEFAULT_PREFERENCE.mode,
  };
}

function readRaw(storage) {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readPreference(storage) {
  const raw = readRaw(storage);
  if (raw == null) return { ...DEFAULT_PREFERENCE };
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function writePreference(storage, pref) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(normalize(pref)));
  } catch {
    // Penyimpanan diblokir atau penuh: preferensi tetap berlaku selama sesi.
  }
}

export function resolveMode(mode, prefersDark) {
  if (mode === 'gelap') return 'dark';
  if (mode === 'terang') return 'light';
  return prefersDark ? 'dark' : 'light';
}

export function applyToRoot(rootEl, pref, prefersDark) {
  const { tema, mode } = normalize(pref);
  const resolved = resolveMode(mode, Boolean(prefersDark));
  rootEl.dataset.theme = tema;
  rootEl.dataset.mode = resolved;
  // Jembatan sementara untuk kelas dark: lama, hapus di Task 14.
  rootEl.classList?.toggle('dark', resolved === 'dark');
}

// Pengguna lama menyimpan `theme` di state SmartStore. Hanya 'dark' dipindahkan:
// 'light' adalah bawaan lama untuk semua orang, jadi memindahkannya akan
// mengunci mode terang dan menghilangkan bawaan 'sistem'.
export function migrateLegacyTheme(storage, legacyTheme) {
  if (readRaw(storage) != null) return null;
  if (legacyTheme !== 'dark') return null;
  const pref = { ...DEFAULT_PREFERENCE, mode: 'gelap' };
  writePreference(storage, pref);
  return pref;
}
