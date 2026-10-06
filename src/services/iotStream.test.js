import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIotStreamClient, createSseParser } from './iotStream.js';

const encoder = new TextEncoder();

function createTimers() {
  let nextId = 0;
  const callbacks = new Map();
  return {
    callbacks,
    setInterval(callback, delay) {
      const id = ++nextId;
      callbacks.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) { callbacks.delete(id); },
  };
}

function openResponse() {
  let streamController;
  let closed = false;
  const body = new ReadableStream({
    start(controller) { streamController = controller; },
    cancel() { closed = true; },
  });
  return {
    response: new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    send(text) { streamController.enqueue(encoder.encode(text)); },
    close() { if (!closed) { closed = true; streamController.close(); } },
    get closed() { return closed; },
  };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  assert.fail('Timed out waiting for the expected stream state.');
}

test('SSE parser handles split frames, multiline data, IDs, and CRLF chunk boundaries', () => {
  const frames = [];
  const parser = createSseParser(frame => frames.push(frame));

  parser.push('id: 41\r');
  parser.push('\nevent: device_event\r\ndata: {"type":"offline",\n');
  parser.push('data: "deviceId":"device-1"}\r\n\r\nevent: reading\ndata: {"deviceId":"device-1","readings":{"ph":6.1}}\n\n');
  parser.finish();

  assert.deepEqual(frames, [
    { event: 'device_event', id: '41', data: '{"type":"offline",\n"deviceId":"device-1"}' },
    { event: 'reading', id: undefined, data: '{"deviceId":"device-1","readings":{"ph":6.1}}' },
  ]);
});

test('multiple subscribers share one stream and final unsubscribe aborts it', async () => {
  const timers = createTimers();
  const stream = openResponse();
  const requests = [];
  const client = createIotStreamClient({
    fetchImpl: async (url, options) => { requests.push({ url, options }); return stream.response; },
    setIntervalImpl: timers.setInterval,
    clearIntervalImpl: timers.clearInterval,
  });
  const stopFirst = client.subscribe({});
  const stopSecond = client.subscribe({});

  await waitFor(() => requests.length === 1);
  stopFirst();
  assert.equal(client.getSubscriberCount(), 1);
  assert.equal(requests.length, 1);

  stopSecond();
  await waitFor(() => client.getSubscriberCount() === 0);
  await waitFor(() => stream.closed);
  assert.equal(timers.callbacks.size, 0);
  assert.equal(requests.length, 1);
});

test('initial non-200 including 429 stops stream attempts and shares 30-second polling', async () => {
  const timers = createTimers();
  const statuses = [];
  const refreshes = [0, 0];
  let requests = 0;
  const client = createIotStreamClient({
    fetchImpl: async () => { requests += 1; return new Response('rate limited', { status: 429 }); },
    setIntervalImpl: timers.setInterval,
    clearIntervalImpl: timers.clearInterval,
  });
  const stop = client.subscribe({ onStatus: status => statuses.push(status), onRefresh: () => { refreshes[0] += 1; } });
  const stopSecond = client.subscribe({ onRefresh: () => { refreshes[1] += 1; } });

  await waitFor(() => statuses.includes('polling'));
  assert.deepEqual(statuses, ['connecting', 'polling']);
  assert.equal(requests, 1);
  assert.equal(timers.callbacks.size, 1);
  assert.equal([...timers.callbacks.values()][0].delay, 30_000);
  [...timers.callbacks.values()][0].callback();
  assert.deepEqual(refreshes, [1, 1]);
  assert.equal(requests, 1);
  stop();
  assert.equal(timers.callbacks.size, 1);
  stopSecond();
  assert.equal(timers.callbacks.size, 0);
});

test('established stream reconnects sequentially with Last-Event-ID and dispatches live frames', async () => {
  const timers = createTimers();
  const streams = [openResponse(), openResponse()];
  const requests = [];
  const statuses = [];
  const readings = [];
  const events = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const client = createIotStreamClient({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return streams[requests.length - 1].response;
    },
    setIntervalImpl: timers.setInterval,
    clearIntervalImpl: timers.clearInterval,
  });
  const stop = client.subscribe({
    onStatus: status => statuses.push(status),
    onReading: reading => readings.push(reading),
    onDeviceEvent: (event, id) => events.push({ event, id }),
  });

  await waitFor(() => statuses.includes('live'));
  streams[0].send('id: 88\nevent: device_event\ndata: {"deviceId":"device-1","type":"offline","sensor":null,"value":null,"at":"2026-10-06T08:00:00.000Z"}\n\n');
  streams[0].send('event: reading\ndata: {"deviceId":"device-1","measuredAt":"2026-10-06T08:01:00.000Z","readings":{"ph":6.1}}\n\n');
  streams[0].close();

  await waitFor(() => requests.length === 2 && statuses.filter(status => status === 'live').length === 2);
  assert.deepEqual(events, [{ event: { deviceId: 'device-1', type: 'offline', sensor: null, value: null, at: '2026-10-06T08:00:00.000Z' }, id: '88' }]);
  assert.deepEqual(readings, [{ deviceId: 'device-1', measuredAt: '2026-10-06T08:01:00.000Z', readings: { ph: 6.1 } }]);
  assert.equal(requests[0].url, '/api/v1/stream');
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.equal(requests[0].options.headers.Accept, 'text/event-stream');
  assert.equal(requests[1].options.headers['Last-Event-ID'], '88');
  assert.ok(statuses.includes('reconnecting'));
  assert.equal(maxInFlight, 1);

  stop();
  streams[1].close();
});

test('non-200 reconnect response stops retries and falls back to polling', async () => {
  const timers = createTimers();
  const stream = openResponse();
  const statuses = [];
  const requests = [];
  let refreshes = 0;
  const client = createIotStreamClient({
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return requests.length === 1 ? stream.response : new Response('unauthorized', { status: 401 });
    },
    setIntervalImpl: timers.setInterval,
    clearIntervalImpl: timers.clearInterval,
  });
  const stop = client.subscribe({ onStatus: status => statuses.push(status), onRefresh: () => { refreshes += 1; } });

  await waitFor(() => statuses.includes('live'));
  stream.send('id: 91\nevent: device_event\ndata: {"deviceId":"device-1","type":"online"}\n\n');
  stream.close();
  await waitFor(() => statuses.includes('polling'));

  assert.deepEqual(statuses, ['connecting', 'live', 'reconnecting', 'polling']);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.headers['Last-Event-ID'], '91');
  [...timers.callbacks.values()][0].callback();
  assert.equal(refreshes, 1);
  stop();
});

test('initial network failure switches directly to polling without retrying the stream', async () => {
  const timers = createTimers();
  const statuses = [];
  let requests = 0;
  const client = createIotStreamClient({
    fetchImpl: async () => { requests += 1; throw new Error('offline'); },
    setIntervalImpl: timers.setInterval,
    clearIntervalImpl: timers.clearInterval,
  });
  const stop = client.subscribe({ onStatus: status => statuses.push(status) });

  await waitFor(() => statuses.includes('polling'));
  assert.deepEqual(statuses, ['connecting', 'polling']);
  assert.equal(requests, 1);
  stop();
});
