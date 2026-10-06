import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('history summary includes the sensor unit for the selected range', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { default: ReadingChart } = await vite.ssrLoadModule('/src/components/iot/ReadingChart.jsx');
  const markup = renderToStaticMarkup(React.createElement(ReadingChart, {
    sensor: { code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2 },
    points: [{ t: '2026-10-06T08:00:00.000Z', avg: 7.1, min: 6.7, max: 7.6, n: 2 }],
  }));

  assert.match(markup, /Terakhir 7,10 pH\. Min 6,70 pH\. Maks 7,60 pH\./);
});
