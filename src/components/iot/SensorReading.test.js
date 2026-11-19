import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

async function loadModules(t) {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  t.after(() => vite.close());
  const [{ default: SensorReading }, { default: RangeBar }, { default: AreaSection }, { default: TaskList }] = await Promise.all([
    vite.ssrLoadModule('/src/components/iot/SensorReading.jsx'),
    vite.ssrLoadModule('/src/components/iot/RangeBar.jsx'),
    vite.ssrLoadModule('/src/components/iot/AreaSection.jsx'),
    vite.ssrLoadModule('/src/components/iot/TaskList.jsx'),
  ]);
  return { SensorReading, RangeBar, AreaSection, TaskList, vite };
}

const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('SensorReading above the limit shows warn text, icon, id-ID number, unit and a meter', async t => {
  const { SensorReading } = await loadModules(t);
  const markup = render(SensorReading, {
    name: 'TDS', icon: 'droplet', device: 'TDS-01', value: 1020, decimals: 0, unit: 'ppm', min: 600, max: 900, status: 'high',
  });
  assert.match(markup, /Di atas batas/);
  assert.match(markup, /data-icon="triangle-alert"/);
  assert.match(markup, /data-tone="warn"/);
  assert.match(markup, />1\.020</);
  assert.match(markup, />ppm</);
  assert.match(markup, /role="meter"[^>]*aria-valuenow="1020"|aria-valuenow="1020"[^>]*role="meter"/);
  assert.match(markup, /TDS-01/);
  assert.match(markup, /font-num/);
  assert.match(markup, /tabular-nums/);
});

test('SensorReading without a value says there is no data and renders no meter', async t => {
  const { SensorReading } = await loadModules(t);
  for (const status of ['unknown', 'normal', undefined]) {
    const markup = render(SensorReading, { name: 'pH', value: null, min: 6.5, max: 8, status });
    assert.match(markup, /Belum ada data/);
    assert.match(markup, /data-icon="circle-minus"/);
    assert.doesNotMatch(markup, /role="meter"/);
  }
});

test('SensorReading maps normal, low and stale to their texts and icons', async t => {
  const { SensorReading } = await loadModules(t);
  const base = { name: 'pH', value: 7.1, decimals: 1, unit: 'pH', min: 6.5, max: 8 };
  const normal = render(SensorReading, { ...base, status: 'normal' });
  assert.match(normal, /Normal/);
  assert.match(normal, /data-icon="circle-check"/);
  assert.match(normal, />7,1</);

  const low = render(SensorReading, { ...base, value: 6.1, status: 'low' });
  assert.match(low, /Di bawah batas/);
  assert.match(low, /data-icon="triangle-alert"/);

  const stale = render(SensorReading, { ...base, status: 'stale', measuredAt: '2020-01-01T00:00:00.000Z' });
  assert.match(stale, /Data tertunda/);
  assert.match(stale, /data-icon="clock"/);
  assert.match(stale, /data-tone="info"/);
  assert.match(stale, /Diukur/);
});

test('SensorReading without an icon uses the activity icon, not the fallback', async t => {
  const { SensorReading, vite } = await loadModules(t);
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  let markup;
  try {
    markup = render(SensorReading, { name: 'Sensor', value: 3, decimals: 0, status: 'normal' });
  } finally {
    console.warn = original;
  }
  assert.match(markup, /data-icon="activity"/);
  assert.equal(warnings.filter(text => text.includes('[Icon]')).length, 0);
  const { Activity, CircleHelp } = await import('lucide-react');
  const { ICON_MAP } = await vite.ssrLoadModule('/src/shared/components/Icon.jsx');
  assert.equal(ICON_MAP.activity, Activity);
  assert.notEqual(ICON_MAP.activity, CircleHelp);
});

test('SensorReading leaves tile or row to the theme unless variant forces it', async t => {
  const { SensorReading } = await loadModules(t);
  const props = { name: 'Suhu', value: 27, decimals: 1, status: 'normal' };
  assert.match(render(SensorReading, props), /data-variant="auto"/);
  assert.match(render(SensorReading, { ...props, variant: 'row' }), /data-variant="row"/);
  assert.match(render(SensorReading, { ...props, variant: 'tile' }), /data-variant="tile"/);
});

test('RangeBar exposes a meter with value, scale and an out-of-range marker in warn', async t => {
  const { RangeBar } = await loadModules(t);
  const out = render(RangeBar, { value: 1020, min: 600, max: 900, label: 'Batas 600 sampai 900 ppm', ariaLabel: 'Rentang TDS' });
  assert.match(out, /role="meter"/);
  assert.match(out, /aria-valuemin="300"/);
  assert.match(out, /aria-valuemax="1200"/);
  assert.match(out, /aria-valuenow="1020"/);
  assert.match(out, /aria-label="Rentang TDS"/);
  assert.match(out, /aria-valuetext="[^"]*di atas batas/);
  assert.match(out, /Batas 600 sampai 900 ppm/);
  assert.match(out, /data-ui="range-marker"[^>]*class="[^"]*bg-warn-fg|class="[^"]*bg-warn-fg[^"]*"[^>]*data-ui="range-marker"/);

  const inside = render(RangeBar, { value: 700, min: 600, max: 900, scaleMin: 0, scaleMax: 1500 });
  assert.match(inside, /aria-valuemin="0"/);
  assert.match(inside, /aria-valuemax="1500"/);
  assert.match(inside, /data-ui="range-marker"[^>]*class="[^"]*bg-marker|class="[^"]*bg-marker[^"]*"[^>]*data-ui="range-marker"/);
  assert.doesNotMatch(inside, /bg-warn-fg/);
});

test('RangeBar clamps the meter value into the scale and survives a missing value', async t => {
  const { RangeBar } = await loadModules(t);
  const beyond = render(RangeBar, { value: 5000, min: 600, max: 900, status: 'high' });
  assert.match(beyond, /aria-valuenow="1200"/);
  const none = render(RangeBar, { value: null, min: 600, max: 900 });
  assert.doesNotMatch(none, /aria-valuenow/);
  assert.doesNotMatch(none, /data-ui="range-marker"/);
});

test('AreaSection sets the area hook, default icon and meta; TaskList reflects done state', async t => {
  const { AreaSection, TaskList } = await loadModules(t);
  const section = renderToStaticMarkup(React.createElement(AreaSection, { area: 'water', title: 'Kolam A', meta: '120 ekor' }, React.createElement('p', null, 'isi')));
  assert.match(section, /data-ui="area-section"/);
  assert.match(section, /data-area="water"/);
  assert.match(section, /data-icon="fish"/);
  assert.match(section, /<h2[^>]*>Kolam A</);
  assert.match(section, /120 ekor/);
  assert.match(section, /isi/);
  assert.match(renderToStaticMarkup(React.createElement(AreaSection, { area: 'leaf', title: 'Growbed' })), /data-icon="sprout"/);

  const tasks = render(TaskList, { label: 'Tugas harian', items: [{ label: 'Beri pakan', done: true, note: 'Pukul 07.00' }, { label: 'Cek pH' }] });
  assert.match(tasks, /aria-label="Tugas harian"/);
  assert.equal((tasks.match(/role="checkbox"/g) || []).length, 2);
  assert.equal((tasks.match(/aria-checked="true"/g) || []).length, 1);
  assert.equal((tasks.match(/aria-checked="false"/g) || []).length, 1);
  assert.match(tasks, /Pukul 07\.00/);
  assert.match(tasks, /line-through/);
});

test('IoT components carry no literal colours or Material font icons', async () => {
  const files = ['SensorReading', 'RangeBar', 'AreaSection', 'TaskList', 'LiveIndicator', 'AttentionBadge', 'EventList', 'LogTable'];
  for (const name of files) {
    const source = await readFile(new URL(`./${name}.jsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /#[0-9a-fA-F]{6}\b/, `${name} has a hex colour`);
    assert.doesNotMatch(source, /\brgba?\(/, `${name} has an rgb() colour`);
    assert.doesNotMatch(source, /material-symbols-outlined/, `${name} still uses the Material font`);
    assert.doesNotMatch(source, /\b(?:text|bg|border)-(?:amber|emerald|red|green|slate|gray)-\d/, `${name} has a raw palette class`);
  }
});

test('SensorReading dengan nilai tetapi tanpa ambang menyebut ambang belum diatur, bukan Normal', async t => {
  const { SensorReading } = await loadModules(t);
  const markup = render(SensorReading, { name: 'pH', value: 7.1, decimals: 1, unit: 'pH', status: 'no-range' });
  assert.match(markup, /Ambang belum diatur/);
  assert.match(markup, /data-icon="circle-minus"/);
  assert.match(markup, /data-tone="muted"/);
  assert.match(markup, /data-status="no-range"/);
  assert.match(markup, />7,1</);
  assert.doesNotMatch(markup, />Normal</);
  assert.doesNotMatch(markup, /role="meter"/);
});
