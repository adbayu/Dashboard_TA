import clsx from 'clsx';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { StatusPill } from '../../shared/components/ui/StatusPill.jsx';
import { formatMeasuredAt, formatSensorNumber } from '../../utils/iotPresentation.js';
import RangeBar from './RangeBar.jsx';

// Status selalu teks + ikon, tidak pernah hanya warna.
const STATUS = {
  normal: { tone: 'ok', icon: 'circle-check', text: 'Normal' },
  high: { tone: 'warn', icon: 'triangle-alert', text: 'Di atas batas' },
  low: { tone: 'warn', icon: 'triangle-alert', text: 'Di bawah batas' },
  stale: { tone: 'info', icon: 'clock', text: 'Data tertunda' },
  // Nilai ada tetapi area/kategori belum punya ambang: jangan disebut Normal.
  'no-range': { tone: 'muted', icon: 'circle-minus', text: 'Ambang belum diatur' },
  unknown: { tone: 'muted', icon: 'circle-minus', text: 'Belum ada data' },
};

const VARIANTS = ['auto', 'tile', 'row'];
const isNum = value => typeof value === 'number' && Number.isFinite(value);

// Status yang tidak dikenal (atau tidak dikirim) hanya boleh menjadi "Normal"
// bila ada rentang min/max; tanpa rentang, nilai itu belum bisa dinilai.
function resolveStatus(status, hasValue, hasRange) {
  if (!hasValue) return 'unknown';
  if (Object.hasOwn(STATUS, status) && status !== 'unknown') return status;
  return hasRange ? 'normal' : 'no-range';
}

/**
 * Satu nilai sensor: nama + kode alat, nilai + satuan, status, RangeBar, waktu ukur.
 *
 * Markup yang sama dirender untuk semua tema; petak atau baris dipilih CSS
 * (`data-variant="auto"` menjadi baris di Catatan Lapangan, petak di tema lain).
 * `variant="tile"|"row"` memaksanya. Kait CSS: lihat header theme-surfaces.css.
 * Tanpa nilai (`value == null`) status selalu "Belum ada data", apa pun `status`.
 * `status="no-range"` (atau status tak dikenal tanpa min/max): nilai tampil
 * tanpa RangeBar dan tanpa teks batas, keping "Ambang belum diatur".
 */
export default function SensorReading({
  name, icon, device, value, decimals = 0, unit, min, max, status, measuredAt, variant = 'auto', emptyText, className = '',
}) {
  const hasValue = isNum(value);
  const hasRange = isNum(min) && isNum(max);
  const key = resolveStatus(status, hasValue, hasRange);
  const state = STATUS[key];
  const kind = VARIANTS.includes(variant) ? variant : 'auto';
  const measured = measuredAt ? formatMeasuredAt(measuredAt) : '';
  const waktu = measured && measured !== 'Belum ada data' ? measured : '';
  const limitText = key === 'no-range' ? '' : [
    isNum(min) ? `Batas bawah ${formatSensorNumber(min, decimals)}` : '',
    isNum(max) ? `Batas atas ${formatSensorNumber(max, decimals)}` : '',
  ].filter(Boolean).join(', ');

  return (
    <div
      data-ui="sensor-reading"
      data-variant={kind}
      data-status={key}
      className={clsx('flex min-w-0 flex-col gap-1.5 rounded-card border border-border bg-surface px-4 py-3.5 text-text', className)}
    >
      <div data-ui="sensor-top" className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
        <div className="min-w-0">
          <div data-ui="sensor-name" className="flex items-center gap-2 font-semibold">
            <span data-ui="sensor-chip" className="inline-flex shrink-0 text-text-2">
              <IkonSlot icon={icon || 'activity'} size={18} />
            </span>
            <span className="min-w-0 break-words">{name}</span>
          </div>
          {device && <div data-ui="sensor-device" className="font-mono text-xs leading-4 text-text-2">{device}</div>}
        </div>
        <StatusPill tone={state.tone} icon={state.icon}>{state.text}</StatusPill>
      </div>

      {hasValue ? (
        <div data-ui="sensor-value-wrap" className="flex min-w-0 items-baseline">
          <span
            data-ui="sensor-value"
            className={clsx('font-num text-[26px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums', key === 'stale' ? 'text-text-2' : 'text-text')}
          >
            {formatSensorNumber(value, decimals)}
          </span>
          {unit && <span className="ml-1 text-sm font-medium leading-5 text-text-2">{unit}</span>}
        </div>
      ) : (
        <div data-ui="sensor-empty" className="text-[15px] leading-[22px] text-text-2">{emptyText || 'Alat belum mengirim pembacaan.'}</div>
      )}

      {hasValue && hasRange && key !== 'no-range' ? (
        <RangeBar
          value={value}
          min={min}
          max={max}
          status={key}
          decimals={decimals}
          unit={unit}
          ariaLabel={`Rentang ${name}`}
          right={waktu}
        />
      ) : (
        <div data-ui="sensor-foot" className="mt-1 flex justify-between gap-3 text-xs leading-4 text-text-2">
          <span>{limitText}</span>
          <span>{waktu}</span>
        </div>
      )}
    </div>
  );
}
