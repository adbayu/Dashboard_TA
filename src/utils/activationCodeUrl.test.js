import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripQrActivationCodeFromAddressBar } from './activationCodeUrl.js';

test('menghapus parameter kode aktivasi dari entri riwayat aktif tanpa mengubah parameter lain', () => {
  const historyState = { router: true };
  const replacements = [];
  const didStrip = stripQrActivationCodeFromAddressBar(
    { href: 'https://farm.example/d/AQ-PKT-TEST?tab=info&c=unit-test-activation-7d23#detail' },
    { state: historyState, replaceState: (...args) => replacements.push(args) },
  );

  assert.equal(didStrip, true);
  assert.deepEqual(replacements, [[historyState, '', '/d/AQ-PKT-TEST?tab=info#detail']]);
  assert.equal(replacements[0][2].includes('c='), false);
});

test('tidak mengubah riwayat bila URL tidak membawa kode aktivasi', () => {
  let replacementCount = 0;
  const didStrip = stripQrActivationCodeFromAddressBar(
    { href: 'https://farm.example/d/AQ-PKT-TEST' },
    { state: null, replaceState: () => { replacementCount += 1; } },
  );

  assert.equal(didStrip, false);
  assert.equal(replacementCount, 0);
});
