import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
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
        return `${source}\nexport { Shell, TITLES };`;
      }
      return null;
    },
  };
}

function exposeMonitoringForTests() {
  return {
    name: 'expose-monitoring-presentation-for-tests',
    transform(source, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/pages/Monitoring.jsx')) {
        return `${source}\nexport { TABS, nextTabId, Sparkline, ComparisonChart, EventLogPanel, ErrorPanel };`;
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

test('Monitoring menus share the route and has exactly three category tabs', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [exposeShellForRouteTests(), exposeMonitoringForTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());

  const [{ TITLES }, { MENUS }, { TABS, nextTabId }] = await Promise.all([
    vite.ssrLoadModule('/src/SmartApp.jsx'),
    vite.ssrLoadModule('/src/components/SmartSidebar.jsx'),
    vite.ssrLoadModule('/src/pages/Monitoring.jsx'),
  ]);
  assert.deepEqual(TABS.map(tab => tab.label), ['Per paket', 'Per sensor', 'Per area']);
  assert.equal(nextTabId('package', 'ArrowLeft'), 'area');
  assert.equal(nextTabId('package', 'ArrowRight'), 'sensor');
  assert.equal(nextTabId('sensor', 'Home'), 'package');
  assert.equal(nextTabId('sensor', 'End'), 'area');
  assert.equal(nextTabId('package', 'Enter'), null);
  assert.equal(TITLES.find(item => item.path === '/monitoring')?.title, 'Monitoring');
  for (const role of ['pengguna', 'pengelola']) {
    assert.ok(MENUS[role].some(section => section.items.some(item => item.to === '/monitoring' && item.attention)));
  }

});

test('Monitoring renders its initial API loading state inside SmartProvider', async t => {
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

  const [{ default: Monitoring }, { SmartProvider }] = await Promise.all([
    vite.ssrLoadModule('/src/pages/Monitoring.jsx'),
    vite.ssrLoadModule('/src/store/SmartStore.jsx'),
  ]);
  const markup = renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: ['/monitoring'] },
    React.createElement(SmartProvider, null, React.createElement(Monitoring)),
  ));

  assert.match(markup, /Memuat perangkat dan jenis sensor/);
});

test('Monitoring retains a filterable, paginated event panel with four request states', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [exposeMonitoringForTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  const { EventLogPanel } = await vite.ssrLoadModule('/src/pages/Monitoring.jsx');
  const defaults = {
    events: [],
    eventCursor: null,
    eventDeviceId: '',
    eventType: '',
    eventState: 'loading',
    eventError: '',
    loadingMoreEvents: false,
    liveDevices: [{ id: 'device-1', name: 'Kolam', code: 'AQ-PH-001' }],
    sensorTypes: [],
    deviceById: new Map(),
    onDeviceChange() {},
    onTypeChange() {},
    onRetry() {},
    onLoadMore() {},
  };
  const render = props => renderToStaticMarkup(React.createElement(EventLogPanel, { ...defaults, ...props }));

  assert.match(render({ eventState: 'loading' }), /Memuat log kejadian/);
  assert.match(render({ eventState: 'ready' }), /Belum ada kejadian/);
  assert.match(render({ eventState: 'error', eventError: 'API gagal' }), /API gagal/);
  assert.match(render({
    eventState: 'ready',
    eventCursor: 'cursor-1',
    events: [{ id: '8', deviceId: 'device-1', type: 'offline', at: '2026-10-06T00:00:00Z' }],
  }), /Tidak terhubung/);
  assert.match(render({ eventState: 'ready' }), /Perangkat/);
  assert.match(render({ eventState: 'ready' }), /Jenis kejadian/);
  assert.match(render({ eventState: 'ready', eventCursor: 'cursor-1' }), /Muat kejadian sebelumnya/);
});

test('Monitoring error panel exposes and invokes its retry action', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [exposeMonitoringForTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  const { ErrorPanel } = await vite.ssrLoadModule('/src/pages/Monitoring.jsx');
  let attempts = 0;
  const panel = ErrorPanel({ message: 'API gagal', onRetry: () => { attempts += 1; } });
  const children = React.Children.toArray(panel.props.children);
  assert.match(renderToStaticMarkup(panel), /Coba lagi/);
  children.find(child => child?.props?.children === 'Coba lagi')?.props.onClick();
  assert.equal(attempts, 1);
});

test('DeviceClaim clears valid manual input and relies on activation memory for claim state', async () => {
  const source = await readFile(new URL('./pages/DeviceClaim.jsx', import.meta.url), 'utf8');
  const submit = source.match(/function submitActivationCode\(event\) \{([\s\S]*?)\n  \}/)?.[1] || '';

  assert.match(submit, /setManualActivationCode\(''\)/);
  assert.match(submit, /activationCodeMemory\.set\(code, value\)/);
  assert.doesNotMatch(submit, /setActivationCode\(/);
  assert.match(source, /state=\{\{ from: returnToQr \}\}/);
  assert.ok(source.includes('const returnToQr = location.pathname;'));
  assert.match(source, /pathname: location\.pathname[\s\S]*replace: true/);
  assert.match(source, /safeSearch\.delete\('c'\)/);
  assert.ok(source.includes("if (!currentCode) {\n      setManualActivationCode('');"));
});

test('Monitoring recovery views wire bounded retries for latest, comparison, and area failures', async () => {
  const source = await readFile(new URL('./pages/Monitoring.jsx', import.meta.url), 'utf8');

  assert.ok(source.includes('latestRunner.current.isRunning()'));
  assert.ok(source.includes('latestError && <ErrorPanel message={latestError} onRetry={retryLatest} />'));
  assert.ok(source.includes('comparisonRunner.current.isRunning()'));
  assert.ok(source.includes('onClick={retryComparison}>Coba lagi</Button>'));
  assert.ok(source.includes("if (areaState === 'error') return <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />;"));
  assert.ok(source.includes('{areaError && <ErrorPanel message={areaError} onRetry={() => areaRefreshActionRef.current?.()} />}'));
  assert.ok(source.includes('AREA_HISTORY_REFRESH_MS - (now - lastAreaRefreshAt.current)'));
});

test('comparison chart uses statically discoverable token classes for all three series', async t => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    define: { 'import.meta.env.VITE_IOT_SOURCE': JSON.stringify('api') },
    plugins: [exposeMonitoringForTests(), react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  const { ComparisonChart } = await vite.ssrLoadModule('/src/pages/Monitoring.jsx');
  const series = ['one', 'two', 'three'].map(id => ({
    device: { id, name: id },
    history: { points: [{ avg: 1, min: 0.5, max: 1.5 }, { avg: 2, min: 1.5, max: 2.5 }] },
  }));
  const markup = renderToStaticMarkup(React.createElement(ComparisonChart, { series, sensor: { name: 'pH', unit: 'pH' } }));
  for (const className of ['stroke-primary', 'stroke-tertiary', 'stroke-secondary', 'text-primary', 'text-tertiary', 'text-secondary']) {
    assert.ok(markup.includes(className), `${className} should be present for Tailwind scanning`);
  }
  assert.ok(markup.includes('aria-label="Perbandingan pH 24 jam terakhir: one min'));
  assert.ok(markup.includes('maks'));
});

test('badge perhatian memakai status polite dan tidak tampil saat nol', async t => {
  const vite = await createServer({ root: process.cwd(), configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  t.after(() => vite.close());
  const { default: AttentionBadge } = await vite.ssrLoadModule('/src/components/iot/AttentionBadge.jsx');
  const positive = renderToStaticMarkup(React.createElement(AttentionBadge, { count: 2 }));
  assert.match(positive, /role="status"/);
  assert.match(positive, /aria-live="polite"/);
  assert.match(positive, /aria-label="\[2\] kejadian perlu perhatian"/);
  assert.equal(renderToStaticMarkup(React.createElement(AttentionBadge, { count: 0 })), '');
});

test('state sensor selalu menampilkan ikon sesuai arah dan teks yang bermakna', async t => {
  const vite = await createServer({ root: process.cwd(), configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  t.after(() => vite.close());
  const { default: SensorStateBadge } = await vite.ssrLoadModule('/src/components/iot/SensorStateBadge.jsx');
  for (const [state, icon, label] of [
    ['normal', 'check_circle', 'Normal'],
    ['low', 'arrow_downward', 'Di bawah ambang'],
    ['high', 'arrow_upward', 'Di atas ambang'],
    ['unknown', 'remove', 'Tanpa ambang'],
  ]) {
    const markup = renderToStaticMarkup(React.createElement(SensorStateBadge, { state }));
    assert.ok(markup.includes(icon));
    assert.ok(markup.includes(label));
  }
});
