const parseTimestamp = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const localDateKey = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const pointTimestamp = (row) => {
  const raw = typeof row.at === 'string' ? row.at : '';
  const timestamp = parseTimestamp(raw);
  if (timestamp != null) return { at: raw, timestamp };

  if (typeof row.tanggal !== 'string' || typeof row.jam !== 'string') return null;
  const at = `${row.tanggal}T${row.jam}`;
  const fallbackTimestamp = parseTimestamp(at);
  return fallbackTimestamp == null ? null : { at, timestamp: fallbackTimestamp };
};

const numericValue = (value) => {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function buildSensorPoints(readings, areaId, metricKey, dateKeys) {
  if (!Array.isArray(readings) || !areaId || !metricKey) return [];
  const visibleDates = new Set(dateKeys instanceof Set ? dateKeys : Array.isArray(dateKeys) ? dateKeys : []);
  if (!visibleDates.size) return [];

  return readings
    .map((row, index) => {
      if (row?.areaId !== areaId) return null;
      const parsed = pointTimestamp(row);
      if (!parsed) return null;
      const dateKey = typeof row.tanggal === 'string' ? row.tanggal : localDateKey(parsed.timestamp);
      if (!visibleDates.has(dateKey)) return null;
      return {
        index,
        timestamp: parsed.timestamp,
        point: { at: parsed.at, value: numericValue(row.readings?.[metricKey]) },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ point }) => point);
}
