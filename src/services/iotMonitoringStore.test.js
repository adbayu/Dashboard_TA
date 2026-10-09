import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIotMonitoringStore } from './iotMonitoringStore.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  assert.fail('Timed out waiting for the monitoring snapshot.');
}

function streamClient() {
  let handlers = null;
  let subscriptions = 0;
  let unsubscriptions = 0;
  return {
    subscribe(nextHandlers) {
      handlers = nextHandlers;
      subscriptions += 1;
      return () => {
        handlers = null;
        unsubscriptions += 1;
      };
    },
    get handlers() { return handlers; },
    get subscriptions() { return subscriptions; },
    get unsubscriptions() { return unsubscriptions; },
  };
}

test('Monitoring and sidebar leases share catalog and overview requests and a five-second cache', async () => {
  let now = 10_000;
  let catalogCalls = 0;
  const overviewCalls = [];
  const catalogResponses = [
    deferred(),
    deferred(),
  ];
  const api = {
    getDevices({ userId, signal, priority }) {
      assert.equal(userId, 'owner-1');
      assert.equal(priority, 'latest');
      assert.ok(signal instanceof AbortSignal);
      return catalogResponses[catalogCalls++].promise;
    },
    getSensorOverview(code, { signal, priority }) {
      overviewCalls.push({ code, signal, priority });
      const deviceId = code === 'ph' ? 'device-1' : 'device-2';
      return Promise.resolve({ sensor: code, items: [{
        deviceId,
        deviceCode: deviceId,
        areaRef: 'Kolam 1',
        value: code === 'ph' ? 6.4 : 620,
        unit: code === 'ph' ? 'pH' : 'ppm',
        state: code === 'ph' ? 'low' : 'normal',
        threshold: { low: code === 'ph' ? 6.5 : 500, high: 8, source: 'area' },
        measuredAt: '2026-10-07T10:00:00.000Z',
      }] });
    },
  };
  const stream = streamClient();
  const store = createIotMonitoringStore({ api, streamClient: stream, nowImpl: () => now });
  const stopMonitoring = store.connect('owner-1');
  const stopSidebar = store.connect('owner-1');

  await waitFor(() => catalogCalls === 1);
  assert.equal(overviewCalls.length, 0);
  catalogResponses[0].resolve({
    devices: [
      { id: 'device-1', type: { kind: 'satuan', sensors: [{ code: 'ph', unit: 'pH' }] }, sensors: [{ code: 'ph' }] },
      { id: 'device-2', type: { kind: 'satuan', sensors: [{ code: 'tds', unit: 'ppm' }] }, sensors: [{ code: 'tds' }] },
    ],
    sensorTypes: [{ code: 'ph', name: 'pH' }, { code: 'tds', name: 'TDS' }, { code: 'unused', name: 'Lainnya' }],
  });
  await waitFor(() => store.getSnapshot().latestState === 'ready');

  assert.deepEqual(overviewCalls.map(call => call.code), ['ph', 'tds']);
  assert.deepEqual(overviewCalls.map(call => call.priority), ['latest', 'latest']);
  assert.equal(stream.subscriptions, 1);
  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].measuredAt, '2026-10-07T10:00:00.000Z');
  assert.deepEqual(store.getSnapshot().sensorTypes.map(sensor => sensor.code), ['ph', 'tds', 'unused']);

  stopMonitoring();
  stopSidebar();
  now += 4_999;
  const stopWarm = store.connect('owner-1');
  await Promise.resolve();
  assert.equal(catalogCalls, 1);
  assert.equal(overviewCalls.length, 2);
  stopWarm();

  now += 2;
  const stopExpired = store.connect('owner-1');
  await waitFor(() => catalogCalls === 2);
  catalogResponses[1].resolve({ devices: [], sensorTypes: [] });
  await waitFor(() => store.getSnapshot().latestState === 'ready');
  assert.equal(overviewCalls.length, 2);
  stopExpired();
});

test('switching and logging out clears user data and aborts obsolete catalog work', async () => {
  const responses = new Map();
  const signals = new Map();
  const api = {
    getDevices({ userId, signal }) {
      const request = deferred();
      responses.set(userId, request);
      signals.set(userId, signal);
      return request.promise;
    },
    getSensorOverview: async () => ({ items: [] }),
  };
  const store = createIotMonitoringStore({ api, streamClient: streamClient() });
  const stopA = store.connect('owner-a');
  await waitFor(() => responses.has('owner-a'));
  const stopB = store.connect('owner-b');
  await waitFor(() => responses.has('owner-b'));

  assert.equal(signals.get('owner-a').aborted, true);
  responses.get('owner-a').resolve({ devices: [{ id: 'private-a' }], sensorTypes: [] });
  responses.get('owner-b').resolve({ devices: [{ id: 'owned-b', sensors: [] }], sensorTypes: [] });
  await waitFor(() => store.getSnapshot().devices.some(device => device.id === 'owned-b'));
  assert.deepEqual(store.getSnapshot().devices.map(device => device.id), ['owned-b']);

  stopA();
  stopB();
  store.clearSession();
  assert.equal(store.getSnapshot().userId, null);
  assert.deepEqual(store.getSnapshot().devices, []);
  assert.equal(store.getSnapshot().catalogState, 'idle');
});

test('shared stream updates latest values, attention state, event feed, and refreshes only overviews', async () => {
  let catalogCalls = 0;
  let overviewCalls = 0;
  const stream = streamClient();
  const api = {
    async getDevices() {
      catalogCalls += 1;
      return { devices: [{
        id: 'device-1',
        code: 'AQ-1',
        status: 'online',
        type: { kind: 'paket', sensors: [{ code: 'ph', threshold: { low: 6.5, high: 8 } }] },
        sensors: [{ code: 'ph', threshold: { low: 6.5, high: 8 } }],
      }], sensorTypes: [{ code: 'ph', name: 'pH' }] };
    },
    async getSensorOverview() {
      overviewCalls += 1;
      return { sensor: 'ph', items: [{
        deviceId: 'device-1', deviceCode: 'AQ-1', areaRef: 'Kolam 1', value: 7.2, unit: 'pH',
        state: 'normal', threshold: { low: 6.5, high: 8, source: 'area' }, measuredAt: '2026-10-07T10:00:00.000Z',
      }] };
    },
  };
  const store = createIotMonitoringStore({ api, streamClient: stream });
  const stop = store.connect('owner-1');
  await waitFor(() => store.getSnapshot().latestState === 'ready');
  const handlers = stream.handlers;

  handlers.onReading({ deviceId: 'device-1', measuredAt: '2026-10-07T10:01:00.000Z', readings: { ph: 6.2 } });
  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].state, 'low');
  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].measuredAt, '2026-10-07T10:01:00.000Z');

  handlers.onDeviceEvent({ deviceId: 'device-1', type: 'offline', at: '2026-10-07T10:02:00.000Z' }, '42');
  assert.equal(store.getSnapshot().devices[0].status, 'offline');
  handlers.onDeviceEvent({ deviceId: 'device-1', type: 'threshold_clear', sensor: 'ph', value: 7.1, at: '2026-10-07T10:03:00.000Z' }, '43');
  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].state, 'normal');
  assert.equal(store.getSnapshot().deviceEvents.at(-1).event.id, '43');

  handlers.onRefresh();
  await waitFor(() => overviewCalls === 2);
  assert.equal(catalogCalls, 1);
  stop();
});

test('latest overview replaces a prior reading when the API reports an undated empty value', async () => {
  let value = 7.2;
  let measuredAt = '2026-10-07T10:00:00.000Z';
  const api = {
    async getDevices() {
      return { devices: [{
        id: 'device-1',
        type: { sensors: [{ code: 'ph', unit: 'pH' }] },
      }], sensorTypes: [{ code: 'ph' }] };
    },
    async getSensorOverview() {
      return { items: [{
        deviceId: 'device-1', value, state: value === null ? 'unknown' : 'normal',
        threshold: null, measuredAt,
      }] };
    },
  };
  const store = createIotMonitoringStore({ api, streamClient: streamClient() });
  const stop = store.connect('owner-1');
  await waitFor(() => store.getSnapshot().latestState === 'ready');
  value = null;
  measuredAt = null;
  await store.refreshLatest();

  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].value, null);
  assert.equal(store.getSnapshot().latestByDevice['device-1'].readings[0].measuredAt, null);
  stop();
});

test('startup stream frames replay after the initial overview establishes its baseline', async () => {
  const catalog = deferred();
  const overview = deferred();
  let catalogSignal;
  let overviewSignal;
  let overviewCalls = 0;
  const api = {
    getDevices({ signal }) {
      catalogSignal = signal;
      return catalog.promise;
    },
    getSensorOverview(code, { signal }) {
      assert.equal(code, 'ph');
      overviewCalls += 1;
      overviewSignal = signal;
      return overview.promise;
    },
  };
  const stream = streamClient();
  const store = createIotMonitoringStore({ api, streamClient: stream });
  const stop = store.connect('owner-1');

  await waitFor(() => stream.handlers !== null);
  stream.handlers.onDeviceEvent({
    deviceId: 'device-1',
    type: 'offline',
    at: '2026-10-07T10:02:00.000Z',
  }, 'event-1');
  stream.handlers.onDeviceEvent({
    deviceId: 'device-1',
    type: 'threshold_low',
    sensor: 'ph',
    value: 6.3,
    at: '2026-10-07T10:02:30.000Z',
  }, 'event-2');
  stream.handlers.onReading({
    deviceId: 'device-1',
    measuredAt: '2026-10-07T10:03:00.000Z',
    readings: { ph: 6.2 },
  });
  catalog.resolve({
    devices: [{
      id: 'device-1',
      status: 'online',
      type: { sensors: [{ code: 'ph', unit: 'pH', threshold: { low: 6.5, high: 8 } }] },
    }],
    sensorTypes: [{ code: 'ph', name: 'pH' }],
  });
  await waitFor(() => overviewCalls === 1);
  assert.equal(catalogSignal.aborted, false);
  assert.equal(overviewSignal.aborted, false);
  overview.resolve({ items: [{
    deviceId: 'device-1',
    value: 7.2,
    unit: 'pH',
    state: 'normal',
    threshold: { low: 6.5, high: 8 },
    measuredAt: '2026-10-07T10:00:00.000Z',
  }] });
  await waitFor(() => store.getSnapshot().latestState === 'ready');

  const snapshot = store.getSnapshot();
  assert.equal(overviewCalls, 1);
  assert.equal(snapshot.devices[0].status, 'offline');
  assert.equal(snapshot.latestByDevice['device-1'].readings.length, 1);
  assert.equal(snapshot.latestByDevice['device-1'].readings[0].value, 6.2);
  assert.equal(snapshot.latestByDevice['device-1'].readings[0].state, 'low');
  assert.equal(snapshot.latestByDevice['device-1'].readings[0].measuredAt, '2026-10-07T10:03:00.000Z');
  assert.equal(snapshot.eventSequence, 2);
  assert.equal(snapshot.deviceEvents.length, 2);
  assert.equal(snapshot.deviceEvents[0].event.id, 'event-1');
  assert.equal(snapshot.deviceEvents[1].event.id, 'event-2');
  stop();
});

test('final disconnect and logout abort in-flight startup requests', async () => {
  const overview = deferred();
  let overviewSignal;
  const unmountStream = streamClient();
  const unmountStore = createIotMonitoringStore({
    api: {
      async getDevices() {
        return { devices: [{ id: 'device-1', sensors: [{ code: 'ph' }] }], sensorTypes: [] };
      },
      getSensorOverview(code, { signal }) {
        assert.equal(code, 'ph');
        overviewSignal = signal;
        return overview.promise;
      },
    },
    streamClient: unmountStream,
  });
  const unmount = unmountStore.connect('owner-1');
  await waitFor(() => overviewSignal !== undefined);
  unmount();
  assert.equal(overviewSignal.aborted, true);
  assert.equal(unmountStream.handlers, null);
  assert.equal(unmountStream.unsubscriptions, 1);

  const catalog = deferred();
  let catalogSignal;
  const logoutStore = createIotMonitoringStore({
    api: {
      getDevices({ signal }) {
        catalogSignal = signal;
        return catalog.promise;
      },
      async getSensorOverview() {
        return { items: [] };
      },
    },
    streamClient: streamClient(),
  });
  const logoutLease = logoutStore.connect('owner-2');
  await waitFor(() => catalogSignal !== undefined);
  logoutStore.clearSession();

  assert.equal(catalogSignal.aborted, true);
  assert.equal(logoutStore.getSnapshot().userId, null);
  assert.deepEqual(logoutStore.getSnapshot().devices, []);
  logoutLease();
});

test('user retry requested while a failed latest refresh settles starts one new overview request', async () => {
  const failedOverview = deferred();
  const retriedOverview = deferred();
  let overviewCalls = 0;
  const api = {
    async getDevices() {
      return {
        devices: [{ id: 'device-1', sensors: [{ code: 'ph' }] }],
        sensorTypes: [{ code: 'ph', name: 'pH' }],
      };
    },
    getSensorOverview() {
      overviewCalls += 1;
      if (overviewCalls === 1) return Promise.resolve({ items: [] });
      if (overviewCalls === 2) return failedOverview.promise;
      if (overviewCalls === 3) return retriedOverview.promise;
      assert.fail(`Unexpected overview request ${overviewCalls}`);
    },
  };
  const store = createIotMonitoringStore({ api, streamClient: streamClient() });
  const stop = store.connect('owner-1');
  await waitFor(() => store.getSnapshot().latestState === 'ready');
  assert.equal(overviewCalls, 1);

  let retryRequested = false;
  let retryPromise;
  const unsubscribe = store.subscribe(() => {
    const { latestError } = store.getSnapshot();
    if (latestError && !retryRequested) {
      retryRequested = true;
      retryPromise = store.refreshLatest({ priority: 'user' });
    }
  });

  const failedRefresh = store.refreshLatest({ priority: 'user' });
  assert.equal(overviewCalls, 2);
  failedOverview.reject(new Error('overview unavailable'));

  await waitFor(() => overviewCalls === 3);
  retriedOverview.resolve({ items: [] });
  await Promise.all([failedRefresh, retryPromise]);

  assert.equal(store.getSnapshot().latestError, '');
  assert.equal(store.getSnapshot().latestState, 'ready');
  unsubscribe();
  stop();
});
