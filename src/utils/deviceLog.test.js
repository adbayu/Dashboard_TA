import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getExportButtonState,
  getTimeZoneInfo,
  loadedRowsAnnouncement,
  localDateTimeToUtc,
  parseContentDispositionFilename,
  parseLogQuery,
  rangeForQuickFilter,
  serializeLogQuery,
  utcToLocalDateTime,
  validateLogRange,
} from './deviceLog.js';

const dayMs = 24 * 60 * 60 * 1000;

test('announces initial rows once and leaves an empty first page silent', () => {
  assert.equal(loadedRowsAnnouncement(50), '50 baris dimuat');
  assert.equal(loadedRowsAnnouncement(0), '');
});

test('validates ordered ranges, the 31-day maximum, and future end times', () => {
  const now = Date.parse('2026-10-15T12:00:00.000Z');

  assert.equal(validateLogRange('2026-10-14T12:00:00.000Z', '2026-10-15T12:00:00.000Z', now), '');
  assert.equal(validateLogRange(now, now - 1, now), 'Waktu mulai harus sebelum waktu akhir.');
  assert.equal(validateLogRange(now - 31 * dayMs - 1, now, now), 'Rentang maksimal 31 hari.');
  assert.equal(validateLogRange(now - 1, now + 1, now), 'Waktu akhir tidak boleh di masa depan.');
});

test('maps Indonesian time zones and labels other recognized zones by GMT offset', () => {
  assert.deepEqual(getTimeZoneInfo('Asia/Jakarta'), { iana: 'Asia/Jakarta', label: 'WIB' });
  assert.deepEqual(getTimeZoneInfo('Asia/Makassar'), { iana: 'Asia/Makassar', label: 'WITA' });
  assert.deepEqual(getTimeZoneInfo('Asia/Jayapura'), { iana: 'Asia/Jayapura', label: 'WIT' });
  assert.deepEqual(getTimeZoneInfo('Asia/Kathmandu'), { iana: 'Asia/Kathmandu', label: 'GMT+5:45' });
  assert.deepEqual(getTimeZoneInfo('Etc/UTC'), { iana: 'Etc/UTC', label: 'GMT+0' });
});

test('converts between local datetime inputs and UTC using the selected IANA zone', () => {
  const utc = localDateTimeToUtc('2026-10-15T12:30', 'Asia/Jakarta');
  assert.equal(utc, '2026-10-15T05:30:00.000Z');
  assert.equal(utcToLocalDateTime(utc, 'Asia/Jakarta'), '2026-10-15T12:30');
  assert.equal(localDateTimeToUtc('2026-10-15T12:30', 'Invalid/Zone'), '');
});

test('serializes and restores applied quick and custom filters without draft values', () => {
  const custom = {
    range: 'custom',
    from: '2026-10-14T00:00:00.000Z',
    to: '2026-10-15T00:00:00.000Z',
    sensor: 'water_temperature',
  };
  const customQuery = serializeLogQuery(custom);
  assert.deepEqual(parseLogQuery(`?${customQuery}`), custom);

  const quickQuery = serializeLogQuery({ range: '24h', sensor: 'ph' });
  assert.equal(quickQuery, 'range=24h&sensor=ph');
  assert.deepEqual(parseLogQuery(`?${quickQuery}`), { range: '24h', sensor: 'ph' });
  assert.equal(serializeLogQuery({ range: '24h', sensor: '' }), 'range=24h');
  assert.equal(serializeLogQuery({ range: '24h', sensor: 'credential-secret' }), 'range=24h');
  assert.deepEqual(parseLogQuery('?range=24h&sensor=credential-secret'), { range: '24h', sensor: '' });
});

test('defaults to the applied 24-hour range and computes quick ranges from one UTC instant', () => {
  const now = Date.parse('2026-10-15T12:00:00.000Z');
  assert.deepEqual(parseLogQuery('', now), { range: '24h', sensor: '' });
  assert.deepEqual(rangeForQuickFilter('1h', now), {
    from: '2026-10-15T11:00:00.000Z', to: '2026-10-15T12:00:00.000Z',
  });
  assert.deepEqual(rangeForQuickFilter('31d', now), {
    from: '2026-09-14T12:00:00.000Z', to: '2026-10-15T12:00:00.000Z',
  });
});

test('parses quoted and RFC 5987 filenames into safe basenames', () => {
  assert.equal(parseContentDispositionFilename('attachment; filename="sensor log.xlsx"'), 'sensor log.xlsx');
  assert.equal(parseContentDispositionFilename("attachment; filename=\"fallback.xlsx\"; filename*=UTF-8''log-%E2%9C%93.xlsx"), 'log-✓.xlsx');
  assert.equal(parseContentDispositionFilename('attachment; filename="..\\private\\log.xlsx"'), 'log.xlsx');
  assert.equal(parseContentDispositionFilename('attachment; filename="folder\\a:b.xlsx"'), 'a_b.xlsx');
  assert.equal(parseContentDispositionFilename('inline'), 'log-perangkat.xlsx');
});

test('describes export disabled, pending, success, failure, and aborted states', () => {
  assert.equal(getExportButtonState({ source: 'local', total: 4 }).reason, 'Ekspor butuh backend');
  assert.equal(getExportButtonState({ source: 'api', total: 0 }).reason, 'Tidak ada sampel pada rentang ini.');
  assert.equal(getExportButtonState({ source: 'api', total: 200_001 }).reason, 'Batas ekspor adalah 200.000 sampel.');
  assert.equal(getExportButtonState({ source: 'api', total: 2, validationError: 'Rentang maksimal 31 hari.' }).reason, 'Rentang maksimal 31 hari.');

  assert.deepEqual(getExportButtonState({ source: 'api', total: 2, status: 'pending' }), {
    disabled: true, reason: '', message: 'Menyiapkan file...', retry: false,
  });
  assert.deepEqual(getExportButtonState({ source: 'api', total: 2, status: 'success', filename: 'log.xlsx' }), {
    disabled: false, reason: '', message: 'File log.xlsx sudah diunduh.', retry: false,
  });
  assert.deepEqual(getExportButtonState({ source: 'api', total: 2, status: 'failure', error: 'Batas ekspor tercapai.' }), {
    disabled: false, reason: '', message: 'Batas ekspor tercapai.', retry: true,
  });
  assert.deepEqual(getExportButtonState({ source: 'api', total: 2, status: 'aborted' }), {
    disabled: false, reason: '', message: '', retry: false,
  });
});
