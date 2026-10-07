import { iotApi } from './iotApi.js';
import { iotStreamClient } from './iotStream.js';
import { mergeLatestReading } from '../utils/iotPresentation.js';

const SNAPSHOT_CACHE_MS = 5_000;
const MAX_STREAM_EVENTS = 100;
const MAX_PENDING_FRAMES = 100;

function deviceSensors(device) {
  return device?.type?.sensors || device?.sensors || [];
}

function emptySnapshot(userId = null) {
  return {
    userId,
    catalogState: 'idle',
    catalogError: '',
    latestState: 'idle',
    latestError: '',
    devices: [],
    sensorTypes: [],
    overviewBySensor: {},
    latestByDevice: {},
    deviceEvents: [],
    eventSequence: 0,
  };
}

function newestTime(left, right) {
  if (!left) return right || null;
  if (!right) return left;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && rightTime > leftTime ? right : left;
}

function mergeLatestByDevice(current, updates) {
  const merged = { ...current };
  for (const [deviceId, update] of Object.entries(updates)) {
    const previous = merged[deviceId] || { readings: [] };
    const readings = new Map((previous.readings || []).map(reading => [reading.sensor, reading]));
    for (const incoming of update.readings || []) {
      const existing = readings.get(incoming.sensor);
      const oldTime = Date.parse(existing?.measuredAt || '');
      const newTime = Date.parse(incoming.measuredAt || '');
      if (existing && Number.isFinite(oldTime) && Number.isFinite(newTime) && oldTime > newTime) continue;
      readings.set(incoming.sensor, incoming);
    }
    const nextReadings = [...readings.values()];
    merged[deviceId] = {
      ...previous,
      ...update,
      measuredAt: nextReadings.reduce((latest, reading) => newestTime(latest, reading.measuredAt), update.measuredAt || previous.measuredAt || null),
      readings: nextReadings,
    };
  }
  return merged;
}

function latestFromOverviews(devices, overviewBySensor) {
  const visibleIds = new Set(devices.map(device => device.id));
  const latest = {};
  for (const [sensorCode, overview] of Object.entries(overviewBySensor)) {
    for (const item of overview.items || []) {
      if (!visibleIds.has(item.deviceId)) continue;
      const deviceLatest = latest[item.deviceId] || { measuredAt: null, readings: [] };
      deviceLatest.measuredAt = newestTime(deviceLatest.measuredAt, item.measuredAt);
      deviceLatest.readings.push({
        sensor: sensorCode,
        value: item.value,
        unit: item.unit,
        state: item.state,
        threshold: item.threshold,
        measuredAt: item.measuredAt,
      });
      latest[item.deviceId] = deviceLatest;
    }
  }
  return latest;
}

export function createIotMonitoringStore({
  api = iotApi,
  streamClient = iotStreamClient,
  nowImpl = () => Date.now(),
  cacheMs = SNAPSHOT_CACHE_MS,
} = {}) {
  const listeners = new Set();
  const leases = new Map();
  let snapshot = emptySnapshot();
  let currentUserId = null;
  let generation = 0;
  let cacheExpiresAt = 0;
  let catalogController = null;
  let latestController = null;
  let catalogPromise = null;
  let latestPromise = null;
  let stopStream = null;
  let initialLatestReady = false;
  let replayingPendingFrames = false;
  let pendingFrames = [];

  function publish(next) {
    snapshot = typeof next === 'function' ? next(snapshot) : next;
    for (const listener of listeners) {
      try { listener(); } catch { /* Keep other store subscribers isolated. */ }
    }
  }

  function stopSharedWork({ resetSnapshot = false, nextUserId = currentUserId } = {}) {
    generation += 1;
    catalogController?.abort();
    latestController?.abort();
    catalogController = null;
    latestController = null;
    catalogPromise = null;
    latestPromise = null;
    stopStream?.();
    stopStream = null;
    initialLatestReady = false;
    replayingPendingFrames = false;
    pendingFrames = [];
    cacheExpiresAt = 0;
    leases.clear();
    currentUserId = nextUserId;
    if (resetSnapshot) publish(emptySnapshot(nextUserId));
  }

  function disconnectIfUnused() {
    if (leases.size) return;
    generation += 1;
    catalogController?.abort();
    latestController?.abort();
    catalogController = null;
    latestController = null;
    catalogPromise = null;
    latestPromise = null;
    stopStream?.();
    stopStream = null;
    pendingFrames = [];
    if (snapshot.catalogState === 'loading' || snapshot.latestState === 'loading') {
      publish(current => ({
        ...current,
        catalogState: current.catalogState === 'loading' ? 'idle' : current.catalogState,
        latestState: current.latestState === 'loading' ? 'idle' : current.latestState,
      }));
    }
  }

  function collectOverviewResult(devices, sensorCodes, results, { previous = snapshot, generationAtStart } = {}) {
    if (generationAtStart !== generation) return;
    const overviewBySensor = { ...previous.overviewBySensor };
    const errors = [];
    for (const [index, result] of results.entries()) {
      const code = sensorCodes[index];
      if (result.status === 'fulfilled') overviewBySensor[code] = result.value;
      else errors.push(result.reason);
    }
    const retained = Object.fromEntries(Object.entries(overviewBySensor).filter(([code]) => sensorCodes.includes(code)));
    const incoming = latestFromOverviews(devices, retained);
    const visibleIds = new Set(devices.map(device => device.id));
    const previousVisible = Object.fromEntries(Object.entries(previous.latestByDevice).filter(([id]) => visibleIds.has(id)));
    const latestByDevice = mergeLatestByDevice(previousVisible, incoming);
    const latestState = errors.length && !Object.keys(incoming).length ? 'error' : 'ready';
    const latestError = errors.length
      ? `${errors.length} dari ${sensorCodes.length} ringkasan sensor gagal dimuat. ${errors[0]?.message || ''}`.trim()
      : '';
    publish(current => ({
      ...current,
      overviewBySensor: retained,
      latestByDevice,
      latestState,
      latestError,
    }));
    return { overviewBySensor: retained, latestByDevice, latestState, latestError };
  }

  function queuePendingFrame(frame) {
    if (pendingFrames.length === MAX_PENDING_FRAMES) pendingFrames.shift();
    pendingFrames.push(frame);
  }

  function markInitialLatestReady(generationAtStart) {
    if (generationAtStart !== generation || initialLatestReady) return;
    initialLatestReady = true;
    replayingPendingFrames = true;
    try {
      while (pendingFrames.length && generationAtStart === generation) {
        const frame = pendingFrames.shift();
        if (frame.type === 'reading') applyReading(frame.reading);
        else applyDeviceEvent(frame.event, frame.id);
      }
    } finally {
      replayingPendingFrames = false;
    }
  }

  function loadCatalog({ force = false, priority = 'latest' } = {}) {
    if (!currentUserId) return Promise.resolve(snapshot);
    if (catalogPromise) return catalogPromise;
    if (!force && snapshot.catalogState === 'ready' && nowImpl() < cacheExpiresAt) return Promise.resolve(snapshot);

    const generationAtStart = generation;
    const requestUserId = currentUserId;
    const controller = new AbortController();
    catalogController = controller;
    publish(current => ({
      ...current,
      userId: requestUserId,
      catalogState: 'loading',
      catalogError: '',
      latestState: current.latestByDevice && Object.keys(current.latestByDevice).length ? current.latestState : 'loading',
      latestError: '',
    }));

    catalogPromise = (async () => {
      try {
        const catalog = await api.getDevices({ userId: requestUserId, signal: controller.signal, priority });
        if (controller.signal.aborted || generationAtStart !== generation) return snapshot;
        const devices = catalog.devices || [];
        const sensorTypes = catalog.sensorTypes || [];
        const sensorCodes = [...new Set(devices.flatMap(deviceSensors).map(sensor => sensor.code).filter(Boolean))];
        publish(current => ({
          ...current,
          userId: requestUserId,
          catalogState: 'ready',
          catalogError: '',
          devices,
          sensorTypes,
          latestState: sensorCodes.length ? 'loading' : 'ready',
          latestError: '',
        }));
        if (!sensorCodes.length) markInitialLatestReady(generationAtStart);
        const results = await Promise.allSettled(sensorCodes.map(code => api.getSensorOverview(code, {
          signal: controller.signal,
          priority,
        })));
        if (controller.signal.aborted || generationAtStart !== generation) return snapshot;
        const overviewResult = collectOverviewResult(devices, sensorCodes, results, { previous: snapshot, generationAtStart });
        if (overviewResult?.latestState === 'ready') markInitialLatestReady(generationAtStart);
        cacheExpiresAt = nowImpl() + cacheMs;
        return snapshot;
      } catch (error) {
        if (!controller.signal.aborted && generationAtStart === generation) {
          publish(current => ({
            ...current,
            catalogState: 'error',
            catalogError: error.message || 'Daftar perangkat dan jenis sensor tidak dapat dimuat.',
            latestState: 'error',
            latestError: error.message || 'Nilai terbaru tidak dapat dimuat.',
          }));
        }
        return snapshot;
      } finally {
        if (generationAtStart === generation) {
          catalogController = null;
          catalogPromise = null;
        }
      }
    })();
    return catalogPromise;
  }

  function refreshLatest({ priority = 'latest' } = {}) {
    if (!currentUserId) return Promise.resolve(snapshot);
    if (catalogPromise) return catalogPromise.then(() => refreshLatest({ priority }));
    if (latestPromise) return latestPromise;
    if (snapshot.catalogState !== 'ready') return loadCatalog({ priority });
    const sensorCodes = [...new Set(snapshot.devices.flatMap(deviceSensors).map(sensor => sensor.code).filter(Boolean))];
    if (!sensorCodes.length) {
      publish(current => ({ ...current, latestState: 'ready', latestError: '', latestByDevice: {} }));
      return Promise.resolve(snapshot);
    }

    const generationAtStart = generation;
    const controller = new AbortController();
    latestController = controller;
    latestPromise = Promise.allSettled(sensorCodes.map(code => api.getSensorOverview(code, {
      signal: controller.signal,
      priority,
    }))).then(results => {
      if (controller.signal.aborted || generationAtStart !== generation) return snapshot;
      const overviewResult = collectOverviewResult(snapshot.devices, sensorCodes, results, { previous: snapshot, generationAtStart });
      if (overviewResult?.latestState === 'ready') markInitialLatestReady(generationAtStart);
      cacheExpiresAt = nowImpl() + cacheMs;
      return snapshot;
    }).finally(() => {
      if (generationAtStart === generation) {
        latestController = null;
        latestPromise = null;
      }
    });
    return latestPromise;
  }

  function applyDeviceEvent(event, id) {
    const sequence = snapshot.eventSequence + 1;
    const deviceEvents = [...snapshot.deviceEvents, { sequence, event: { ...event, id: id ?? event?.id } }].slice(-MAX_STREAM_EVENTS);
    const devices = snapshot.devices.map(device => {
      if (device.id !== event.deviceId) return device;
      if (event.type === 'offline') return { ...device, status: 'offline' };
      if (event.type === 'online') return { ...device, status: 'online' };
      return device;
    });
    const latestByDevice = { ...snapshot.latestByDevice };
    const existing = latestByDevice[event.deviceId];
    if (event.sensor && ['threshold_low', 'threshold_high', 'threshold_clear'].includes(event.type)) {
      const device = devices.find(item => item.id === event.deviceId);
      const sensor = deviceSensors(device).find(item => item.code === event.sensor);
      const state = event.type === 'threshold_clear' ? 'normal' : event.type === 'threshold_low' ? 'low' : 'high';
      const readings = existing?.readings || [];
      const index = readings.findIndex(reading => reading.sensor === event.sensor);
      const previous = index < 0 ? null : readings[index];
      const reading = {
        ...previous,
        sensor: event.sensor,
        value: event.value ?? previous?.value ?? null,
        unit: previous?.unit || sensor?.unit,
        threshold: previous?.threshold || sensor?.threshold || null,
        state,
        measuredAt: event.at || previous?.measuredAt,
      };
      const nextReadings = [...readings];
      if (index < 0) nextReadings.push(reading);
      else nextReadings[index] = reading;
      latestByDevice[event.deviceId] = {
        ...(existing || {}),
        measuredAt: newestTime(existing?.measuredAt, event.at),
        readings: nextReadings,
      };
    }
    publish(current => ({ ...current, devices, latestByDevice, deviceEvents, eventSequence: sequence }));
  }

  function applyReading(frame) {
    const device = snapshot.devices.find(item => item.id === frame.deviceId);
    if (!device) return;
    const previous = snapshot.latestByDevice[frame.deviceId];
    const next = mergeLatestReading(previous, frame);
    if (!next || next === previous) return;
    publish(current => ({
      ...current,
      latestState: 'ready',
      latestByDevice: { ...current.latestByDevice, [frame.deviceId]: next },
    }));
  }

  function startStream() {
    if (stopStream || !currentUserId) return;
    stopStream = streamClient.subscribe({
      onReading: frame => {
        if (!initialLatestReady || replayingPendingFrames) {
          queuePendingFrame({ type: 'reading', reading: frame });
          return;
        }
        applyReading(frame);
      },
      onDeviceEvent: (event, id) => {
        if (!initialLatestReady || replayingPendingFrames) {
          queuePendingFrame({ type: 'device_event', event, id });
          return;
        }
        applyDeviceEvent(event, id);
      },
      onRefresh: () => { void refreshLatest(); },
    });
  }

  function connect(userId) {
    const normalizedUserId = userId === null || userId === undefined || userId === '' ? null : String(userId);
    if (normalizedUserId !== currentUserId) stopSharedWork({ resetSnapshot: true, nextUserId: normalizedUserId });
    if (!normalizedUserId) return () => {};

    const lease = Symbol(normalizedUserId);
    leases.set(lease, normalizedUserId);
    startStream();
    void loadCatalog();
    let connected = true;
    return () => {
      if (!connected) return;
      connected = false;
      if (leases.get(lease) !== normalizedUserId) return;
      leases.delete(lease);
      disconnectIfUnused();
    };
  }

  function reloadCatalog(userId = currentUserId) {
    const normalizedUserId = userId === null || userId === undefined || userId === '' ? null : String(userId);
    if (normalizedUserId !== currentUserId) stopSharedWork({ resetSnapshot: true, nextUserId: normalizedUserId });
    return loadCatalog({ force: true, priority: 'user' });
  }

  function clearSession() {
    stopSharedWork({ resetSnapshot: true, nextUserId: null });
  }

  return {
    clearSession,
    connect,
    getSnapshot: () => snapshot,
    refreshLatest,
    reloadCatalog,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const iotMonitoringStore = createIotMonitoringStore();
