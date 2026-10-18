import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('log rows show explicit sensor state and late receipt without duplicate responsive rows', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { default: LogTable } = await vite.ssrLoadModule('/src/components/iot/LogTable.jsx');
  const markup = renderToStaticMarkup(React.createElement(LogTable, {
    sensors: [{ code: 'ph', name: 'pH Air', unit: 'pH', decimals: 1 }],
    points: [{
      messageId: 'message-1',
      measuredAt: '2026-10-15T10:00:00.000Z',
      receivedAt: '2026-10-15T10:01:31.000Z',
      readings: [{ sensor: 'ph', value: 5.8, unit: 'pH', state: 'low' }],
    }],
  }));

  assert.equal((markup.match(/<tr\b/g) || []).length, 2, 'one table header row and one DOM row per sample');
  assert.match(markup, /Di bawah ambang/);
  assert.match(markup, /Dikirim terlambat/);
  assert.match(markup, /Diterima/);
  assert.match(markup, /pH Air/);
});

test('a selected package sensor hides all other sensor columns and readings', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { default: LogTable } = await vite.ssrLoadModule('/src/components/iot/LogTable.jsx');
  const markup = renderToStaticMarkup(React.createElement(LogTable, {
    selectedSensor: 'ph',
    sensors: [
      { code: 'ph', name: 'pH Air', unit: 'pH' },
      { code: 'tds', name: 'TDS', unit: 'ppm' },
      { code: 'water_temperature', name: 'Suhu air', unit: '°C' },
    ],
    points: [{
      messageId: 'message-1',
      measuredAt: '2026-10-15T10:00:00.000Z',
      receivedAt: '2026-10-15T10:00:01.000Z',
      readings: [{ sensor: 'ph', value: 6.8, unit: 'pH', state: 'normal' }],
    }],
  }));

  assert.match(markup, /pH Air/);
  assert.doesNotMatch(markup, /TDS|Suhu air|ppm|°C/);

  const allSensorsMarkup = renderToStaticMarkup(React.createElement(LogTable, {
    sensors: [
      { code: 'ph', name: 'pH Air', unit: 'pH' },
      { code: 'tds', name: 'TDS', unit: 'ppm' },
      { code: 'water_temperature', name: 'Suhu air', unit: '°C' },
    ],
    points: [{
      messageId: 'message-2',
      measuredAt: '2026-10-15T10:00:00.000Z',
      receivedAt: '2026-10-15T10:00:01.000Z',
      readings: [],
    }],
  }));
  assert.match(allSensorsMarkup, /TDS/);
  assert.match(allSensorsMarkup, /Suhu air/);
});
