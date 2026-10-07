export const IOT_REQUEST_PRIORITIES = Object.freeze({
  user: 0,
  latest: 1,
  history: 2,
  area: 3,
});

export const IOT_REQUEST_LIMIT = 50;
export const IOT_REQUEST_WINDOW_MS = 60_000;

function monotonicNow() {
  return typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now();
}

function abortError(signal) {
  if (signal?.reason instanceof Error) return signal.reason;
  return Object.assign(new Error('Permintaan dibatalkan.'), { name: 'AbortError' });
}

function retryAfterMilliseconds(response, now) {
  if (response?.status !== 429) return 0;
  const value = response.headers?.get?.('retry-after')?.trim();
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : 0;
}

export function createIotRequestGovernor({
  capacity = IOT_REQUEST_LIMIT,
  refillPerMinute = IOT_REQUEST_LIMIT,
  rollingWindowMs = IOT_REQUEST_WINDOW_MS,
  maxPerWindow = IOT_REQUEST_LIMIT,
  nowImpl = monotonicNow,
  wallNowImpl = () => Date.now(),
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  } = {}) {
  const refillPerMs = refillPerMinute / 60_000;
  let tokens = capacity;
  let lastRefillAt = nowImpl();
  let pauseUntil = 0;
  let timeout = null;
  let nextSequence = 0;
  const queue = [];
  const dispatchTimes = [];

  function refill(now) {
    if (now > lastRefillAt) {
      tokens = Math.min(capacity, tokens + (now - lastRefillAt) * refillPerMs);
      lastRefillAt = now;
    }
    while (dispatchTimes.length && now - dispatchTimes[0] > rollingWindowMs) dispatchTimes.shift();
  }

  function observeResponse(response) {
    const delay = retryAfterMilliseconds(response, wallNowImpl());
    if (!delay) return;
    pauseUntil = Math.max(pauseUntil, nowImpl() + delay);
    scheduleDrain();
  }

  function waitUntilDispatchable(now) {
    let readyAt = Math.max(now, pauseUntil);
    if (tokens < 1) readyAt = Math.max(readyAt, now + Math.ceil((1 - tokens) / refillPerMs));
    if (dispatchTimes.length >= maxPerWindow) {
      readyAt = Math.max(readyAt, dispatchTimes[0] + rollingWindowMs + 1);
    }
    return readyAt;
  }

  function scheduleDrain() {
    if (timeout !== null) {
      clearTimeoutImpl(timeout);
      timeout = null;
    }
    if (!queue.length) return;
    const now = nowImpl();
    refill(now);
    const readyAt = waitUntilDispatchable(now);
    timeout = setTimeoutImpl(() => {
      timeout = null;
      drain();
    }, Math.max(1, readyAt - now));
  }

  function drain() {
    if (timeout !== null) {
      clearTimeoutImpl(timeout);
      timeout = null;
    }
    let now = nowImpl();
    refill(now);
    while (queue.length && now >= pauseUntil && tokens >= 1 && dispatchTimes.length < maxPerWindow) {
      queue.sort((left, right) => left.priority - right.priority || left.sequence - right.sequence);
      const task = queue.shift();
      if (task.signal?.aborted) {
        task.cleanup();
        task.reject(abortError(task.signal));
        continue;
      }

      task.cleanup();
      tokens -= 1;
      dispatchTimes.push(now);
      let operationResult;
      try {
        operationResult = task.operation(task.signal);
      } catch (error) {
        operationResult = Promise.reject(error);
      }
      Promise.resolve(operationResult)
        .then(result => {
          observeResponse(result);
          task.resolve(result);
        }, error => {
          if (error?.status === 429 && Number.isFinite(error.retryAfterMs)) {
            pauseUntil = Math.max(pauseUntil, nowImpl() + Math.max(0, error.retryAfterMs));
            scheduleDrain();
          }
          task.reject(error);
        });
      now = nowImpl();
      refill(now);
    }
    scheduleDrain();
  }

  function run(operation, { signal, priority = 'latest' } = {}) {
    if (typeof operation !== 'function') return Promise.reject(new TypeError('Permintaan harus berupa fungsi.'));
    if (signal?.aborted) return Promise.reject(abortError(signal));
    const priorityValue = typeof priority === 'number'
      ? priority
      : IOT_REQUEST_PRIORITIES[priority] ?? IOT_REQUEST_PRIORITIES.latest;

    return new Promise((resolve, reject) => {
      const task = {
        operation,
        signal,
        priority: priorityValue,
        sequence: nextSequence += 1,
        resolve,
        reject,
        cleanup: () => signal?.removeEventListener('abort', onAbort),
      };
      const onAbort = () => {
        const index = queue.indexOf(task);
        if (index < 0) return;
        queue.splice(index, 1);
        task.cleanup();
        reject(abortError(signal));
        scheduleDrain();
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      queue.push(task);
      drain();
    });
  }

  return { run, observeResponse };
}

const iotRequestGovernorKey = Symbol.for('jagofarm.iotRequestGovernor');
export const iotRequestGovernor = globalThis[iotRequestGovernorKey] ??= createIotRequestGovernor();
