import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('loading and error views keep the detail link and announce their state', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { DeviceLogState } = await vite.ssrLoadModule('/src/pages/DeviceLog.jsx');
  const renderState = props => renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: ['/iot/123e4567-e89b-12d3-a456-426614174000/log'] },
    React.createElement(DeviceLogState, { id: '123e4567-e89b-12d3-a456-426614174000', ...props }),
  ));

  const loading = renderState({ loading: true });
  assert.match(loading, /href="\/iot\/123e4567-e89b-12d3-a456-426614174000"/);
  assert.match(loading, /role="status"[^>]*>Memuat log\.\.\./);

  const error = renderState({ error: 'Backend tidak tersedia.' });
  assert.match(error, /href="\/iot\/123e4567-e89b-12d3-a456-426614174000"/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Backend tidak tersedia\./);
});
