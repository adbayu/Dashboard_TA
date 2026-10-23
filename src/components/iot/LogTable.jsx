import { Badge } from '../../shared/components/ui.jsx';
import { formatSensorNumber } from '../../utils/iotPresentation.js';

const READING_STATES = {
  normal: { label: 'Normal', tone: 'ok', icon: 'check_circle' },
  low: { label: 'Di bawah ambang', tone: 'warn', icon: 'arrow_downward' },
  high: { label: 'Di atas ambang', tone: 'warn', icon: 'arrow_upward' },
  unknown: { label: 'Tanpa ambang', tone: 'muted', icon: 'remove' },
};

function formatTimestamp(value) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hourCycle: 'h23',
  }).format(timestamp);
}

function isDelayed(point) {
  const measured = Date.parse(point.measuredAt || '');
  const received = Date.parse(point.receivedAt || '');
  return Number.isFinite(measured) && Number.isFinite(received) && received - measured > 90_000;
}

function ReadingValue({ sensor, reading }) {
  const value = reading?.value ?? null;
  const state = READING_STATES[reading?.state] || READING_STATES.unknown;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="tabular-nums font-bold text-on-surface">
        {formatSensorNumber(value, sensor.decimals ?? 2)}{(reading?.unit || sensor.unit) ? ` ${reading?.unit || sensor.unit}` : ''}
      </span>
      <Badge tone={state.tone} icon={state.icon}>{state.label}</Badge>
    </div>
  );
}

function Timestamp({ point }) {
  const delayed = isDelayed(point);
  return (
    <div className="min-w-0">
      <time className="block break-words font-semibold tabular-nums text-on-surface" dateTime={point.measuredAt || undefined}>
        {formatTimestamp(point.measuredAt)}
      </time>
      {delayed && (
        <p className="mt-1 break-words text-xs font-semibold text-amber-800 dark:text-amber-200">
          Dikirim terlambat
          <span className="block font-normal text-on-surface-variant">Diterima {formatTimestamp(point.receivedAt)}</span>
        </p>
      )}
    </div>
  );
}

export default function LogTable({ points = [], sensors = [], selectedSensor = '' }) {
  const visibleSensors = selectedSensor
    ? sensors.filter(sensor => sensor.code === selectedSensor)
    : sensors;

  return (
    <div className="min-w-0 max-w-full overflow-visible rounded-xl border border-transparent min-[720px]:overflow-x-auto min-[720px]:border-outline-variant/40">
      <table aria-label="Log pembacaan sensor" className="w-full min-w-0 text-sm min-[720px]:min-w-max">
        <thead className="hidden border-b border-outline-variant/40 bg-surface-container-high/70 min-[720px]:table-header-group">
          <tr>
            <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Waktu ukur</th>
            {visibleSensors.map(sensor => (
              <th key={sensor.code} scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                {sensor.name || sensor.label || sensor.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block space-y-3 min-[720px]:table-row-group min-[720px]:space-y-0">
          {points.map(point => {
            const readings = new Map((point.readings || []).map(reading => [reading.sensor, reading]));
            return (
              <tr key={point.messageId} className="block min-w-0 rounded-xl border border-outline-variant/40 bg-surface/70 p-3 min-[720px]:table-row min-[720px]:rounded-none min-[720px]:border-0 min-[720px]:border-b min-[720px]:border-outline-variant/30 min-[720px]:bg-transparent min-[720px]:p-0">
                <td className="block min-w-0 px-0 py-2 align-top min-[720px]:table-cell min-[720px]:min-w-52 min-[720px]:px-3 min-[720px]:py-3">
                  <Timestamp point={point} />
                </td>
                {visibleSensors.map(sensor => (
                  <td key={sensor.code} className="block min-w-0 border-t border-outline-variant/30 px-0 py-2 align-top min-[720px]:table-cell min-[720px]:min-w-40 min-[720px]:border-0 min-[720px]:px-3 min-[720px]:py-3">
                    <span className="mb-1 block break-words text-xs font-semibold text-on-surface-variant min-[720px]:hidden">
                      {sensor.name || sensor.label || sensor.code}
                    </span>
                    <ReadingValue sensor={sensor} reading={readings.get(sensor.code)} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
