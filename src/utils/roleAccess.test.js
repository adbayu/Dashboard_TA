import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { roleCanOpenPath } from './roleAccess.js';
import * as roleAccess from './roleAccess.js';

test('monitoring is shared by both roles while role-only routes stay protected', () => {
  const deviceId = '123e4567-e89b-12d3-a456-426614174000';

  assert.equal(roleCanOpenPath('pengguna', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengelola', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengguna', '/admin/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', '/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', `/iot/${deviceId}`), true);
  assert.equal(roleCanOpenPath('pengelola', `/iot/${deviceId}/log`), true);
  assert.equal(roleCanOpenPath('pengelola', `/iot/${deviceId}/log/extra`), false);
  assert.equal(roleCanOpenPath('pengelola', `/iot/${deviceId}/readings`), false);
  assert.equal(roleCanOpenPath('pengelola', '/iot/not-a-uuid'), false);
  assert.equal(roleCanOpenPath('pengguna', `/iot/${deviceId}`), true);
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

test('partner can open only Developer and profile routes', () => {
  assert.equal(roleCanOpenPath('mitra', '/developer'), true);
  assert.equal(roleCanOpenPath('mitra', '/profil'), true);
  for (const path of ['/admin', '/admin/iot', '/', '/iot', '/area', '/monitoring', '/gamifikasi']) {
    assert.equal(roleCanOpenPath('mitra', path), false, path);
  }
  assert.equal(roleAccess.loginDestination('mitra', null), '/developer');
});

test('partner sessions do not connect IoT monitoring while user and admin roles still do', () => {
  const shouldConnect = roleAccess.shouldConnectIotMonitoring;
  assert.equal(typeof shouldConnect, 'function');
  assert.equal(shouldConnect('mitra'), false);
  assert.equal(shouldConnect('pengguna'), true);
  assert.equal(shouldConnect('pengelola'), true);
});

test('authenticated Shell and Login route through the same sanitized QR destination', async () => {
  const shellSource = await readFile(new URL('../SmartApp.jsx', import.meta.url), 'utf8');
  const loginSource = await readFile(new URL('../pages/Login.jsx', import.meta.url), 'utf8');
  const listIotSource = await readFile(new URL('../pages/ListIot.jsx', import.meta.url), 'utf8');

  assert.match(shellSource, /isLoggedIn\s*&&\s*location\.pathname\s*===\s*'\/masuk'[\s\S]*?loginDestination\(role,\s*location\.state\?\.from\)/);
  const capturedReturnTo = loginSource.indexOf('const returnTo = location.state?.from;');
  const awaitedLogin = loginSource.indexOf('await login(email, password)');
  assert.ok(capturedReturnTo >= 0 && capturedReturnTo < awaitedLogin, 'Login must capture its return path before awaiting authentication.');
  assert.match(loginSource, /loginDestination\(hasil\.akun\.role,\s*returnTo\)/);
  assert.match(shellSource, /path:\s*'\/iot\/:id\/log',[\s\S]*?title:\s*'Log sensor'/);
  assert.match(shellSource, /<Route path="\/iot\/:id\/log" element={<DeviceLog \/>} \/>/);
  assert.match(listIotSource, /Lihat log lengkap/);
});
