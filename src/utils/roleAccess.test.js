import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roleCanOpenPath } from './roleAccess.js';

test('monitoring is shared by both roles while role-only routes stay protected', () => {
  assert.equal(roleCanOpenPath('pengguna', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengelola', '/monitoring'), true);
  assert.equal(roleCanOpenPath('pengguna', '/admin/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', '/iot'), false);
  assert.equal(roleCanOpenPath('pengelola', '/profil'), true);
  assert.equal(roleCanOpenPath('pengelola', '/developer'), true);
});
