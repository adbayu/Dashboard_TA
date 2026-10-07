import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const ui = readFileSync(new URL('./components/ui.jsx', import.meta.url), 'utf8');
const listIot = readFileSync(new URL('./pages/ListIot.jsx', import.meta.url), 'utf8');
const adminIot = readFileSync(new URL('./pages/admin/AdminIotPage.jsx', import.meta.url), 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = [...source.matchAll(new RegExp(`(?:^|[{}])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'gs'))];
  assert.ok(matches.length, `Missing CSS rule for ${selector}`);
  return matches.at(-1)[1];
}

function declaration(selector, property) {
  const match = rule(selector).match(new RegExp(`${property}:\\s*([^;]+)`));
  assert.ok(match, `Missing ${property} in ${selector}`);
  return match[1].trim();
}

function parseColor(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const fullHex = hex.length === 3 ? [...hex].map(channel => channel + channel).join('') : hex;
    return [...fullHex.matchAll(/.{2}/g)].map(([channel]) => parseInt(channel, 16));
  }
  const channels = value.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(Number);
  assert.ok(channels?.length >= 3, `Unsupported CSS color: ${value}`);
  return channels;
}

function composite(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

function luminance(color) {
  const [red, green, blue] = color.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertBoundary(selector, background, property = 'border') {
  const border = declaration(selector, property).match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(Number);
  assert.ok(border?.length === 4, `Expected an alpha border in ${selector}`);
  const edge = composite(border.slice(0, 3), parseColor(background), border[3]);
  assert.ok(contrast(edge, parseColor(background)) >= 3, `${selector} boundary must reach 3:1`);
}

test('input borders meet non-text contrast in light and dark themes', () => {
  assertBoundary('.glass-input', '#FFFFFF');
  assertBoundary('.dark .glass-input', '#232A26');
});

test('dark primary and danger button states retain boundary and text contrast', () => {
  const primary = parseColor(declaration('.dark .button-primary', 'background-color'));
  const primaryHover = parseColor(declaration('.dark .button-primary:hover', 'background-color'));
  const dangerHover = parseColor(declaration('.dark .button-danger:hover', 'background-color'));
  const surface = parseColor('#171C19');
  const white = parseColor('#FFFFFF');

  for (const [label, background] of [['primary', primary], ['primary hover', primaryHover], ['danger hover', dangerHover]]) {
    assert.ok(contrast(background, surface) >= 3, `${label} boundary must reach 3:1`);
    assert.ok(contrast(white, background) >= 4.5, `${label} text must reach 4.5:1`);
  }
});

test('ghost buttons have visible boundaries in both themes', () => {
  assertBoundary('.button-ghost', '#FFFFFF', 'border-color');
  assertBoundary('.button-ghost:hover', '#FFFFFF', 'border-color');
  assertBoundary('.dark .button-ghost', '#1D221F', 'border-color');
  assertBoundary('.dark .button-ghost:hover', '#1D221F', 'border-color');
});

test('IoT control boundaries meet 3:1 after compositing over the page gradient', () => {
  const cases = [
    { selector: '.iot-touch-targets .button-ghost', fill: '.panel-inset', border: 'border-color', page: '#C4D3DB' },
    { selector: '.dark .iot-touch-targets .button-ghost', fill: '.dark .panel-inset', border: 'border-color', page: '#0D1210' },
    { selector: '.iot-touch-targets .glass-input', fill: '.glass-input', fillProperty: 'background', border: 'border-color', page: '#C4D3DB' },
    { selector: '.dark .iot-touch-targets .glass-input', fill: '.dark .glass-input', fillProperty: 'background', border: 'border-color', page: '#0D1210' },
  ];

  for (const { selector, fill: fillSelector, fillProperty = 'background-color', border: borderProperty, page: pageColor } of cases) {
    const page = parseColor(pageColor);
    const fill = parseColor(declaration(fillSelector, fillProperty));
    const borderDeclaration = declaration(selector, borderProperty);
    const borderColor = borderDeclaration.match(/rgba?\([^)]+\)/)?.[0];
    assert.ok(borderColor, `Missing border color in ${selector}`);
    const border = parseColor(borderColor);
    const fillOnPage = composite(fill.slice(0, 3), page, fill[3]);
    const borderOnFill = composite(border.slice(0, 3), fillOnPage, border[3]);

    assert.ok(contrast(borderOnFill, fillOnPage) >= 3, `${selector} border must reach 3:1 against its composited fill`);
    assert.ok(contrast(borderOnFill, page) >= 3, `${selector} border must reach 3:1 against the page surface`);
  }
});

test('shared primary, ghost, and danger variants opt into the measured theme rules', () => {
  for (const variant of ['primary', 'ghost', 'danger']) {
    const pattern = new RegExp(`${variant}:\\s*'[^']*\\bbutton-${variant}\\b`);
    assert.ok(pattern.test(ui), `${variant} button variant must opt into its contrast rule`);
  }
});

test('IoT primary actions and selected controls use the accessible dark fill', () => {
  assert.ok(listIot.includes('button-primary'), 'List IoT actions and selected controls need the dark primary rule');
  assert.ok(adminIot.includes('button-primary'), 'Kelola IoT selected tabs need the dark primary rule');
});

test('primary control fill is owned by the theme-aware component rule', () => {
  const primaryVariant = ui.match(/primary:\s*'([^']+)'/)?.[1];
  assert.ok(primaryVariant?.includes('button-primary'), 'Primary buttons need the component fill class');
  assert.doesNotMatch(primaryVariant, /(?:hover:)?bg-primary(?:-container)?\b/, 'Primary buttons must not layer generic fill utilities over the component fill');

  for (const [name, source] of [['List IoT', listIot], ['Kelola IoT', adminIot]]) {
    const primaryClasses = [...source.matchAll(/'([^']*button-primary[^']*)'|"([^"]*button-primary[^"]*)"|`([^`]*button-primary[^`]*)`/g)]
      .map(([, singleQuoted, doubleQuoted, templateLiteral]) => singleQuoted || doubleQuoted || templateLiteral);
    assert.ok(primaryClasses.length, `${name} must retain its primary controls`);
    assert.ok(primaryClasses.every(className => !/(?:^|\s)(?:hover:)?bg-primary(?:-container)?(?=\s|$)/.test(className)), `${name} primary controls must not layer generic fill utilities over the component fill`);
  }

  assert.equal(declaration('.button-primary', 'background-color'), '#0f5238');
  assert.equal(declaration('.button-primary:hover', 'background-color'), '#2d6a4f');
  assert.equal(declaration('.dark .button-primary', 'background-color'), '#3b7559');
  assert.equal(declaration('.dark .button-primary:hover', 'background-color'), '#41795b');
});
