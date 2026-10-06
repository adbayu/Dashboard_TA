import { Badge, Empty } from '../ui.jsx';
import {
  formatMeasuredAt,
  formatSensorNumber,
  formatThreshold,
  getSensorState,
  isMeasurementStale,
} from '../../utils/iotPresentation.js';

const READING_STATE = {
  normal: { label: 'Normal', tone: 'ok', icon: 'check_circle' },
  low: { label: 'Di bawah ambang', tone: 'warn', icon: 'arrow_downward' },
  high: { label: 'Di atas ambang', tone: 'warn', icon: 'arrow_upward' },
  unknown: { label: 'Tanpa ambang', tone: 'muted', icon: 'remove' },
};

export function SensorReading({ sensor, reading, measuredAt, compact = false, showTime = true }) {
  const value = reading?.value ?? null;
  const decimals = sensor.decimals ?? 2;
  const threshold = reading?.threshold ?? sensor.threshold ?? null;
  const state = reading?.state || getSensorState(value, threshold);
  const status = READING_STATE[state] || READING_STATE.unknown;
  const stale = isMeasurementStale(measuredAt);
  const name = sensor.name || sensor.label || sensor.code;

  return (
    <div className={`min-w-0 ${compact ? 'rounded-xl border border-outline-variant/35 bg-surface/60 p-2.5' : 'rounded-xl panel-inset p-4'}`} aria-label={`Pembacaan ${name}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-semibold text-on-surface">{name}</p>
        <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
      </div>
      <p className={`mt-2 flex flex-wrap items-baseline gap-1 tabular-nums font-extrabold text-on-surface ${compact ? 'text-2xl' : 'text-3xl'}`}>
        <span>{formatSensorNumber(value, decimals)}</span>
        {sensor.unit && <span className="text-sm font-semibold text-on-surface-variant">{sensor.unit}</span>}
      </p>
      {value == null && <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Belum ada pembacaan untuk sensor ini.</p>}
      <p className="mt-2 break-words text-xs text-on-surface-variant">{formatThreshold(threshold, sensor.unit, decimals)}</p>
      {showTime && (
        <time
          className={`mt-2 block text-xs ${stale ? 'font-semibold text-amber-800 dark:text-amber-200' : 'text-on-surface-variant'}`}
          dateTime={measuredAt || undefined}
        >
          {formatMeasuredAt(measuredAt)}
        </time>
      )}
    </div>
  );
}

export function DeviceReadings({ sensors = [], latest, compact = false, loading = false, unavailable = false }) {
  const readings = new Map((latest?.readings || []).map(reading => [reading.sensor, reading]));
  if (!sensors.length) return <Empty title="Konfigurasi sensor belum tersedia" icon="sensors" />;
  if (loading && !latest) return <p role="status" className="py-3 text-sm text-on-surface-variant">Memuat pembacaan sensor...</p>;
  if (unavailable && !latest) return <p role="alert" className="py-3 text-sm text-red-800 dark:text-red-200">Pembacaan tidak dapat dimuat.</p>;

  return (
    <div className={`grid min-w-0 gap-2.5 ${sensors.length > 1 ? compact || sensors.length < 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
      {sensors.map(sensor => (
        <SensorReading
          key={sensor.code}
          sensor={sensor}
          reading={readings.get(sensor.code)}
          measuredAt={latest?.measuredAt}
          compact={compact}
          showTime={!compact}
        />
      ))}
      {compact && latest?.measuredAt && (
        <time className="col-span-full text-xs text-on-surface-variant" dateTime={latest.measuredAt}>
          {formatMeasuredAt(latest.measuredAt)}
        </time>
      )}
    </div>
  );
}
