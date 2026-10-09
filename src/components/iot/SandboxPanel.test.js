import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

test('SandboxLoadingState exposes a status while the sandbox loads', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { SandboxLoadingState } = await vite.ssrLoadModule('/src/components/iot/SandboxPanel.jsx');
  const markup = renderToStaticMarkup(React.createElement(SandboxLoadingState));

  assert.match(markup, /role="status"/);
  assert.match(markup, /Memuat device sandbox/);
});

test('Sandbox empty telemetry shows empty reading and event messages', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { SandboxReadingValue, SandboxEventMessage } = await vite.ssrLoadModule('/src/components/iot/SandboxPanel.jsx');
  const readingMarkup = renderToStaticMarkup(React.createElement(SandboxReadingValue, { reading: null }));
  const eventMarkup = renderToStaticMarkup(React.createElement(SandboxEventMessage, { event: null }));

  assert.match(readingMarkup, /Belum ada data/);
  assert.match(eventMarkup, /Belum ada kejadian/);
});

test('SandboxErrorAlert exposes the error and retries when requested', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { SandboxErrorAlert } = await vite.ssrLoadModule('/src/components/iot/SandboxPanel.jsx');
  const errorMessage = 'Sandbox device tidak dapat dimuat';
  let retryCalled = false;
  const onRetry = () => {
    retryCalled = true;
  };
  const markup = renderToStaticMarkup(React.createElement(SandboxErrorAlert, {
    error: errorMessage,
    onRetry,
  }));

  assert.match(markup, /role="alert"/);
  assert.match(markup, new RegExp(errorMessage));
  assert.match(markup, /Coba lagi/);

  const alertTree = SandboxErrorAlert({ error: errorMessage, onRetry });
  const children = React.Children.toArray(alertTree.props.children);
  children.find(child => child?.props?.children === 'Coba lagi')?.props.onClick();
  assert.equal(retryCalled, true);
});
