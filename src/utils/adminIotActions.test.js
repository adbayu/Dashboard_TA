import assert from 'node:assert/strict';
import { test } from 'node:test';
import { performActivationLabelAction } from './adminIotActions.js';

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
