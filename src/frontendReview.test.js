import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { jsxDEV } from 'react/jsx-dev-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, useLocation } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import viteConfig from '../vite.config.js';

function exposeShellForRouteTests() {
  return {
    name: 'expose-smart-app-shell-for-route-tests',
    transform(source, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/SmartApp.jsx')) {
        return `${source}\nexport { Shell };`;
      }
      return null;
    },
  };
}

function exposeStreamStatusForTests() {
  return {
    name: 'expose-list-iot-stream-status-for-tests',
    transform(source, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/pages/ListIot.jsx')) {
        return `${source}\nexport { StreamStatus };`;
      }
      return null;
    },
  };
}

test('Field connects the visible label to a control nested in a wrapper', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { Field, Input } = await vite.ssrLoadModule('/src/components/ui.jsx');
  const markup = renderToStaticMarkup(React.createElement(
    Field,
    { label: 'Password' },
    React.createElement('div', { className: 'relative' }, React.createElement(Input, { type: 'password' })),
  ));
  const labelId = markup.match(/<label[^>]* for="([^"]+)"/)?.[1];
  const inputId = markup.match(/<input[^>]* id="([^"]+)"/)?.[1];

  assert.ok(labelId, 'label should reference a control id');
  assert.equal(inputId, labelId);
  assert.doesNotMatch(markup, /<div[^>]* id="[^"]+"/);
});

test('List IoT stream status is announced politely as a status region', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [exposeStreamStatusForTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { StreamStatus } = await vite.ssrLoadModule('/src/pages/ListIot.jsx');
  const markup = renderToStaticMarkup(React.createElement(StreamStatus, { status: 'polling' }));

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /Diperbarui tiap 30 detik/);
});

test('Field links the label to the input in a two-control wrapper without a key warning', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { Field, Input } = await vite.ssrLoadModule('/src/components/ui.jsx');
  const warnings = [];
  const originalError = console.error;
  let markup;
  try {
    console.error = (...args) => warnings.push(args.join(' '));
    const passwordControls = jsxDEV('div', {
      className: 'relative',
      children: [
        jsxDEV(Input, { type: 'password' }, undefined, false),
        jsxDEV('button', { type: 'button', children: 'Show password' }, undefined, false),
      ],
    }, undefined, true);
    markup = renderToStaticMarkup(React.createElement(
      Field,
      { label: 'Password' },
      passwordControls,
    ));
  } finally {
    console.error = originalError;
  }

  const labelId = markup.match(/<label[^>]* for="([^"]+)"/)?.[1];
  const inputId = markup.match(/<input[^>]* id="([^"]+)"/)?.[1];
  assert.ok(labelId, 'label should reference a control id');
  assert.equal(inputId, labelId);
  assert.match(markup, /<button[^>]*>Show password<\/button>/);
  assert.doesNotMatch(warnings.join('\n'), /Each child in a list should have a unique ["']key["'] prop/);
});

test('area filter options come only from distinct non-empty adapter areaRefs', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { areaFilterOptions } = await vite.ssrLoadModule('/src/utils/frontendReview.js');
  assert.deepEqual(areaFilterOptions?.([
    { areaRef: 'Kolam 1' },
    { areaRef: 'Kolam 1' },
    { areaRef: ' Growbed A ' },
    { areaRef: '' },
    {},
  ]), [
    { value: 'Kolam 1', label: 'Kolam 1' },
    { value: 'Growbed A', label: 'Growbed A' },
  ]);
});

test('password editor remains demo-only', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { passwordChangeAvailable } = await vite.ssrLoadModule('/src/utils/frontendReview.js');
  assert.equal(passwordChangeAvailable?.('local'), true);
  assert.equal(passwordChangeAvailable?.('api'), false);
});

test('Developer data controls are enabled only in API mode', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { developerDataEnabled } = await vite.ssrLoadModule('/src/utils/frontendReview.js');
  assert.equal(developerDataEnabled?.('local'), false);
  assert.equal(developerDataEnabled?.('api'), true);
});

test('Developer links to OpenAPI JSON in a new tab and Vite proxies docs to the backend', async t => {
  const resolvedViteConfig = viteConfig({ mode: 'test', command: 'serve' });
  assert.equal(resolvedViteConfig.server.proxy['/docs'], 'http://127.0.0.1:3001');

  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const [{ default: Developer }, { SmartProvider }] = await Promise.all([
    vite.ssrLoadModule('/src/pages/Developer.jsx'),
    vite.ssrLoadModule('/src/store/SmartStore.jsx'),
  ]);
  const markup = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: ['/developer'] },
    React.createElement(SmartProvider, null, React.createElement(Developer)),
  ));

  assert.match(markup, /<a[^>]*href="\/docs\/openapi\.json"[^>]*target="_blank"[^>]*>Referensi API<\/a>/);
  assert.match(markup, /rel="noopener noreferrer"/);
});

test('admin claim state does not infer ownership from the cross-owner device list', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const { claimedDeviceState } = await vite.ssrLoadModule('/src/utils/frontendReview.js');
  const devices = [{ id: 'device-1', code: 'AQ-PH-001' }];
  assert.deepEqual(claimedDeviceState?.('pengelola', devices, 'AQ-PH-001'), { state: 'claimed', deviceId: '' });
  assert.deepEqual(claimedDeviceState?.('pengguna', devices, 'AQ-PH-001'), { state: 'own', deviceId: 'device-1' });
  assert.deepEqual(claimedDeviceState?.('pengguna', [], 'AQ-PH-001'), { state: 'other', deviceId: '' });
});

test('API shell preserves protected and public routes while session hydration is pending', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [exposeShellForRouteTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const [{ Shell }, { SmartProvider }] = await Promise.all([
    vite.ssrLoadModule('/src/SmartApp.jsx'),
    vite.ssrLoadModule('/src/store/SmartStore.jsx'),
  ]);
  function CurrentPath() {
    return React.createElement('output', null, useLocation().pathname);
  }
  const renderAt = path => renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: [path] },
    React.createElement(SmartProvider, null, React.createElement(React.Fragment, null,
      React.createElement(Shell),
      React.createElement(CurrentPath),
    )),
  ));

  for (const path of ['/developer', '/iot']) {
    const markup = renderAt(path);
    assert.match(markup, /role="status">Memeriksa sesi\.\.\./);
    assert.ok(markup.includes(`<output>${path}</output>`));
  }

  const loginMarkup = renderAt('/masuk');
  assert.match(loginMarkup, /Masuk ke dashboard aquaponik Anda/);
  assert.doesNotMatch(loginMarkup, /Memeriksa sesi\.\.\./);
  assert.ok(loginMarkup.includes('<output>/masuk</output>'));
  const qrMarkup = renderAt('/d/public-code');
  assert.match(qrMarkup, /Masukkan kode aktivasi/);
  assert.match(qrMarkup, /id="manual-activation-code"/);
  assert.doesNotMatch(qrMarkup, /Memuat informasi QR\.\.\./);
  assert.doesNotMatch(qrMarkup, /Memeriksa sesi\.\.\./);
  assert.ok(qrMarkup.includes('<output>/d/public-code</output>'));
  const qrWithCodeMarkup = renderAt('/d/public-code?c=unit-test-token');
  assert.doesNotMatch(qrWithCodeMarkup, /unit-test-token/);
  assert.ok(qrWithCodeMarkup.includes('<output>/d/public-code</output>'));
});
