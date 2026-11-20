import { Badge } from '../../shared/components/ui.jsx';

const SENSOR_STATES = {
  normal: { label: 'Normal', tone: 'ok', icon: 'circle-check' },
  low: { label: 'Di bawah ambang', tone: 'warn', icon: 'arrow-down' },
  high: { label: 'Di atas ambang', tone: 'warn', icon: 'arrow-up' },
  unknown: { label: 'Tanpa ambang', tone: 'muted', icon: 'minus' },
};

export default function SensorStateBadge({ state }) {
  const value = SENSOR_STATES[state] || SENSOR_STATES.unknown;
  return <Badge tone={value.tone} icon={value.icon}>{value.label}</Badge>;
}
