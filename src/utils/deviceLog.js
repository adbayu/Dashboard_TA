const DAY_MS = 24 * 60 * 60 * 1000;
const QUICK_RANGES = new Set(['1h', '24h', '7d', '31d']);
const FALLBACK_FILENAME = 'log-perangkat.xlsx';

function readDate(value) {
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function utcTimestamp({ year, month, day, hour, minute, second = 0, millisecond = 0 }) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function validSensorCode(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{1,31}$/.test(value) ? value : '';
}

function dateParts(date, timeZone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map(part => [part.type, part.value]));
}

function parseLocalDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value || '');
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', millisecondText = '0'] = match;
  const values = [yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText.padEnd(3, '0')].map(Number);
  const [year, month, day, hour, minute, second, millisecond] = values;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  if (
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
    || hour > 23 || minute > 59 || second > 59
  ) return null;
  return { year, month, day, hour, minute, second, millisecond };
}

function sameLocalParts(left, right) {
  return ['year', 'month', 'day', 'hour', 'minute', 'second'].every(key => Number(left[key]) === Number(right[key]));
}

export function validateLogRange(from, to, now = Date.now()) {
  const fromMs = readDate(from);
  const toMs = readDate(to);
  if (fromMs === null || toMs === null || fromMs >= toMs) return 'Waktu mulai harus sebelum waktu akhir.';
  if (toMs - fromMs > 31 * DAY_MS) return 'Rentang maksimal 31 hari.';
  if (toMs > now) return 'Waktu akhir tidak boleh di masa depan.';
  return '';
}

export function getTimeZoneInfo(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, at = Date.now()) {
  let iana = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: iana }).format(new Date(at));
  } catch {
    iana = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  const localLabel = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }[iana];
  if (localLabel) return { iana, label: localLabel };

  let offset = 'GMT+0';
  try {
    offset = new Intl.DateTimeFormat('en', { timeZone: iana, timeZoneName: 'longOffset' })
      .formatToParts(new Date(at)).find(part => part.type === 'timeZoneName')?.value || offset;
  } catch {
    // Zona bawaan browser tetap dipakai sebagai cadangan yang sudah dikenal.
  }
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset);
  const label = match
    ? `GMT${match[1]}${Number(match[2])}${Number(match[3]) ? `:${match[3]}` : ''}`
    : offset === 'GMT' ? 'GMT+0' : offset;
  return { iana, label };
}

export function localDateTimeToUtc(value, timeZone) {
  const local = parseLocalDateTime(value);
  if (!local) return '';

  if (!timeZone) {
    const date = new Date(0);
    date.setFullYear(local.year, local.month - 1, local.day);
    date.setHours(local.hour, local.minute, local.second, local.millisecond);
    if (
      date.getFullYear() !== local.year || date.getMonth() !== local.month - 1 || date.getDate() !== local.day
      || date.getHours() !== local.hour || date.getMinutes() !== local.minute || date.getSeconds() !== local.second
    ) return '';
    return date.toISOString();
  }

  try {
    const target = utcTimestamp(local);
    let instant = target;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = dateParts(new Date(instant), timeZone);
      const represented = utcTimestamp({
        year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
        hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
      });
      const next = target - (represented - Math.floor(instant / 1000) * 1000);
      if (next === instant) break;
      instant = next;
    }
    const result = new Date(instant);
    if (!sameLocalParts(dateParts(result, timeZone), local)) return '';
    return result.toISOString();
  } catch {
    return '';
  }
}

export function utcToLocalDateTime(value, timeZone) {
  const timestamp = readDate(value);
  if (timestamp === null) return '';
  const date = new Date(timestamp);
  let parts;
  try {
    parts = timeZone
      ? dateParts(date, timeZone)
      : {
        year: date.getFullYear(), month: String(date.getMonth() + 1).padStart(2, '0'), day: String(date.getDate()).padStart(2, '0'),
        hour: String(date.getHours()).padStart(2, '0'), minute: String(date.getMinutes()).padStart(2, '0'),
      };
  } catch {
    return '';
  }
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function rangeForQuickFilter(range, now = Date.now()) {
  const duration = { '1h': 60 * 60 * 1000, '24h': DAY_MS, '7d': 7 * DAY_MS, '31d': 31 * DAY_MS }[range];
  if (!duration) return null;
  return { from: new Date(now - duration).toISOString(), to: new Date(now).toISOString() };
}

export function loadedRowsAnnouncement(count) {
  const loaded = Number(count);
  if (!Number.isFinite(loaded) || loaded <= 0) return '';
  return `${Math.floor(loaded)} baris dimuat`;
}

export function parseLogQuery(search = '', now = Date.now()) {
  const query = new URLSearchParams(String(search).replace(/^\?/, ''));
  const sensor = validSensorCode(query.get('sensor'));
  const range = query.get('range');
  if (QUICK_RANGES.has(range)) return { range, sensor };

  const from = readDate(query.get('from'));
  const to = readDate(query.get('to'));
  if (from !== null && to !== null && !validateLogRange(from, to, now)) {
    return { range: 'custom', from: new Date(from).toISOString(), to: new Date(to).toISOString(), sensor };
  }
  return { range: '24h', sensor };
}

export function serializeLogQuery(filters = {}) {
  const query = new URLSearchParams();
  if (QUICK_RANGES.has(filters.range)) query.set('range', filters.range);
  else if (filters.range === 'custom') {
    const from = readDate(filters.from);
    const to = readDate(filters.to);
    if (from !== null && to !== null) {
      query.set('from', new Date(from).toISOString());
      query.set('to', new Date(to).toISOString());
    }
  }
  const sensor = validSensorCode(filters.sensor);
  if (sensor) query.set('sensor', sensor);
  return query.toString();
}

function safeFilename(value) {
  const basename = String(value || '').replace(/\\/g, '/').split('/').at(-1) || '';
  const cleaned = [...basename].filter(character => {
    const code = character.charCodeAt(0);
    return code >= 0x20 && code !== 0x7f;
  }).join('').replace(/[<>:"|?*]/g, '_').trim();
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : FALLBACK_FILENAME;
}

export function parseContentDispositionFilename(value) {
  const header = String(value || '');
  const extended = /(?:^|;)\s*filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(header);
  if (extended) {
    const encoded = (extended[1] ?? extended[2] ?? '').trim().replace(/^UTF-8''/i, '');
    try {
      const decoded = decodeURIComponent(encoded);
      if (decoded) return safeFilename(decoded);
    } catch {
      // Use the ordinary filename parameter when the extended value is malformed.
    }
  }

  const ordinary = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]*))/i.exec(header);
  if (!ordinary) return FALLBACK_FILENAME;
  return safeFilename((ordinary[1] ?? ordinary[2] ?? '').replace(/\\(["\\])/g, '$1').trim());
}

export function getExportButtonState({ source = 'api', total, validationError = '', status = 'ready', error = '', filename = '' } = {}) {
  if (status === 'pending') return { disabled: true, reason: '', message: 'Menyiapkan file...', retry: false };
  if (status === 'success') return { disabled: false, reason: '', message: `File ${filename || FALLBACK_FILENAME} sudah diunduh.`, retry: false };
  if (status === 'failure') return { disabled: false, reason: '', message: error || 'Ekspor tidak dapat disiapkan.', retry: true };
  if (status === 'aborted') return { disabled: false, reason: '', message: '', retry: false };

  let reason = '';
  if (source === 'local') reason = 'Ekspor butuh backend';
  else if (validationError) reason = validationError;
  else if (total === null || total === undefined) reason = 'Jumlah sampel belum tersedia.';
  else if (Number(total) === 0) reason = 'Tidak ada sampel pada rentang ini.';
  else if (Number(total) > 200_000) reason = 'Batas ekspor adalah 200.000 sampel.';
  return { disabled: Boolean(reason), reason, message: '', retry: false };
}
