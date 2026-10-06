export const IOT_STREAM_POLL_INTERVAL_MS = 30_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

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

function retryAfterDelay(response, now) {
  if (response.status !== 429) return 0;
  const value = response.headers?.get?.('retry-after')?.trim();
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : 0;
}

function isDuplicateEventId(id, cursor) {
  if (cursor === null) return false;
  if (id === cursor) return true;
  if (/^\d+$/.test(id) && /^\d+$/.test(cursor)) return BigInt(id) <= BigInt(cursor);
  return false;
}

export function createIotStreamClient({
  fetchImpl = globalThis.fetch,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  nowImpl = () => Date.now(),
  pollIntervalMs = IOT_STREAM_POLL_INTERVAL_MS,
  url = '/api/v1/stream',
} = {}) {
  const subscribers = new Set();
  let status = 'idle';
  let hasConnected = false;
  let lastEventId = null;
  let streamTask = null;
  let activeController = null;
  let activeReader = null;
  let pollTimer = null;
  let retryTimer = null;
  let retryAttempt = 0;

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

  function clearRetry() {
    if (retryTimer === null) return;
    clearTimeoutImpl(retryTimer);
    retryTimer = null;
  }

  function scheduleRecovery(retryAfterMs = 0) {
    if (!subscribers.size || retryTimer !== null) return;
    const backoff = Math.min(RECONNECT_BASE_DELAY_MS * (2 ** retryAttempt), RECONNECT_MAX_DELAY_MS);
    retryAttempt = Math.min(retryAttempt + 1, 5);
    retryTimer = setTimeoutImpl(() => {
      retryTimer = null;
      ensureStream();
    }, Math.max(backoff, retryAfterMs));
  }

  function startPolling(retryAfterMs = 0) {
    if (!subscribers.size) return;
    setStatus('polling');
    if (pollTimer === null) {
      pollTimer = setIntervalImpl(() => {
        if (subscribers.size) notify('onRefresh');
      }, pollIntervalMs);
    }
    scheduleRecovery(retryAfterMs);
  }

  function stopConnection() {
    clearPolling();
    clearRetry();
    const reader = activeReader;
    activeReader = null;
    activeController?.abort();
    activeController = null;
    if (reader) void reader.cancel().catch(() => {});
    lastEventId = null;
    hasConnected = false;
    retryAttempt = 0;
    setStatus('idle');
  }

  async function consume(response, controller) {
    const reader = response.body.getReader();
    activeReader = reader;
    const decoder = new TextDecoder();
    const parser = createSseParser(frame => {
      if (frame.event !== 'reading' && frame.event !== 'device_event') return;
      try {
        const data = JSON.parse(frame.data);
        if (frame.event === 'reading') notify('onReading', data);
        else {
          if (frame.id !== undefined) {
            if (isDuplicateEventId(frame.id, lastEventId)) return;
            lastEventId = frame.id;
          }
          notify('onDeviceEvent', data, frame.id);
        }
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
    while (subscribers.size) {
      if (pollTimer === null) setStatus(hasConnected ? 'reconnecting' : 'connecting');
      const controller = new AbortController();
      activeController = controller;
      const headers = { Accept: 'text/event-stream' };
      if (hasConnected && lastEventId !== null) headers['Last-Event-ID'] = lastEventId;

      let response;
      try {
        response = await fetchImpl(url, { credentials: 'same-origin', headers, signal: controller.signal });
      } catch {
        if (activeController === controller) activeController = null;
        if (subscribers.size && !controller.signal.aborted) startPolling();
        return;
      }

      if (!subscribers.size || controller.signal.aborted) {
        if (activeController === controller) activeController = null;
        try { await response.body?.cancel(); } catch { /* The response body may already be closed. */ }
        return;
      }
      if (response.status !== 200 || !response.body?.getReader) {
        try { await response.body?.cancel(); } catch { /* The response body may already be closed. */ }
        if (activeController === controller) activeController = null;
        startPolling(retryAfterDelay(response, nowImpl()));
        return;
      }

      hasConnected = true;
      retryAttempt = 0;
      clearPolling();
      clearRetry();
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
    if (streamTask || retryTimer !== null || !subscribers.size) return;
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
