import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('DeviceReadings distinguishes a failed latest request from a successful empty reading', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { DeviceReadings } = await vite.ssrLoadModule('/src/components/iot/Readings.jsx');
  const markup = renderToStaticMarkup(React.createElement(DeviceReadings, {
    sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH' }],
    latest: null,
    unavailable: true,
  }));

  assert.match(markup, /Pembacaan tidak dapat dimuat/);
  assert.doesNotMatch(markup, /Pastikan alat sudah diprovisioning/);
});
