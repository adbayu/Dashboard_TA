export const IOT_STREAM_POLL_INTERVAL_MS = 30_000;

export function createSseParser(onFrame) {
  let buffer = '';
  let event = '';
  let id;
  let data = [];

  const dispatch = () => {
    if (data.length) onFrame({ event: event || 'message', id, data: data.join('\n') });
    event = '';
    id = undefined;
    data = [];
  };

  const processLine = line => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    else if (field === 'id' && !value.includes('\0')) id = value;
  };

  return {
    push(chunk) {
      const input = buffer + String(chunk);
      let start = 0;
      buffer = '';

      for (let index = 0; index < input.length; index += 1) {
        if (input[index] === '\r') {
          if (index === input.length - 1) {
            buffer = input.slice(start);
            return;
          }
          processLine(input.slice(start, index));
          if (input[index + 1] === '\n') index += 1;
          start = index + 1;
        } else if (input[index] === '\n') {
          processLine(input.slice(start, index));
          start = index + 1;
        }
      }

      if (start < input.length) buffer = input.slice(start);
    },
    finish() {
      if (buffer) processLine(buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer);
      buffer = '';
      dispatch();
    },
  };
}

export function createIotStreamClient({
  fetchImpl = globalThis.fetch,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  pollIntervalMs = IOT_STREAM_POLL_INTERVAL_MS,
  url = '/api/v1/stream',
} = {}) {
  const subscribers = new Set();
  let status = 'idle';
  let lastEventId = null;
  let streamTask = null;
  let activeController = null;
  let activeReader = null;
  let pollTimer = null;

  function notify(name, ...args) {
    for (const handlers of subscribers) {
      try { handlers[name]?.(...args); } catch { /* One view must not break other stream subscribers. */ }
    }
  }

  function setStatus(nextStatus) {
    if (status === nextStatus) return;
    status = nextStatus;
    notify('onStatus', status);
  }

  function clearPolling() {
    if (pollTimer === null) return;
    clearIntervalImpl(pollTimer);
    pollTimer = null;
  }

  function startPolling() {
    if (!subscribers.size) return;
    setStatus('polling');
    if (pollTimer !== null) return;
    pollTimer = setIntervalImpl(() => {
      if (subscribers.size) notify('onRefresh');
    }, pollIntervalMs);
  }

  function stopConnection() {
    clearPolling();
    const reader = activeReader;
    activeReader = null;
    activeController?.abort();
    activeController = null;
    if (reader) void reader.cancel().catch(() => {});
    lastEventId = null;
    setStatus('idle');
  }

  async function consume(response, controller) {
    const reader = response.body.getReader();
    activeReader = reader;
    const decoder = new TextDecoder();
    const parser = createSseParser(frame => {
      if (frame.event === 'device_event' && frame.id !== undefined) lastEventId = frame.id;
      if (frame.event !== 'reading' && frame.event !== 'device_event') return;
      try {
        const data = JSON.parse(frame.data);
        if (frame.event === 'reading') notify('onReading', data);
        else notify('onDeviceEvent', data, frame.id);
      } catch {
        // Malformed event data is ignored; the connection stays usable.
      }
    });

    try {
      while (subscribers.size && !controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          parser.push(decoder.decode());
          parser.finish();
          return;
        }
        parser.push(decoder.decode(value, { stream: true }));
      }
    } finally {
      if (activeReader === reader) activeReader = null;
      try { reader.releaseLock(); } catch { /* The reader may have been cancelled during cleanup. */ }
    }
  }

  async function runStream() {
    let established = false;

    while (subscribers.size) {
      setStatus(established ? 'reconnecting' : 'connecting');
      const controller = new AbortController();
      activeController = controller;
      const headers = { Accept: 'text/event-stream' };
      if (established && lastEventId !== null) headers['Last-Event-ID'] = lastEventId;

      let response;
      try {
        response = await fetchImpl(url, { credentials: 'same-origin', headers, signal: controller.signal });
      } catch {
        if (subscribers.size && !controller.signal.aborted) startPolling();
        return;
      }

      if (!subscribers.size || controller.signal.aborted) return;
      if (response.status !== 200 || !response.body?.getReader) {
        try { await response.body?.cancel(); } catch { /* The response body may already be closed. */ }
        startPolling();
        return;
      }

      established = true;
      setStatus('live');
      try {
        await consume(response, controller);
      } catch {
        if (!subscribers.size || controller.signal.aborted) return;
      }

      if (!subscribers.size || controller.signal.aborted) return;
      activeController = null;
      setStatus('reconnecting');
    }
  }

  function ensureStream() {
    if (streamTask || !subscribers.size || status === 'polling') return;
    streamTask = runStream().finally(() => {
      streamTask = null;
      if (subscribers.size && status !== 'polling') ensureStream();
    });
  }

  function subscribe(handlers = {}) {
    subscribers.add(handlers);
    if (status !== 'idle') {
      try { handlers.onStatus?.(status); } catch { /* Keep subscription setup isolated. */ }
    }
    ensureStream();

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      subscribers.delete(handlers);
      if (subscribers.size === 0) stopConnection();
    };
  }

  return { subscribe, getSubscriberCount: () => subscribers.size };
}

export const iotStreamClient = createIotStreamClient();
