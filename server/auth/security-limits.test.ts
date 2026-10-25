import assert from 'node:assert/strict';
import test from 'node:test';
import { AnonymousPreviewLimit } from './preview-limit.js';
import { LoginFailureLimit } from './login-failure-limit.js';

const MINUTE = 60_000;

test('preview anonim dibatasi 20 permintaan per jendela 10 menit', () => {
  const limit = new AnonymousPreviewLimit();
  const start = 1_000_000;
  for (let index = 0; index < 20; index++) {
    assert.equal(limit.consume('203.0.113.7', start).allowed, true, `permintaan ke-${index + 1} harus lolos`);
  }
  const blocked = limit.consume('203.0.113.7', start);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetAt > start);
});

test('batas pratinjau dipisah per IP dan pulih setelah jendela berakhir', () => {
  const limit = new AnonymousPreviewLimit();
  const start = 1_000_000;
  for (let index = 0; index < 20; index++) limit.consume('198.51.100.1', start);
  assert.equal(limit.consume('198.51.100.1', start).allowed, false);
  assert.equal(limit.consume('198.51.100.2', start).allowed, true, 'IP lain tidak boleh ikut terkunci');
  assert.equal(limit.consume('198.51.100.1', start + 10 * MINUTE + 1).allowed, true, 'kuota pulih setelah jendela lewat');
});

test('login terkunci setelah 8 kegagalan dan pulih setelah 15 menit', () => {
  const limit = new LoginFailureLimit();
  const start = 1_000_000;
  const email = 'pengelola@jagofarm.test';
  assert.equal(limit.lockoutFor(email, start), null);
  for (let index = 0; index < 8; index++) {
    assert.equal(limit.lockoutFor(email, start), null, `kegagalan ke-${index} belum mengunci`);
    limit.recordFailure(email, start);
  }
  const locked = limit.lockoutFor(email, start);
  assert.ok(locked, 'setelah 8 kegagalan akun harus terkunci');
  assert.ok(locked.retryAfter > 0 && locked.retryAfter <= 900);
  assert.equal(limit.lockoutFor(email, start + 15 * MINUTE + 1), null, 'lockout berakhir setelah jendela');
});

test('login sukses menghapus hitungan kegagalan akun itu saja', () => {
  const limit = new LoginFailureLimit();
  const start = 1_000_000;
  for (let index = 0; index < 7; index++) limit.recordFailure('a@jagofarm.test', start);
  for (let index = 0; index < 7; index++) limit.recordFailure('b@jagofarm.test', start);
  limit.clear('a@jagofarm.test');
  limit.recordFailure('a@jagofarm.test', start);
  assert.equal(limit.lockoutFor('a@jagofarm.test', start), null, 'hitungan a@ mulai dari nol lagi');
  limit.recordFailure('b@jagofarm.test', start);
  assert.ok(limit.lockoutFor('b@jagofarm.test', start), 'akun lain tetap terkunci sesuai hitungannya');
});
