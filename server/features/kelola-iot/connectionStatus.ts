export const DEVICE_OFFLINE_AFTER_MS = 180_000;

export function connectionStatus(measuredAt: string | null, receivedAt: string | null, now = Date.now()) {
  if (!receivedAt || now - new Date(receivedAt).getTime() >= DEVICE_OFFLINE_AFTER_MS) return 'offline';
  if (!measuredAt || now - new Date(measuredAt).getTime() >= 90_000) return 'stale';
  return 'online';
}
