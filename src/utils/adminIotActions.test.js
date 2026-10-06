import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRotateDeviceCredential, credentialRevealCanClose, performActivationLabelAction } from './adminIotActions.js';

test('meminta konfirmasi untuk label QR dan batal tanpa menerbitkan kode', () => {
  const device = { id: 'device-1' };
  const confirmations = [];
  const renewals = [];
  const handlers = {
    onConfirmationChange: value => confirmations.push(value),
    renewActivationCode: value => renewals.push(value),
  };

  performActivationLabelAction('request', device, handlers);
  performActivationLabelAction('cancel', device, handlers);

  assert.deepEqual(confirmations, [device, null]);
  assert.deepEqual(renewals, []);
});

test('konfirmasi menutup dialog lalu menerbitkan kode untuk device yang dipilih', async () => {
  const device = { id: 'device-1' };
  const confirmations = [];
  const renewals = [];
  const handlers = {
    onConfirmationChange: value => confirmations.push(value),
    renewActivationCode: async value => {
      renewals.push(value);
      return 'renewed';
    },
  };

  assert.equal(await performActivationLabelAction('confirm', device, handlers), 'renewed');

  assert.deepEqual(confirmations, [null]);
  assert.deepEqual(renewals, [device]);
});

test('credential baru hanya dapat ditutup setelah disalin atau dinyatakan tersimpan', () => {
  assert.equal(credentialRevealCanClose({ credential: 'secret', copied: false, saved: false }), false);
  assert.equal(credentialRevealCanClose({ credential: 'secret', copied: true, saved: false }), true);
  assert.equal(credentialRevealCanClose({ credential: 'secret', copied: false, saved: true }), true);
  assert.equal(credentialRevealCanClose({ credential: '', copied: false, saved: false }), true);
});

test('rotasi hanya tersedia untuk device live yang terprovisioning', () => {
  assert.equal(canRotateDeviceCredential({ isSandbox: false, credentialProvisioned: true }), true);
  assert.equal(canRotateDeviceCredential({ isSandbox: true, credentialProvisioned: true }), false);
  assert.equal(canRotateDeviceCredential({ isSandbox: false, credentialProvisioned: false }), false);
  assert.equal(canRotateDeviceCredential({ isSandbox: false }), false);
  assert.equal(canRotateDeviceCredential({ credentialProvisioned: true }), false);
});
