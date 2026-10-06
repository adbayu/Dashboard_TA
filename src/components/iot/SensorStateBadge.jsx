import { Badge } from '../ui.jsx';

const SENSOR_STATES = {
  normal: { label: 'Normal', tone: 'ok', icon: 'check_circle' },
  low: { label: 'Di bawah ambang', tone: 'warn', icon: 'arrow_downward' },
  high: { label: 'Di atas ambang', tone: 'warn', icon: 'arrow_upward' },
  unknown: { label: 'Tanpa ambang', tone: 'muted', icon: 'remove' },
};

export default function SensorStateBadge({ state }) {
  const value = SENSOR_STATES[state] || SENSOR_STATES.unknown;
  return <Badge tone={value.tone} icon={value.icon}>{value.label}</Badge>;
}
