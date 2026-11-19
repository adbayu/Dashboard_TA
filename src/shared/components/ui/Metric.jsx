import clsx from 'clsx';
import { IkonSlot } from './IkonSlot.jsx';

// `brand` (bawaan lama) = penekanan biasa `primary`; nada lain mengikuti status.
const WARNA_IKON = {
  brand: 'text-primary',
  ok: 'text-ok-fg',
  warn: 'text-warn-fg',
  bad: 'text-bad-fg',
  info: 'text-info-fg',
  muted: 'text-text-2',
};

/**
 * Satu angka inti halaman: label, nilai besar (`font-num`), satuan kecil, dan
 * petunjuk. h-full menjaga kartu sebaris sama tinggi.
 */
export function Metric({ label, value, unit, icon, hint, tone = 'brand' }) {
  return (
    <div data-ui="metric" className="flex h-full min-w-0 flex-col gap-1 rounded-card border border-border bg-surface p-4 text-text">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold text-text-2">{label}</span>
        <IkonSlot icon={icon} size={20} className={clsx('shrink-0', WARNA_IKON[tone] || WARNA_IKON.brand)} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-num text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm text-text-2">{unit}</span>}
      </div>
      {/* min-h menjaga tinggi kartu sama walau petunjuk hanya satu baris */}
      <p className="mt-auto min-h-[1.5rem] pt-1 text-sm text-text-2">{hint}</p>
    </div>
  );
}
