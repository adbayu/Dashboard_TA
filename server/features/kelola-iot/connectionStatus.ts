export function connectionStatus(measuredAt: string | null, receivedAt: string | null, now = Date.now()) {
  if (!receivedAt || now - new Date(receivedAt).getTime() >= 180_000) return 'offline';
  if (!measuredAt || now - new Date(measuredAt).getTime() >= 90_000) return 'stale';
  return 'online';
}
