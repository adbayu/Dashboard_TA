import clsx from 'clsx';
import { formatSensorNumber } from '../../utils/iotPresentation.js';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const isNum = value => typeof value === 'number' && Number.isFinite(value);

/**
 * Pita rentang ideal dengan penanda nilai sekarang. Lintasan `track`, pita
 * `band`, penanda `marker`; di luar batas penanda memakai `warn-fg`. Tinggi
 * lintasan (6 px, 8 px pill di Lumina) diatur theme-surfaces.css lewat
 * `data-ui="range-bar"`.
 *
 * Skala bawaan: satu lebar rentang di kiri dan kanan pita. Lintasan adalah
 * `role="meter"`; `aria-valuenow` dijepit ke skala (aturan ARIA), nilai asli
 * dan keterangan di luar batas ada di `aria-valuetext`.
 */
export default function RangeBar({ value, min, max, scaleMin, scaleMax, status, label, ariaLabel, unit, decimals = 0, right }) {
  if (!isNum(min) || !isNum(max)) return null;
  const span = max - min > 0 ? max - min : 1;
  const lo = isNum(scaleMin) ? scaleMin : min - span;
  const hi = isNum(scaleMax) && scaleMax > lo ? scaleMax : max + span;
  const pct = v => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
  const hasValue = isNum(value);
  const arah = hasValue ? (value > max ? 'high' : value < min ? 'low' : null) : null;
  const out = status === 'low' || status === 'high' ? hasValue : arah !== null;
  const text = n => formatSensorNumber(n, decimals);
  const satuan = unit ? ` ${unit}` : '';
  const visibleLabel = label ?? `Batas ${text(min)} sampai ${text(max)}${satuan}`;
  const valueText = hasValue
    ? `Nilai ${text(value)}${satuan}, ${visibleLabel}${out ? `, di ${(status === 'low' || arah === 'low') ? 'bawah' : 'atas'} batas` : ''}`
    : visibleLabel;

  return (
    <div data-ui="range-bar" className="mt-2 min-w-0">
      <div
        data-ui="range-track"
        role="meter"
        aria-label={ariaLabel ?? visibleLabel}
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-valuenow={hasValue ? clamp(value, lo, hi) : undefined}
        aria-valuetext={valueText}
        className="relative h-1.5 rounded-[3px] bg-track"
      >
        <div
          data-ui="range-band"
          className="absolute inset-y-0 rounded-[inherit] bg-band"
          style={{ left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%` }}
        />
        {hasValue && (
          <div
            data-ui="range-marker"
            className={clsx('absolute -top-1 h-3.5 w-[3px] -translate-x-1/2 rounded-sm', out ? 'bg-warn-fg' : 'bg-marker')}
            style={{ left: `${pct(value)}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-xs leading-4 text-text-2">
        <span>{visibleLabel}</span>
        {right ? <span className="shrink-0">{right}</span> : null}
      </div>
    </div>
  );
}
