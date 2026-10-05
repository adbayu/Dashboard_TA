import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIotApi, parseIotInput, resolveIotSource, sanitizePublicPreview } from './iotApi.js';

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

test('mode local hanya menyediakan data contoh baca-saja untuk Kelola IoT', async () => {
  const api = createIotApi({ source: 'local' });

  assert.equal(api.canWrite, false);
  assert.throws(() => api.createDevice({ typeCode: 'AQ-X', name: 'Probe' }), /mode API/);
});
