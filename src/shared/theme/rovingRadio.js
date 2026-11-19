// Navigasi keyboard radiogroup (pola WAI-ARIA "radio group"): panah memindah
// pilihan sambil memindah fokus, berputar di ujung; Home/End ke ujung daftar.
// Dipakai ThemePicker dan ModeToggle.

/** Id tujuan untuk tombol `key`, atau null bila tombol itu bukan navigasi. */
export function nextRadioId(ids, current, key) {
  const n = ids.length;
  if (n === 0) return null;
  const i = ids.indexOf(current);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return ids[i < 0 ? 0 : (i + 1) % n];
    case 'ArrowLeft':
    case 'ArrowUp':
      return ids[i < 0 ? n - 1 : (i - 1 + n) % n];
    case 'Home':
      return ids[0];
    case 'End':
      return ids[n - 1];
    default:
      return null;
  }
}

/** Penangan onKeyDown radiogroup: pilih (onChange) lalu fokuskan radio tujuan. */
export function handleRadioKeyDown(event, { ids, value, onChange, focus }) {
  const next = nextRadioId(ids, value, event.key);
  if (next == null) return;
  event.preventDefault();
  onChange?.(next);
  focus?.(next);
}
