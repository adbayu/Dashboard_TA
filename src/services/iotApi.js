import { pilotApi } from './pilotApi.js';

const DATA_CONTOH = 'Data contoh';
const KODE_AKTIVASI_CONTOH = 'contoh-kode-aktivasi';
const DEVICE_CONTOH = {
  id: 'contoh-device-01',
  code: 'AQ-CONTOH-001',
  name: 'Sensor kualitas air contoh',
  type: { code: 'AQ-CONTOH', kind: 'satuan', name: 'Sensor contoh' },
  status: 'offline',
  lastMeasuredAt: null,
  lastReceivedAt: null,
  firmware: null,
  rssi: null,
  calibratedAt: null,
  sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', label: 'Probe pH', decimals: 2, threshold: null }],
  claimed: false,
  activationValid: false,
  ownerId: null,
};

export function resolveIotSource(value = import.meta.env?.VITE_IOT_SOURCE) {
  const source = value?.trim() || 'api';
  if (source !== 'api' && source !== 'local') {
    throw new Error('VITE_IOT_SOURCE harus bernilai "api" atau "local".');
  }
  return source;
}

export const IOT_SOURCE = resolveIotSource();

export function parseIotInput(value) {
  const input = (value || '').trim();
  if (!input) return { kind: 'empty' };

  if (/^(https?:\/\/|\/)/i.test(input)) {
    try {
      const url = new URL(input, 'https://jagofarm.invalid');
      const match = /^\/d\/([^/]+)\/?$/.exec(url.pathname);
      if (!match) return { kind: 'invalid' };
      const code = decodeURIComponent(match[1]);
      const activationCode = url.searchParams.get('c');
      const query = activationCode ? `?c=${encodeURIComponent(activationCode)}` : '';
      return { kind: 'claim', path: `/d/${encodeURIComponent(code)}${query}` };
    } catch {
      return { kind: 'invalid' };
    }
  }

  return { kind: 'code', code: input };
}

export function sanitizePublicPreview(device) {
  if (!device) return null;
  return {
    code: device.code,
    name: device.name,
    type: device.type ? { code: device.type.code, kind: device.type.kind } : null,
    sensors: Array.isArray(device.sensors)
      ? device.sensors.map(sensor => ({
        code: sensor.code,
        name: sensor.name,
        unit: sensor.unit,
        label: sensor.label,
      }))
      : [],
    claimed: Boolean(device.claimed),
    activationValid: Boolean(device.activationValid),
  };
}

function failedRequest(message, status = 404) {
  return Object.assign(new Error(message), { status });
}

function buildTypes(deviceTypes, sensorTypes) {
  const sensorByCode = new Map(sensorTypes.map(sensor => [sensor.code, sensor]));
  return new Map(deviceTypes.map(type => [type.code, {
    ...type,
    sensors: (type.sensors || []).map(sensor => ({
      ...sensorByCode.get(sensor.code),
      ...sensor,
      name: sensorByCode.get(sensor.code)?.name || sensor.label || sensor.code,
    })),
  }]));
}

export function createIotApi({ source = IOT_SOURCE, request = pilotApi, fetchBinary = globalThis.fetch } = {}) {
  if (source !== 'api' && source !== 'local') {
    throw new Error('Sumber IoT harus bernilai "api" atau "local".');
  }

  const buatDataContoh = () => [{ ...DEVICE_CONTOH, sensors: DEVICE_CONTOH.sensors.map(sensor => ({ ...sensor })) }];
  let exampleDevices = buatDataContoh();

  function localDevice(idOrCode) {
    return exampleDevices.find(device => device.id === idOrCode || device.code.toUpperCase() === String(idOrCode).toUpperCase());
  }

  async function getDevices({ userId } = {}) {
    if (source === 'local') {
      return {
        devices: exampleDevices
          .filter(device => !device.ownerId || !userId || device.ownerId === userId)
          .map(({ ownerId: _ownerId, ...device }) => ({ ...device, sensors: device.sensors.map(sensor => ({ ...sensor })) })),
        deviceTypes: [{
          id: 'contoh-tipe-01',
          code: 'AQ-CONTOH',
          name: 'Sensor contoh',
          kind: 'satuan',
          active: true,
          sensors: [{ code: 'ph', label: 'Probe pH' }],
        }],
        sensorTypes: [{ code: 'ph', name: 'pH Air', unit: 'pH', min: 0, max: 14, decimals: 2, warnLow: null, warnHigh: null }],
        nextCursor: null,
        source,
        label: DATA_CONTOH,
      };
    }

    const [result, typeResult, sensorResult] = await Promise.all([
      request('/v1/devices'),
      request('/v1/device-types'),
      request('/v1/sensor-types'),
    ]);
    const types = buildTypes(typeResult.deviceTypes || [], sensorResult.sensorTypes || []);
    return {
      ...result,
      devices: (result.devices || []).map(device => ({
        ...device,
        type: {
          ...device.type,
          name: types.get(device.type?.code)?.name || device.type?.code,
          sensors: types.get(device.type?.code)?.sensors || [],
        },
      })),
      deviceTypes: typeResult.deviceTypes || [],
      sensorTypes: sensorResult.sensorTypes || [],
      source,
      label: null,
    };
  }

  async function getDevice(id) {
    if (source === 'local') {
      const device = localDevice(id);
      if (!device) throw failedRequest('Device tidak ditemukan.');
      const { ownerId: _ownerId, ...visibleDevice } = device;
      return { device: { ...visibleDevice, sensors: visibleDevice.sensors.map(sensor => ({ ...sensor })) }, source, label: DATA_CONTOH };
    }

    const [result, typeResult] = await Promise.all([
      request(`/v1/devices/${encodeURIComponent(id)}`),
      request('/v1/device-types'),
    ]);
    const device = result.device;
    const type = (typeResult.deviceTypes || []).find(item => item.code === device.type?.code);
    return {
      ...result,
      device: { ...device, type: { ...device.type, name: type?.name || device.type?.code } },
      source,
      label: null,
    };
  }

  async function getDeviceLatest(id) {
    if (source === 'local') {
      const device = localDevice(id);
      if (!device) throw failedRequest('Device tidak ditemukan.');
      return {
        measuredAt: null,
        readings: device.sensors.map(sensor => ({
          sensor: sensor.code,
          value: null,
          unit: sensor.unit,
          state: 'unknown',
          threshold: sensor.threshold || null,
        })),
        source,
        label: DATA_CONTOH,
      };
    }
    return { ...(await request(`/v1/devices/${encodeURIComponent(id)}/latest`)), source, label: null };
  }

  async function getDeviceReadings(id, { sensor, from, to, bucket = '5m' } = {}) {
    if (source === 'local') {
      const device = localDevice(id);
      if (!device) throw failedRequest('Device tidak ditemukan.');
      const selected = device.sensors.find(item => item.code === sensor);
      return {
        sensor,
        bucket,
        points: [],
        threshold: selected?.threshold || null,
        nextCursor: null,
        source,
        label: DATA_CONTOH,
      };
    }
    const query = new URLSearchParams({ sensor, from, to, bucket });
    return {
      ...(await request(`/v1/devices/${encodeURIComponent(id)}/readings?${query.toString()}`)),
      source,
      label: null,
    };
  }

  async function getDeviceEvents(id, { limit = 50, cursor } = {}) {
    if (source === 'local') {
      if (!localDevice(id)) throw failedRequest('Device tidak ditemukan.');
      return { events: [], nextCursor: null, source, label: DATA_CONTOH };
    }
    const query = new URLSearchParams({ deviceId: id, limit: String(limit) });
    if (cursor) query.set('cursor', cursor);
    return { ...(await request(`/v1/events?${query.toString()}`)), source, label: null };
  }

  async function getDeviceTypes() {
    if (source === 'local') {
      return { deviceTypes: [{ code: 'AQ-CONTOH', name: 'Sensor contoh', kind: 'satuan', sensors: [{ code: 'ph', label: 'Probe pH' }] }], source, label: DATA_CONTOH };
    }
    return { ...(await request('/v1/device-types')), source, label: null };
  }

  async function getSensorTypes() {
    if (source === 'local') {
      return { sensorTypes: [{ code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2, min: null, max: null, warnLow: null, warnHigh: null }], source, label: DATA_CONTOH };
    }
    return { ...(await request('/v1/sensor-types')), source, label: null };
  }

  async function getQrPreview(code, activationCode = '') {
    if (source === 'local') {
      const device = localDevice(code);
      if (!device) throw failedRequest('Device tidak ditemukan.');
      const activationValid = !device.claimed && activationCode === KODE_AKTIVASI_CONTOH;
      return {
        device: sanitizePublicPreview({ ...device, activationValid }),
        source,
        label: DATA_CONTOH,
      };
    }

    const query = new URLSearchParams({ code });
    if (activationCode) query.set('c', activationCode);
    const result = await request(`/v1/devices?${query.toString()}`);
    return { device: sanitizePublicPreview(result.device), source, label: null };
  }

  async function claimDevice(code, activationCode, userId) {
    if (source === 'local') {
      const device = localDevice(code);
      if (!device) throw failedRequest('Device tidak ditemukan.');
      if (device.claimed) throw failedRequest('Device sudah diklaim.', 409);
      if (activationCode !== KODE_AKTIVASI_CONTOH) throw failedRequest('Kode aktivasi contoh tidak valid.', 400);
      if (!userId) throw failedRequest('Silakan masuk untuk mengklaim perangkat.', 401);
      device.claimed = true;
      device.activationValid = false;
      device.ownerId = userId;
      return { deviceId: device.id, source, label: DATA_CONTOH };
    }

    return request('/v1/devices/claim', {
      method: 'POST',
      body: { code, activationCode },
    });
  }

  function requireApiWrite() {
    if (source !== 'api') throw failedRequest('Perubahan Kelola IoT hanya tersedia dalam mode API.', 405);
  }

  async function getQrImage(id, activationCode, format = 'svg') {
    requireApiWrite();
    if (!['svg', 'png'].includes(format)) throw new TypeError('Format QR harus svg atau png.');
    let response;
    try {
      response = await fetchBinary(`/api/v1/devices/${encodeURIComponent(id)}/qr?format=${format}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationCode }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error('Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
    }
    if (!response.ok) {
      let data;
      try { data = await response.json(); } catch { data = null; }
      throw Object.assign(new Error(data?.error?.message ?? 'Permintaan gagal.'), { status: response.status });
    }
    return response.blob();
  }

  function write(path, options) {
    requireApiWrite();
    return request(path, options);
  }

  const createDevice = body => write('/v1/devices', { method: 'POST', body });
  const patchDevice = (id, body) => write(`/v1/devices/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  const reissueActivationCode = id => write(`/v1/devices/${encodeURIComponent(id)}/activation`, { method: 'POST' });
  const rotateDeviceCredential = id => write(`/v1/devices/${encodeURIComponent(id)}/credentials/rotate`, { method: 'POST' });
  const createDeviceType = body => write('/v1/device-types', { method: 'POST', body });
  const patchDeviceType = (id, body) => write(`/v1/device-types/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  const createSensorType = body => write('/v1/sensor-types', { method: 'POST', body });
  const patchSensorType = (code, body) => write(`/v1/sensor-types/${encodeURIComponent(code)}`, { method: 'PATCH', body });
  const deleteSensorType = code => write(`/v1/sensor-types/${encodeURIComponent(code)}`, { method: 'DELETE' });

  function resetLocalData() {
    if (source === 'local') exampleDevices = buatDataContoh();
  }

  return {
    canWrite: source === 'api',
    getDevices,
    getDevice,
    getDeviceLatest,
    getDeviceReadings,
    getDeviceEvents,
    getDeviceTypes,
    getSensorTypes,
    getQrPreview,
    claimDevice,
    createDevice,
    patchDevice,
    reissueActivationCode,
    rotateDeviceCredential,
    getQrImage,
    createDeviceType,
    patchDeviceType,
    createSensorType,
    patchSensorType,
    deleteSensorType,
    resetLocalData,
  };
}

export const iotApi = createIotApi();
