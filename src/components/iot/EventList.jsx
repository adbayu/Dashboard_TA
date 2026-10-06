import { Badge, Empty } from '../ui.jsx';
import { formatEventMessage } from '../../utils/iotPresentation.js';

const EVENT_STYLE = {
  online: { icon: 'wifi', tone: 'ok', label: 'Koneksi' },
  offline: { icon: 'wifi_off', tone: 'bad', label: 'Koneksi' },
  threshold_low: { icon: 'arrow_downward', tone: 'warn', label: 'Ambang' },
  threshold_high: { icon: 'arrow_upward', tone: 'warn', label: 'Ambang' },
  threshold_clear: { icon: 'check_circle', tone: 'ok', label: 'Ambang' },
};

function formatEventTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Waktu tidak tersedia'
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function EventList({ events = [], deviceCode, sensors = [] }) {
  if (!events.length) {
    return <Empty title="Belum ada kejadian untuk perangkat ini" hint="Kejadian koneksi dan ambang akan tampil saat tercatat oleh server." icon="event_note" />;
  }

  const sensorNames = Object.fromEntries(sensors.map(sensor => [sensor.code, sensor.name || sensor.label || sensor.code]));
  return (
    <ol className="divide-y divide-outline-variant/35">
      {events.map((event, index) => {
        const style = EVENT_STYLE[event.type] || { icon: 'help', tone: 'muted', label: 'Kejadian' };
        return (
          <li key={event.id || `${event.type}-${event.at}-${index}`} className="flex min-w-0 gap-3 py-3 first:pt-1 last:pb-1">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${style.tone === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200' : style.tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100' : style.tone === 'bad' ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200' : 'border-outline-variant bg-surface-container text-on-surface-variant'}`} aria-hidden="true">
              <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={style.tone}>{style.label}</Badge>
                <span className="font-mono text-[11px] text-on-surface-variant">{deviceCode}</span>
              </div>
              <p className="mt-1 break-words text-sm font-semibold text-on-surface">{formatEventMessage(event, sensorNames)}</p>
              <time className="mt-1 block text-xs text-on-surface-variant" dateTime={event.at || undefined}>{formatEventTime(event.at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
