import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('chart colours come from readThemeColor and never from literals', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { readThemeColor } = await vite.ssrLoadModule('/src/shared/theme/readThemeColor.js');
  const { buildReadingChart, readChartPalette } = await vite.ssrLoadModule('/src/components/iot/readingChartConfig.js');
  const sensor = { code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2 };
  const points = [{ t: '2026-10-06T08:00:00.000Z', avg: 7.1, min: 6.7, max: 7.6, n: 2 }];
  const { data, options } = buildReadingChart({ sensor, points, threshold: { low: 6.5, high: 8 }, palette: readChartPalette() });

  const average = data.datasets.find(set => set.label === 'Rata-rata');
  assert.equal(average.borderColor, readThemeColor('chart-1'));
  assert.equal(data.datasets.find(set => set.label === 'Maksimum').backgroundColor, readThemeColor('chart-1', 0.14));
  for (const label of ['Ambang bawah', 'Ambang atas']) {
    assert.equal(data.datasets.find(set => set.label === label).borderColor, readThemeColor('warn-fg'));
  }
  assert.equal(options.scales.x.grid.color, readThemeColor('border'));
  assert.equal(options.scales.y.ticks.color, readThemeColor('text-2'));
  assert.equal(options.animation, false);

  assert.equal(readChartPalette('leaf').line, readThemeColor('leaf-fg'));
  assert.equal(readChartPalette('water').line, readThemeColor('water-fg'));

  for (const file of ['ReadingChart.jsx', 'readingChartConfig.js']) {
    const source = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /#[0-9a-f]{6}/i, `${file} has a hex colour`);
    assert.doesNotMatch(source, /\brgba?\(/, `${file} has an rgb() colour`);
  }
});

test('chart markup has no dark: variants or Material font icons and still accepts the legacy theme prop', async t => {
  const vite = await createServer({ root: process.cwd(), configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  t.after(() => vite.close());
  const { default: ReadingChart } = await vite.ssrLoadModule('/src/components/iot/ReadingChart.jsx');
  const sensor = { code: 'ph', name: 'pH Air', unit: 'pH', decimals: 2 };
  const markup = renderToStaticMarkup(React.createElement(ReadingChart, {
    sensor,
    points: [{ t: '2026-10-06T08:00:00.000Z', avg: 7.1, min: 6.7, max: 7.6, n: 2 }],
    theme: 'dark',
  }));
  assert.doesNotMatch(markup, /dark:/);
  assert.doesNotMatch(markup, /material-symbols/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(ReadingChart, { sensor, points: [] })), /material-symbols/);
});
