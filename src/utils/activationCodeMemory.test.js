import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACTIVATION_CODE_TTL_MS,
  beginActivationCodeLogout,
  claimAndForgetActivationCode,
  createActivationCodeMemory,
} from './activationCodeMemory.js';

function makeClock() {
  let now = 0;
  const timers = new Map();
  let nextId = 0;
  return {
    now: () => now,
    elapse(ms) { now += ms; },
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, dueAt: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.dueAt <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

test('kode aktivasi hanya tersedia di memori dan berakhir setelah sepuluh menit', () => {
  const clock = makeClock();
  const memory = createActivationCodeMemory({ nowImpl: clock.now, setTimeoutImpl: clock.setTimeout, clearTimeoutImpl: clock.clearTimeout });
  let changes = 0;
  memory.subscribe(() => { changes += 1; });
  memory.set('AQ-PKT-001', 'a'.repeat(64));

  assert.equal(memory.get('AQ-PKT-001'), 'a'.repeat(64));
  assert.equal(ACTIVATION_CODE_TTL_MS, 600_000);
  clock.advance(ACTIVATION_CODE_TTL_MS - 1);
  assert.equal(memory.get('AQ-PKT-001'), 'a'.repeat(64));
  clock.advance(1);
  assert.equal(memory.get('AQ-PKT-001'), '');
  assert.equal(changes, 2);
});

test('kode aktivasi hanya dapat dipakai untuk device yang sama', () => {
  const clock = makeClock();
  const memory = createActivationCodeMemory({ nowImpl: clock.now, setTimeoutImpl: clock.setTimeout, clearTimeoutImpl: clock.clearTimeout });
  memory.set('AQ-PKT-001', 'b'.repeat(64));

  assert.equal(memory.get('AQ-PKT-002'), '');
  assert.equal(memory.get('AQ-PKT-001'), 'b'.repeat(64));
});

test('snapshot kode aktivasi yang kedaluwarsa kosong tanpa memutasi store saat render', () => {
  const clock = makeClock();
  const memory = createActivationCodeMemory({ nowImpl: clock.now, setTimeoutImpl: clock.setTimeout, clearTimeoutImpl: clock.clearTimeout });
  let changes = 0;
  memory.subscribe(() => { changes += 1; });
  memory.set('AQ-PKT-001', 'd'.repeat(64));
  clock.elapse(ACTIVATION_CODE_TTL_MS);

  assert.equal(memory.peek('AQ-PKT-001'), '');
  assert.equal(changes, 1);
  assert.equal(memory.get('AQ-PKT-001'), '');
  assert.equal(changes, 2);
});

test('klaim berhasil membersihkan kode, sedangkan klaim gagal mempertahankannya', async () => {
  const memory = createActivationCodeMemory();
  memory.set('AQ-PKT-001', 'c'.repeat(64));
  await assert.rejects(claimAndForgetActivationCode(memory, async () => { throw new Error('gagal'); }), /gagal/);
  assert.equal(memory.get('AQ-PKT-001'), 'c'.repeat(64));
  await claimAndForgetActivationCode(memory, async () => ({ deviceId: 'device-1' }));
  assert.equal(memory.get('AQ-PKT-001'), '');
});

test('logout membersihkan kode aktivasi dan tidak menulisnya ke storage browser', () => {
  const writes = [];
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  globalThis.localStorage = { setItem: (...args) => writes.push(['local', ...args]) };
  globalThis.sessionStorage = { setItem: (...args) => writes.push(['session', ...args]) };
  try {
    const clock = makeClock();
    const memory = createActivationCodeMemory({ nowImpl: clock.now, setTimeoutImpl: clock.setTimeout, clearTimeoutImpl: clock.clearTimeout });
    memory.set('AQ-PKT-001', 'c'.repeat(64));
    beginActivationCodeLogout(memory);

    assert.equal(memory.get('AQ-PKT-001'), '');
    assert.deepEqual(writes, []);
  } finally {
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
    if (originalSessionStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalSessionStorage;
  }
});
