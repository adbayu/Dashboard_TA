import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { KEY as SMART_STORE_KEY } from '../store/storageKey.js';
import { loadThemeFonts } from './loadThemeFonts.js';
import {
  DEFAULT_PREFERENCE,
  MODE,
  TEMA,
  applyToRoot,
  mergePreference,
  migrateLegacyTheme,
  readPreference,
  resolveMode,
  watchMediaQuery,
  writePreference,
} from './themePreference.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const FALLBACK = {
  ...DEFAULT_PREFERENCE,
  resolvedMode: 'light',
  setTema: () => {},
  setMode: () => {},
};

const TampilanCtx = createContext(FALLBACK);

function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

function readLegacyTheme(storage) {
  try {
    const raw = storage?.getItem(SMART_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.theme === 'string' ? parsed.theme : null;
  } catch {
    return null;
  }
}

function loadInitial() {
  const storage = browserStorage();
  const migrated = migrateLegacyTheme(storage, readLegacyTheme(storage));
  const pref = migrated ?? readPreference(storage);
  const prefersDark = systemPrefersDark();
  // Terapkan sinkron saat inisialisasi agar render pertama tidak berkedip tema salah.
  if (typeof document !== 'undefined') applyToRoot(document.documentElement, pref, prefersDark);
  return { pref, prefersDark };
}

export function TampilanProvider({ children }) {
  const [initial] = useState(loadInitial);
  const [pref, setPref] = useState(initial.pref);
  const [prefersDark, setPrefersDark] = useState(initial.prefersDark);

  useLayoutEffect(() => {
    applyToRoot(document.documentElement, pref, prefersDark);
  }, [pref, prefersDark]);

  // Muat huruf tema aktif (juga saat awal). Gagal muat ditelan di loadThemeFonts.
  useEffect(() => {
    loadThemeFonts(pref.tema);
  }, [pref.tema]);

  // Pantau OS terus (bukan hanya saat mode sistem) agar prefersDark selalu segar
  // ketika pengguna kembali ke mode sistem; hanya mode sistem yang memakainya.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const onChange = (event) => setPrefersDark(event.matches);
    return watchMediaQuery(window.matchMedia(DARK_QUERY), onChange);
  }, []);

  // Updater fungsional: dua perubahan di tick yang sama (setTema lalu setMode)
  // digabung berurutan, bukan masing-masing ke pref hasil closure.
  const update = useCallback((patch) => {
    setPref((prev) => mergePreference(prev, patch));
  }, []);

  // Simpan state terbaru (hasil gabungan), bukan nilai di closure. Render awal
  // tidak menulis: pilihan belum berubah, dan migrasi lama sudah menulis sendiri.
  const savedRef = useRef(initial.pref);
  useEffect(() => {
    if (savedRef.current === pref) return;
    savedRef.current = pref;
    writePreference(browserStorage(), pref);
  }, [pref]);

  const setTema = useCallback((tema) => {
    if (TEMA.includes(tema)) update({ tema });
  }, [update]);

  const setMode = useCallback((mode) => {
    if (MODE.includes(mode)) update({ mode });
  }, [update]);

  const value = useMemo(() => ({
    tema: pref.tema,
    mode: pref.mode,
    resolvedMode: resolveMode(pref.mode, prefersDark),
    setTema,
    setMode,
  }), [pref, prefersDark, setTema, setMode]);

  return <TampilanCtx.Provider value={value}>{children}</TampilanCtx.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- Hook berdampingan dengan provider-nya.
export function useTampilan() {
  return useContext(TampilanCtx);
}
