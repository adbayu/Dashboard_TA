import { Badge, Empty } from '../../shared/components/ui.jsx';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { formatEventMessage } from '../../utils/iotPresentation.js';

const EVENT_STYLE = {
  online: { icon: 'wifi', tone: 'ok', label: 'Koneksi' },
  offline: { icon: 'wifi-off', tone: 'bad', label: 'Koneksi' },
  threshold_low: { icon: 'arrow-down', tone: 'warn', label: 'Ambang' },
  threshold_high: { icon: 'arrow-up', tone: 'warn', label: 'Ambang' },
  threshold_clear: { icon: 'circle-check', tone: 'ok', label: 'Ambang' },
};

// Chip ikon per nada, hanya token (tanpa kelas palet mentah atau dark:).
const CHIP_TONE = {
  ok: 'border-ok-fg/40 bg-ok-bg text-ok-fg',
  warn: 'border-warn-line bg-warn-bg text-warn-fg',
  bad: 'border-bad-line bg-bad-bg text-bad-fg',
  info: 'border-info-fg/40 bg-info-bg text-info-fg',
  muted: 'border-border bg-surface-2 text-text-2',
};

function formatEventTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Waktu tidak tersedia'
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function EventList({ events = [], deviceCode, sensors = [] }) {
  if (!events.length) {
    return <Empty title="Belum ada kejadian untuk perangkat ini" hint="Kejadian koneksi dan ambang akan tampil saat tercatat oleh server." icon="calendar-days" />;
  }

  const sensorNames = Object.fromEntries(sensors.map(sensor => [sensor.code, sensor.name || sensor.label || sensor.code]));
  return (
    <ol className="divide-y divide-border">
      {events.map((event, index) => {
        const style = EVENT_STYLE[event.type] || { icon: 'circle-help', tone: 'muted', label: 'Kejadian' };
        return (
          <li key={event.id || `${event.type}-${event.at}-${index}`} className="flex min-w-0 gap-3 py-3 first:pt-1 last:pb-1">
            <span data-ui="event-chip" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${CHIP_TONE[style.tone] || CHIP_TONE.muted}`} aria-hidden="true">
              <IkonSlot icon={style.icon} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={style.tone}>{style.label}</Badge>
                <span className="font-mono text-xs text-text-2">{deviceCode}</span>
              </div>
              <p className="mt-1 break-words text-sm font-semibold text-text">{formatEventMessage(event, sensorNames)}</p>
              <time className="mt-1 block text-xs text-text-2" dateTime={event.at || undefined}>{formatEventTime(event.at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
