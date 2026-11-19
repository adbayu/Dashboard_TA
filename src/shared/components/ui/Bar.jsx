import clsx from 'clsx';

// Isi batang memakai warna penuh nada (`primary` bawaan) di atas lintasan
// `track`; pasangan ini ≥ 3:1 di kesepuluh palet (dicek uiContrast.test.js).
// `band` tidak dipakai: itu pita rentang wajar RangeBar dan hampir sewarna
// dengan `track`, jadi jumlah progres tidak akan terlihat.
const ISI = {
  brand: 'bg-primary',
  ok: 'bg-primary',
  warn: 'bg-warn-fg',
  bad: 'bg-bad-fg',
  info: 'bg-info-fg',
};

/**
 * Batang progres (mis. kenyang V-Pet, menuju badge berikutnya). Komponen ini
 * tetap terpisah dari RangeBar: RangeBar menampilkan nilai sensor terhadap
 * rentang wajar, Bar menampilkan seberapa penuh sesuatu.
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
      className="h-2 w-full overflow-hidden rounded-pill bg-track"
    >
      <div
        data-ui="bar-fill"
        className={clsx('h-full rounded-pill transition-[width] duration-300 motion-reduce:transition-none', ISI[tone] || ISI.brand)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
