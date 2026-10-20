import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIotApi, parseIotInput, resolveIotSource, sanitizePublicPreview } from './iotApi.js';
import { iotRequestGovernor } from './iotRequestGovernor.js';

test('sumber IoT bawaan API dan menolak nilai konfigurasi yang tidak dikenal', () => {
  assert.equal(resolveIotSource(), 'api');
  assert.equal(resolveIotSource('local'), 'local');
  assert.throws(() => resolveIotSource('fallback'), /VITE_IOT_SOURCE/);
});

test('QR berupa URL klaim mempertahankan kode aktivasi hanya pada URL tujuan', () => {
  assert.deepEqual(parseIotInput('https://farm.example/d/AQ-PKT-001?c=activation-secret'), {
    kind: 'claim',
    path: '/d/AQ-PKT-001?c=activation-secret',
  });
  assert.deepEqual(parseIotInput('AQ-PKT-001'), { kind: 'code', code: 'AQ-PKT-001' });
});

test('pratinjau publik hanya mengembalikan field yang diizinkan kontrak QR', () => {
  const preview = sanitizePublicPreview({
    code: 'AQ-PKT-001',
    name: 'Perangkat contoh',
    type: { code: 'AQ-WATER', kind: 'paket', id: 'private-type-id' },
    sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', label: 'Probe pH', threshold: { low: 6, high: 8 } }],
    claimed: true,
    activationValid: false,
    areaRef: 'AR-01',
    ownerId: 'user-private-id',
    activationCode: 'activation-secret',
    readings: [{ value: 7 }],
  });

  assert.deepEqual(preview, {
    code: 'AQ-PKT-001',
    name: 'Perangkat contoh',
    type: { code: 'AQ-WATER', kind: 'paket' },
    sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', label: 'Probe pH' }],
    claimed: true,
    activationValid: false,
    areaRef: 'AR-01',
  });
});

test('kegagalan API diteruskan tanpa mengganti respons dengan data lokal', async () => {
  const failure = new Error('Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
  const api = createIotApi({ source: 'api', request: async () => { throw failure; } });

  await assert.rejects(api.getDevices(), error => error === failure);
});

test('adapter API memakai route pratinjau dan klaim yang sudah tersedia', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    if (path.startsWith('/v1/devices?code=')) return { device: { code: 'AQ-PKT-001', name: 'Unit', type: { code: 'AQ-WATER', kind: 'paket' }, sensors: [], claimed: false, activationValid: true } };
    if (path === '/v1/devices/claim') return { deviceId: 'device-id' };
    throw new Error(`Route tak dikenal: ${path}`);
  };
  const api = createIotApi({ source: 'api', request });

  await api.getQrPreview('AQ-PKT-001', 'activation-secret');
  await api.claimDevice('AQ-PKT-001', 'activation-secret');

  assert.equal(calls[0].path, '/v1/devices?code=AQ-PKT-001&c=activation-secret');
  assert.deepEqual(calls[1], {
    path: '/v1/devices/claim',
    options: { method: 'POST', body: { code: 'AQ-PKT-001', activationCode: 'activation-secret' } },
  });
});

test('mode local menandai data contoh dan dapat memulihkan mutasi dalam memori', async () => {
  const api = createIotApi({ source: 'local' });
  const initial = await api.getDevices({ userId: 'user-1' });
  assert.equal(initial.label, 'Data contoh');

  await api.claimDevice('AQ-CONTOH-001', 'contoh-kode-aktivasi', 'user-1');
  assert.equal((await api.getQrPreview('AQ-CONTOH-001')).device.claimed, true);

  api.resetLocalData();
  assert.equal((await api.getQrPreview('AQ-CONTOH-001')).device.claimed, false);
});

test('adapter API menjalankan CRUD sesuai route yang tersedia dan mengirim kode aktivasi hanya di body QR', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return { ok: true };
  };
  const binaryCalls = [];
  const fetchBinary = async (url, options) => {
    binaryCalls.push({ url, options });
    return { ok: true, blob: async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }) };
  };
  const api = createIotApi({ source: 'api', request, fetchBinary });

  await api.createDevice({ typeCode: 'AQ-PH', name: 'Probe', areaRef: 'Kolam 2' });
  await api.patchDevice('device/id', { name: 'Probe baru' });
  await api.reissueActivationCode('device/id');
  await api.createDeviceType({ code: 'AQ-X', name: 'Tipe X', kind: 'satuan', sensors: [{ code: 'ph', label: 'pH' }] });
  await api.patchDeviceType('type/id', { active: false });
  await api.createSensorType({ code: 'oxygen', name: 'Oksigen', unit: 'mg/L', min: 0, max: 20 });
  await api.patchSensorType('oxygen', { name: 'Oksigen terlarut' });
  await api.deleteSensorType('oxygen');
  await api.getQrImage('device/id', 'activation-secret', 'png');

  assert.deepEqual(calls.map(({ path, options }) => [path, options.method, options.body]), [
    ['/v1/devices', 'POST', { typeCode: 'AQ-PH', name: 'Probe', areaRef: 'Kolam 2' }],
    ['/v1/devices/device%2Fid', 'PATCH', { name: 'Probe baru' }],
    ['/v1/devices/device%2Fid/activation', 'POST', undefined],
    ['/v1/device-types', 'POST', { code: 'AQ-X', name: 'Tipe X', kind: 'satuan', sensors: [{ code: 'ph', label: 'pH' }] }],
    ['/v1/device-types/type%2Fid', 'PATCH', { active: false }],
    ['/v1/sensor-types', 'POST', { code: 'oxygen', name: 'Oksigen', unit: 'mg/L', min: 0, max: 20 }],
    ['/v1/sensor-types/oxygen', 'PATCH', { name: 'Oksigen terlarut' }],
    ['/v1/sensor-types/oxygen', 'DELETE', undefined],
  ]);
  assert.equal(binaryCalls[0].url, '/api/v1/devices/device%2Fid/qr?format=png');
  assert.equal(binaryCalls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(binaryCalls[0].options.body), { activationCode: 'activation-secret' });
  assert.equal(api.canWrite, true);
});

test('adapter API membaca latest, histori, kejadian, dan merotasi credential sesuai kontrak', async () => {
  const calls = [];
  const responses = new Map([
    ['/v1/devices/device%2Fid/latest', { measuredAt: '2026-10-06T08:00:00.000Z', readings: [{ sensor: 'ph', value: 7.1, state: 'normal', threshold: { low: 6.2, high: 7.6, source: 'area' } }] }],
    ['/v1/devices/device%2Fid/readings?sensor=water_temperature&from=2026-10-05T08%3A00%3A00.000Z&to=2026-10-06T08%3A00%3A00.000Z&bucket=5m', { sensor: 'water_temperature', bucket: '5m', points: [], threshold: { low: 23.5, high: 30.5, source: 'default' } }],
    ['/v1/events?deviceId=device%2Fid&limit=10&cursor=abc%2F123', { events: [{ id: '12', deviceId: 'device/id', type: 'online', at: '2026-10-06T08:00:00.000Z' }], nextCursor: null }],
    ['/v1/devices/device%2Fid/credentials/rotate', { credential: 'a'.repeat(64), credentialSince: '2026-10-06T08:05:00.000Z' }],
  ]);
  const request = async (path, options) => {
    calls.push({ path, options });
    if (!responses.has(path)) throw new Error(`Route tak dikenal: ${path}`);
    return responses.get(path);
  };
  const api = createIotApi({ source: 'api', request });

  const latest = await api.getDeviceLatest('device/id');
  const history = await api.getDeviceReadings('device/id', {
    sensor: 'water_temperature',
    from: '2026-10-05T08:00:00.000Z',
    to: '2026-10-06T08:00:00.000Z',
  });
  const events = await api.getDeviceEvents('device/id', { limit: 10, cursor: 'abc/123' });
  const rotation = await api.rotateDeviceCredential('device/id');

  assert.deepEqual(latest.readings[0].threshold, { low: 6.2, high: 7.6, source: 'area' });
  assert.deepEqual(history.points, []);
  assert.equal(events.events[0].type, 'online');
  assert.equal(rotation.credential, 'a'.repeat(64));
  assert.deepEqual(calls, [
    { path: '/v1/devices/device%2Fid/latest', options: undefined },
    { path: '/v1/devices/device%2Fid/readings?sensor=water_temperature&from=2026-10-05T08%3A00%3A00.000Z&to=2026-10-06T08%3A00%3A00.000Z&bucket=5m', options: undefined },
    { path: '/v1/events?deviceId=device%2Fid&limit=10&cursor=abc%2F123', options: undefined },
    { path: '/v1/devices/device%2Fid/credentials/rotate', options: { method: 'POST' } },
  ]);
});

test('adapter E2 memakai overview, filter log kejadian, daftar sandbox, dan skenario yang sudah ada', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return { sensor: 'ph', items: [], events: [], devices: [], scenario: 'ph_turun' };
  };
  const api = createIotApi({ source: 'api', request });

  await api.getDeviceList();
  await api.getSensorOverview('ph');
  await api.getEvents({ deviceId: 'device/id', type: 'threshold_low', cursor: 'MTA=', limit: 25 });
  await api.getSandboxDevices();
  await api.setSandboxScenario('sandbox/id', 'ph_turun');

  assert.deepEqual(calls, [
    { path: '/v1/devices', options: undefined },
    { path: '/v1/sensors/ph/overview', options: undefined },
    { path: '/v1/events?deviceId=device%2Fid&type=threshold_low&limit=25&cursor=MTA%3D', options: undefined },
    { path: '/v1/sandbox/devices', options: undefined },
    { path: '/v1/sandbox/devices/sandbox%2Fid/scenario', options: { method: 'PUT', body: { scenario: 'ph_turun' } } },
  ]);
});

test('adapter mengirim pembacaan JSON dan biner melalui governor dengan prioritas yang tepat', async () => {
  const priorities = [];
  const calls = [];
  const governor = {
    async run(operation, options) {
      priorities.push(options.priority);
      return operation(options.signal);
    },
    observeResponse() {},
  };
  const request = async (path, options) => {
    calls.push({ path, options });
    return { ok: true };
  };
  const api = createIotApi({
    source: 'api',
    request,
    governor,
    fetchBinary: async (_url, options) => {
      calls.push({ path: 'binary', options });
      return { ok: true, blob: async () => new Blob(['image']) };
    },
  });

  await api.getSensorOverview('ph');
  await api.getDeviceReadings('device-1', {
    sensor: 'ph',
    from: '2026-10-06T00:00:00.000Z',
    to: '2026-10-07T00:00:00.000Z',
    priority: 'area',
  });
  await api.createDevice({ typeCode: 'AQ-PH', name: 'Probe' });
  await api.getQrImage('device-1', 'activation-secret', 'png');

  assert.deepEqual(priorities, ['latest', 'area', 'user', 'user']);
  assert.equal(calls.length, 4);
  assert.equal(calls.at(-1).options.credentials, 'same-origin');
});

test('adapter dengan request khusus memakai governor bersama kecuali governor diinjeksikan', async () => {
  const originalRun = iotRequestGovernor.run;
  const sharedPriorities = [];
  const injectedPriorities = [];
  iotRequestGovernor.run = async (operation, options) => {
    sharedPriorities.push(options.priority);
    return operation(options.signal);
  };

  try {
    const request = async () => ({ devices: [] });
    const sharedApi = createIotApi({ source: 'api', request });
    await sharedApi.getDeviceList();

    const injectedApi = createIotApi({
      source: 'api',
      request,
      governor: {
        async run(operation, options) {
          injectedPriorities.push(options.priority);
          return operation(options.signal);
        },
      },
    });
    await injectedApi.getDeviceList();

    assert.deepEqual(sharedPriorities, ['latest']);
    assert.deepEqual(injectedPriorities, ['latest']);
  } finally {
    iotRequestGovernor.run = originalRun;
  }
});

test('mode local tidak membuat telemetri atau credential dan menolak rotasi', async () => {
  const api = createIotApi({ source: 'local' });
  const latest = await api.getDeviceLatest('contoh-device-01');
  const history = await api.getDeviceReadings('contoh-device-01', {
    sensor: 'ph',
    from: '2026-10-05T08:00:00.000Z',
    to: '2026-10-06T08:00:00.000Z',
  });
  const events = await api.getDeviceEvents('contoh-device-01');

  assert.equal(latest.measuredAt, null);
  assert.equal(latest.readings[0].value, null);
  assert.deepEqual(history.points, []);
  assert.deepEqual(events.events, []);
  assert.throws(() => api.rotateDeviceCredential('contoh-device-01'), /mode API/);
});

test('adapter mempertahankan status dan pesan error server saat rotasi credential gagal', async () => {
  for (const [status, message] of [[409, 'Device belum diprovisioning.'], [404, 'Device tidak ditemukan.']]) {
    const failure = Object.assign(new Error(message), { status });
    const api = createIotApi({ source: 'api', request: async () => { throw failure; } });

    await assert.rejects(api.rotateDeviceCredential('device-1'), error => {
      assert.equal(error.status, status);
      assert.equal(error.message, message);
      return true;
    });
  }
});

test('mode local hanya menyediakan data contoh baca-saja untuk Kelola IoT', async () => {
  const api = createIotApi({ source: 'local' });

  assert.equal(api.canWrite, false);
  assert.throws(() => api.createDevice({ typeCode: 'AQ-X', name: 'Probe' }), /mode API/);
});

test('adapter mengambil halaman pertama log mentah dengan filter, cursor, dan metadata', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return {
      bucket: 'raw',
      total: 1,
      points: [{ messageId: 'message-1', measuredAt: '2026-10-15T10:00:00.000Z', receivedAt: '2026-10-15T10:00:02.000Z', readings: [] }],
      nextCursor: null,
      device: { name: 'Probe', code: 'AQ-PH-001', type: { code: 'AQ-PH', kind: 'satuan' }, status: 'online', hasReadings: true, sensors: [] },
      thresholds: [],
    };
  };
  const api = createIotApi({ source: 'api', request });

  const result = await api.getDeviceLog('device/id', {
    from: '2026-10-14T10:00:00.000Z',
    to: '2026-10-15T10:00:00.000Z',
    sensor: 'ph',
    cursor: 'cursor/1',
    limit: 50,
  });

  assert.equal(result.device.name, 'Probe');
  assert.equal(result.points[0].messageId, 'message-1');
  assert.equal(calls[0].path, '/v1/devices/device%2Fid/readings?bucket=raw&from=2026-10-14T10%3A00%3A00.000Z&to=2026-10-15T10%3A00%3A00.000Z&sensor=ph&cursor=cursor%2F1&limit=50');
});

test('mode local log hanya mengembalikan metadata Data contoh tanpa telemetry', async () => {
  const api = createIotApi({ source: 'local' });
  const result = await api.getDeviceLog('contoh-device-01', {
    from: '2026-10-14T10:00:00.000Z',
    to: '2026-10-15T10:00:00.000Z',
  });

  assert.equal(result.label, 'Data contoh');
  assert.equal(result.device.code, 'AQ-CONTOH-001');
  assert.equal(result.device.hasReadings, false);
  assert.deepEqual(result.points, []);
  assert.equal(result.total, 0);
  await assert.rejects(api.exportDeviceLog('contoh-device-01', {
    from: '2026-10-14T10:00:00.000Z',
    to: '2026-10-15T10:00:00.000Z',
    tz: 'Asia/Jakarta',
  }), /Ekspor butuh backend/);
});

test('ekspor log memakai same-origin, governor, zona, dan nama file respons yang aman', async () => {
  const calls = [];
  const priorities = [];
  const api = createIotApi({
    source: 'api',
    request: async () => ({}),
    governor: {
      async run(operation, options) {
        priorities.push(options.priority);
        return operation(options.signal);
      },
      observeResponse() {},
    },
    fetchBinary: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        headers: { get: name => name.toLowerCase() === 'content-disposition' ? 'attachment; filename="log-AQ-PH-001.xlsx"' : null },
        blob: async () => new Blob(['xlsx']),
      };
    },
  });

  const result = await api.exportDeviceLog('device/id', {
    from: '2026-10-14T10:00:00.000Z',
    to: '2026-10-15T10:00:00.000Z',
    sensor: 'ph',
    tz: 'Asia/Jakarta',
  });

  assert.equal(priorities[0], 'history');
  assert.match(calls[0].url, /^\/api\/v1\/devices\/device%2Fid\/readings\/export\?/);
  assert.equal(new URL(calls[0].url, 'https://example.test').searchParams.get('tz'), 'Asia/Jakarta');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(result.filename, 'log-AQ-PH-001.xlsx');
  assert.equal(await result.blob.text(), 'xlsx');
});

test('ekspor meneruskan pesan JSON backend dan membatalkan fetch saat sinyal halaman dibatalkan', async () => {
  const failed = createIotApi({
    source: 'api',
    request: async () => ({}),
    fetchBinary: async () => ({
      ok: false,
      status: 413,
      headers: { get: () => null },
      json: async () => ({ error: { message: 'Jumlah data melebihi batas ekspor.' } }),
    }),
  });
  await assert.rejects(failed.exportDeviceLog('device-1', {
    from: '2026-10-14T10:00:00.000Z', to: '2026-10-15T10:00:00.000Z', tz: 'Asia/Jakarta',
  }), error => error.status === 413 && error.message === 'Jumlah data melebihi batas ekspor.');

  const controller = new AbortController();
  const cancelled = createIotApi({
    source: 'api',
    request: async () => ({}),
    fetchBinary: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }),
  });
  const pending = cancelled.exportDeviceLog('device-1', {
    from: '2026-10-14T10:00:00.000Z', to: '2026-10-15T10:00:00.000Z', tz: 'Asia/Jakarta', signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
});
