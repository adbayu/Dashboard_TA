import clsx from 'clsx';

// Penanda posisi nilai: `marker` biasa, warna status bila di luar wajar.
const PENANDA = {
  brand: 'bg-marker',
  ok: 'bg-marker',
  warn: 'bg-warn-fg',
  bad: 'bg-bad-fg',
  info: 'bg-info-fg',
};

/**
 * Batang progres lama (R8): implementasi yang sama, kini dengan token
 * `track` (lintasan), `band` (isi), dan `marker` (penanda ujung).
 * Task 7 mengarahkan `Bar` ke RangeBar.
 */
export function Bar({ value, max = 100, tone = 'brand', label = 'Progres' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="relative h-1.5 w-full rounded-pill bg-track"
    >
      <div className="h-full rounded-pill bg-band transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      <div
        className={clsx('absolute -top-1 h-3.5 w-[3px] -translate-x-1/2 rounded-sm', PENANDA[tone] || PENANDA.brand)}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
