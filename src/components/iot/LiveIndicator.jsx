import { Badge } from '../../shared/components/ui.jsx';

const INDICATORS = {
  connecting: { label: 'Menghubungkan...', tone: 'muted', icon: 'sensors' },
  live: { label: 'Live', tone: 'ok', icon: 'sensors' },
  reconnecting: { label: 'Menyambung ulang...', tone: 'warn', icon: 'sync' },
  polling: { label: 'Diperbarui tiap 30 detik', tone: 'muted', icon: 'schedule' },
  local: { label: 'Data contoh', tone: 'muted', icon: 'info' },
  idle: { label: 'Live tidak aktif untuk rentang ini', tone: 'muted', icon: 'pause_circle' },
};

export default function LiveIndicator({ status = 'connecting' }) {
  const indicator = INDICATORS[status] || INDICATORS.connecting;
  return (
    <span className="inline-flex" role="status" aria-live="polite">
      <Badge tone={indicator.tone} icon={indicator.icon}>{indicator.label}</Badge>
    </span>
  );
}
