import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { roleCanOpenPath } from './roleAccess.js';
import * as roleAccess from './roleAccess.js';

test('monitoring is shared by both roles while role-only routes stay protected', () => {
  assert.equal(roleCanOpenPath('pengguna', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengelola', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengguna', '/admin/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', '/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', '/profil'), true);
  assert.equal(roleCanOpenPath('pengelola', '/developer'), true);
});

test('login destination accepts only one internal QR code path', () => {
  const loginDestination = roleAccess.loginDestination;
  assert.equal(typeof loginDestination, 'function');

  assert.equal(loginDestination('pengguna', '/d/AQ-PKT-001'), '/d/AQ-PKT-001');
  assert.equal(loginDestination('pengelola', '/d/AQ-PKT-001'), '/d/AQ-PKT-001');
  assert.equal(loginDestination('pengguna', 'https://example.test/d/AQ-PKT-001'), '/');
  assert.equal(loginDestination('pengguna', '//example.test/path'), '/');
  assert.equal(loginDestination('pengguna', '/d/AQ-PKT-001?next=/admin'), '/');
  assert.equal(loginDestination('pengguna', '/d/AQ-PKT-001/extra'), '/');
  assert.equal(loginDestination('pengguna', '/admin/iot'), '/');
  assert.equal(loginDestination('pengelola', '/iot'), '/admin');
  assert.equal(loginDestination('pengguna', null), '/');
});

test('authenticated Shell and Login route through the same sanitized QR destination', async () => {
  const shellSource = await readFile(new URL('../SmartApp.jsx', import.meta.url), 'utf8');
  const loginSource = await readFile(new URL('../pages/Login.jsx', import.meta.url), 'utf8');

  assert.match(shellSource, /isLoggedIn\s*&&\s*location\.pathname\s*===\s*'\/masuk'[\s\S]*?loginDestination\(role,\s*location\.state\?\.from\)/);
  const capturedReturnTo = loginSource.indexOf('const returnTo = location.state?.from;');
  const awaitedLogin = loginSource.indexOf('await login(email, password)');
  assert.ok(capturedReturnTo >= 0 && capturedReturnTo < awaitedLogin, 'Login must capture its return path before awaiting authentication.');
  assert.match(loginSource, /loginDestination\(hasil\.akun\.role,\s*returnTo\)/);
});
