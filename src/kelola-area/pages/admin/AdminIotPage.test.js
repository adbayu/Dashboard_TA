import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('rotation loading exposes a busy status while credentials rotate', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { RotationBusyState } = await vite.ssrLoadModule('/src/kelola-area/pages/admin/AdminIotPage.jsx');
  const markup = renderToStaticMarkup(React.createElement(RotationBusyState));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Merotasi credential/);
});

test('device type codes use the Unicode Sets pattern', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { DEVICE_TYPE_CODE_PATTERN } = await vite.ssrLoadModule('/src/kelola-area/pages/admin/AdminIotPage.jsx');

  assert.equal(typeof DEVICE_TYPE_CODE_PATTERN, 'string', 'DEVICE_TYPE_CODE_PATTERN must be a string');

  const pattern = new RegExp('^(?:' + DEVICE_TYPE_CODE_PATTERN + ')$', 'v');
  assert.match('AQ-WATER-01', pattern);
  assert.match('AQ-W4-PACK', pattern);
  assert.doesNotMatch('AQ W4 PACK', pattern);
});
