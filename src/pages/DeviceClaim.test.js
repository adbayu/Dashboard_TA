import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('DeviceClaimLoadingState announces that QR information is loading', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { DeviceClaimLoadingState } = await vite.ssrLoadModule('/src/pages/DeviceClaim.jsx');
  const markup = renderToStaticMarkup(React.createElement(DeviceClaimLoadingState));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Memuat informasi QR/);
});

test('ActivationRequiredState renders the empty manual activation-code form', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { ActivationRequiredState } = await vite.ssrLoadModule('/src/pages/DeviceClaim.jsx');
  const markup = renderToStaticMarkup(React.createElement(ActivationRequiredState, {
    manualActivationCode: '',
    viewError: '',
    onManualActivationCodeChange: () => {},
    onSubmit: () => {},
  }));

  assert.match(markup, /Masukkan kode aktivasi/);
  assert.match(markup, /<input\b(?=[^>]*\bid="manual-activation-code")(?=[^>]*\btype="password")(?=[^>]*\bvalue="")[^>]*>/);
  assert.match(markup, /Periksa kode/);
});
