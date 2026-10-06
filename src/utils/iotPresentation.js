const EVENT_LABELS = {
  online: 'Terhubung kembali',
  offline: 'Tidak terhubung',
};

export function sortEventsByIdDescending(events = []) {
  const parseId = event => {
    const id = event?.id;
    if (id === null || id === undefined || !/^\d+$/.test(String(id))) return null;
    return BigInt(id);
  };

  return [...events].sort((left, right) => {
    const leftId = parseId(left);
    const rightId = parseId(right);
    if (leftId === null) return rightId === null ? 0 : 1;
    if (rightId === null) return -1;
    return leftId > rightId ? -1 : leftId < rightId ? 1 : 0;
  });
}

export function formatSensorNumber(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
  const precision = Math.max(0, Math.min(8, Number(decimals) || 0));
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Number(value));
}

export function getSensorState(value, threshold) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'unknown';
  if (!threshold || (threshold.low == null && threshold.high == null)) return 'unknown';
  if (threshold.low != null && Number(value) < threshold.low) return 'low';
  if (threshold.high != null && Number(value) > threshold.high) return 'high';
  return 'normal';
}

export function mergeLatestReading(latest, frame) {
  if (!latest || !Array.isArray(latest.readings) || !frame?.readings) return latest;
  return {
    ...latest,
    measuredAt: frame.measuredAt || latest.measuredAt,
    readings: latest.readings.map(reading => {
      const value = frame.readings[reading.sensor];
      if (typeof value !== 'number' || !Number.isFinite(value)) return reading;
      return { ...reading, value, state: getSensorState(value, reading.threshold) };
    }),
  };
}

export function resolveTelemetrySnapshot({
  sensors,
  latestResult,
  eventResult,
  historyResults,
  previousLatest,
  previousEvents,
  previousHistory,
}) {
  const message = (result, fallback) => result?.reason?.message || fallback;
  const latestError = latestResult?.status === 'rejected' ? message(latestResult, 'Pembacaan sensor tidak dapat dimuat.') : '';
  const eventsError = eventResult?.status === 'rejected' ? message(eventResult, 'Kejadian tidak dapat dimuat.') : '';
  const latest = latestResult?.status === 'fulfilled' ? latestResult.value : previousLatest;
  const events = eventResult?.status === 'fulfilled' ? eventResult.value.events || [] : previousEvents;
  const history = {};
  const historyErrors = {};

  for (const [index, sensor] of sensors.entries()) {
    const result = historyResults[index];
    if (result?.status === 'fulfilled') history[sensor.code] = result.value;
    else {
      if (result?.status === 'rejected') {
        historyErrors[sensor.code] = message(result, `Riwayat ${sensor.name || sensor.code} tidak dapat dimuat.`);
      }
      if (previousHistory[sensor.code]) history[sensor.code] = previousHistory[sensor.code];
    }
  }

  return {
    latest,
    latestError,
    events,
    eventsError,
    history,
    historyErrors,
    error: [latestError, eventsError, ...Object.values(historyErrors)].filter(Boolean).join(' '),
  };
}

export function formatThreshold(threshold, unit = '', decimals = 2) {
  if (!threshold || (threshold.low == null && threshold.high == null)) return 'Ambang belum tersedia';
  const low = threshold.low == null ? 'tanpa batas bawah' : formatSensorNumber(threshold.low, decimals);
  const high = threshold.high == null ? 'tanpa batas atas' : formatSensorNumber(threshold.high, decimals);
  const bounds = `${low} sampai ${high}${unit ? ` ${unit}` : ''}`;
  const source = threshold.source === 'area' ? 'ambang area' : 'ambang bawaan';
  return `${bounds} · ${source}`;
}

export function formatMeasuredAt(value, now = Date.now()) {
  if (!value) return 'Belum ada data';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Belum ada data';
  const seconds = Math.round((timestamp - now) / 1000);
  const unit = Math.abs(seconds) < 60 ? 'second'
    : Math.abs(seconds) < 3600 ? 'minute'
      : Math.abs(seconds) < 86400 ? 'hour'
        : 'day';
  const amount = unit === 'second' ? seconds
    : unit === 'minute' ? Math.round(seconds / 60)
      : unit === 'hour' ? Math.round(seconds / 3600)
        : Math.round(seconds / 86400);
  const relative = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })
    .format(amount, unit)
    .replace(' yang lalu', ' lalu');
  return `Diukur ${relative}`;
}

export function isMeasurementStale(value, now = Date.now()) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && now - timestamp > 90_000;
}

export function summarizeHistory(points = []) {
  const valid = points.filter(point => Number.isFinite(Number(point.avg))
    && Number.isFinite(Number(point.min)) && Number.isFinite(Number(point.max)));
  if (!valid.length) return { latest: null, min: null, max: null, count: 0 };
  return {
    latest: Number(valid.at(-1).avg),
    min: Math.min(...valid.map(point => Number(point.min))),
    max: Math.max(...valid.map(point => Number(point.max))),
    count: valid.length,
  };
}

export function formatEventMessage(event, sensorNames = {}) {
  if (EVENT_LABELS[event?.type]) return EVENT_LABELS[event.type];
  const sensor = sensorNames[event?.sensor] || event?.sensor || 'Sensor';
  const value = event?.value == null ? '' : `: ${formatSensorNumber(event.value, 2).replace(/,?0+$/, '')}`;
  if (event?.type === 'threshold_low') return `${sensor} di bawah ambang${value}`;
  if (event?.type === 'threshold_high') return `${sensor} di atas ambang${value}`;
  if (event?.type === 'threshold_clear') return `${sensor} kembali normal${value}`;
  return `Kejadian tidak dikenal: ${event?.type || 'tanpa jenis'}`;
}
