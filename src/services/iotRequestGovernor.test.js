import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIotRequestGovernor } from './iotRequestGovernor.js';

function createClock(startAt = 0) {
  let now = startAt;
  let id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(callback, delay) {
      const timerId = ++id;
      timers.set(timerId, { callback, dueAt: now + delay });
      return timerId;
    },
    clearTimeout(timerId) { timers.delete(timerId); },
    advance(milliseconds) {
      now += milliseconds;
      for (const [timerId, timer] of [...timers]) {
        if (timer.dueAt > now) continue;
        timers.delete(timerId);
        timer.callback();
      }
    },
    get pendingTimers() { return timers.size; },
  };
}

async function settle() {
  await new Promise(resolve => setImmediate(resolve));
}

test('governor keeps rolling windows monotonic when wall time jumps forward', async () => {
  let wallNow = 10_000;
  const originalDateNow = Date.now;
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => 5_000 },
  });
  Date.now = () => wallNow;

  try {
    const clock = createClock();
    const governor = createIotRequestGovernor({
      capacity: 1,
      refillPerMinute: 1,
      maxPerWindow: 1,
      setTimeoutImpl: clock.setTimeout,
      clearTimeoutImpl: clock.clearTimeout,
    });
    const dispatched = [];
    const first = governor.run(() => { dispatched.push('first'); });
    await settle();
    wallNow += 60_001;
    const controller = new AbortController();
    const second = governor.run(() => { dispatched.push('second'); }, { signal: controller.signal });
    await settle();

    assert.deepEqual(dispatched, ['first']);
    controller.abort();
    await assert.rejects(second, error => error.name === 'AbortError');
    await first;
    assert.equal(clock.pendingTimers, 0);
  } finally {
    Date.now = originalDateNow;
    if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance);
    else delete globalThis.performance;
  }
});

test('governor starts admitted work in the dispatch turn', async () => {
  const governor = createIotRequestGovernor();
  let started = false;
  const request = governor.run(() => { started = true; });

  assert.equal(started, true);
  await request;
});

test('governor starts with a full token bucket and refills at the configured rate', async () => {
  const clock = createClock();
  const governor = createIotRequestGovernor({
    capacity: 2,
    refillPerMinute: 2,
    maxPerWindow: 10,
    nowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  const dispatched = [];
  const requests = [0, 1, 2].map(value => governor.run(() => { dispatched.push(value); }));

  await settle();
  assert.deepEqual(dispatched, [0, 1]);
  clock.advance(29_999);
  await settle();
  assert.deepEqual(dispatched, [0, 1]);
  clock.advance(1);
  await settle();
  assert.deepEqual(dispatched, [0, 1, 2]);
  await Promise.all(requests);
});

test('governor never dispatches a 51st request in the strict rolling 60-second window', async () => {
  const clock = createClock();
  const governor = createIotRequestGovernor({
    nowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  let dispatched = 0;
  const requests = Array.from({ length: 51 }, () => governor.run(() => { dispatched += 1; }));

  await settle();
  assert.equal(dispatched, 50);
  clock.advance(60_000);
  await settle();
  assert.equal(dispatched, 50);
  clock.advance(1);
  await settle();
  assert.equal(dispatched, 51);
  await Promise.all(requests);
});

test('queued user work outranks latest, history, and area work', async () => {
  const clock = createClock();
  const governor = createIotRequestGovernor({
    capacity: 1,
    refillPerMinute: 60,
    maxPerWindow: 10,
    rollingWindowMs: 60_000,
    nowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  const order = [];
  const first = governor.run(() => { order.push('first'); });
  const area = governor.run(() => { order.push('area'); }, { priority: 'area' });
  const history = governor.run(() => { order.push('history'); }, { priority: 'history' });
  const latest = governor.run(() => { order.push('latest'); }, { priority: 'latest' });
  const user = governor.run(() => { order.push('user'); }, { priority: 'user' });

  await settle();
  assert.deepEqual(order, ['first']);
  for (const expected of ['user', 'latest', 'history', 'area']) {
    clock.advance(60_001);
    await settle();
    assert.equal(order.at(-1), expected);
  }
  await Promise.all([first, area, history, latest, user]);
});

test('aborting queued work removes it without dispatching', async () => {
  const clock = createClock();
  const governor = createIotRequestGovernor({
    capacity: 1,
    refillPerMinute: 1,
    nowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  const first = governor.run(() => 'first');
  const controller = new AbortController();
  let secondDispatched = false;
  const second = governor.run(() => { secondDispatched = true; }, { signal: controller.signal });
  await first;
  controller.abort();
  await assert.rejects(second, error => error.name === 'AbortError');
  clock.advance(60_000);
  await settle();
  assert.equal(secondDispatched, false);
  assert.equal(clock.pendingTimers, 0);
});

test('Retry-After seconds pause later dispatches without replaying the failed request', async () => {
  const clock = createClock();
  const governor = createIotRequestGovernor({
    capacity: 2,
    refillPerMinute: 60,
    maxPerWindow: 10,
    nowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  let attempts = 0;
  const first = governor.run(() => {
    attempts += 1;
    return new Response('limited', { status: 429, headers: { 'retry-after': '3' } });
  });
  await first;
  const next = governor.run(() => { attempts += 1; });

  clock.advance(2_999);
  await settle();
  assert.equal(attempts, 1);
  clock.advance(1);
  await settle();
  assert.equal(attempts, 2);
  await next;
});

test('Retry-After HTTP dates pause dispatch until the stated time', async () => {
  const startAt = Date.UTC(2026, 9, 6, 8, 0, 0);
  const clock = createClock(startAt);
  const governor = createIotRequestGovernor({
    capacity: 2,
    refillPerMinute: 60,
    maxPerWindow: 10,
    nowImpl: clock.now,
    wallNowImpl: clock.now,
    setTimeoutImpl: clock.setTimeout,
    clearTimeoutImpl: clock.clearTimeout,
  });
  const retryAt = new Date(startAt + 4_000).toUTCString();
  await governor.run(() => new Response('limited', { status: 429, headers: { 'retry-after': retryAt } }));
  let dispatched = false;
  const next = governor.run(() => { dispatched = true; });

  clock.advance(3_999);
  await settle();
  assert.equal(dispatched, false);
  clock.advance(1);
  await settle();
  assert.equal(dispatched, true);
  await next;
});

test('module reloads share one browser-wide request governor', async () => {
  const first = await import('./iotRequestGovernor.js?module=first');
  const second = await import('./iotRequestGovernor.js?module=second');

  assert.equal(first.iotRequestGovernor, second.iotRequestGovernor);
  assert.equal(globalThis[Symbol.for('jagofarm.iotRequestGovernor')], first.iotRequestGovernor);
});
