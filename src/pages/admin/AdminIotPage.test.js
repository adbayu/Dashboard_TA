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

  const { RotationBusyState } = await vite.ssrLoadModule('/src/pages/admin/AdminIotPage.jsx');
  const markup = renderToStaticMarkup(React.createElement(RotationBusyState));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Merotasi credential/);
});
