import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

// Komponen bersama dirender SSR lewat Vite (sama seperti frontendReview.test.js)
// supaya JSX dan alias CSS ditangani persis seperti di aplikasi.
let vite;
let ui;

before(async () => {
  vite = await createServer({
    root: process.cwd(),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  ui = await vite.ssrLoadModule('/src/shared/components/ui.jsx');
});

after(() => vite?.close());

const h = React.createElement;
const render = (type, props, ...children) => renderToStaticMarkup(h(type, props, ...children));
const classOf = (markup, tag) => markup.match(new RegExp(`<${tag}\\b[^>]* class="([^"]*)"`))?.[1] ?? '';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Button primary uses theme tokens instead of the old glow', () => {
  const markup = render(ui.Button, { variant: 'primary' }, 'Simpan');
  const cls = classOf(markup, 'button');
  assert.match(cls, /\bbg-primary\b/);
  assert.match(cls, /\btext-on-primary\b/);
  assert.doesNotMatch(cls, /shadow-emerald-glow/);
  assert.match(cls, /\bh-10\b/, 'md height comes from UKURAN');
  assert.match(cls, /\bfocus-visible:ring-focus\b/);
});

test('Button maps legacy variant "soft" to secondary and keeps the size scale', () => {
  const soft = classOf(render(ui.Button, { variant: 'soft', size: 'sm' }, 'Ubah'), 'button');
  const secondary = classOf(render(ui.Button, { variant: 'secondary', size: 'sm' }, 'Ubah'), 'button');
  assert.equal(soft, secondary);
  assert.match(soft, /\bh-8\b/);
  assert.match(classOf(render(ui.Button, { size: 'lg' }, 'Klaim'), 'button'), /\bh-11\b/);
});

test('StatusPill renders an icon and text', () => {
  const markup = render(ui.StatusPill, { tone: 'warn', icon: 'triangle-alert' }, 'Di atas batas');
  assert.match(markup, /<svg/);
  assert.match(markup, /Di atas batas/);
  assert.match(markup, /text-warn-fg/);
  assert.match(markup, /data-ui="pill"/);
});

test('Badge accepts legacy tone names and lucide icon names', () => {
  const brand = render(ui.Badge, { tone: 'brand', icon: 'shield-user' }, 'Pengelola');
  assert.match(brand, /<svg/);
  assert.match(brand, /Pengelola/);
  assert.match(brand, /text-info-fg/);
  assert.match(render(ui.Badge, { tone: 'success' }, 'Ok'), /text-ok-fg/);
  assert.match(render(ui.Badge, { tone: 'error' }, 'Galat'), /text-bad-fg/);
  assert.match(render(ui.Badge, { tone: 'tidak-dikenal' }, 'X'), /text-text-2/);
  assert.match(render(ui.Badge, {}, 'Belum'), /text-text-2/);
});

test('Alert bad is announced as an alert with title, body, and action', () => {
  const markup = render(ui.Alert, { tone: 'bad', title: 'Alat terputus', action: h('button', null, 'Coba lagi') }, 'Periksa kabel daya.');
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Alat terputus/);
  assert.match(markup, /Periksa kabel daya\./);
  assert.match(markup, /Coba lagi/);
  assert.match(markup, /<svg/);
  assert.match(markup, /bg-bad-bg/);
  assert.match(render(ui.Alert, { tone: 'info' }, 'Info'), /role="status"/);
});

test('SectionTitle ignores the legacy eyebrow prop', () => {
  const markup = render(ui.SectionTitle, { eyebrow: 'XEYEBROWX', title: 'Ringkasan', subtitle: 'Hari ini' });
  assert.doesNotMatch(markup, /XEYEBROWX/);
  assert.match(markup, /Ringkasan/);
  assert.match(markup, /Hari ini/);
  assert.doesNotMatch(markup, /uppercase/);
});

test('Card exposes stable theme hooks for theme-surfaces.css', () => {
  const water = render(ui.Card, { area: 'water', title: 'Kolam Nila', subtitle: '120 ekor' }, 'isi');
  assert.match(water, /data-area="water"/);
  assert.match(water, /data-ui="card"/);
  assert.match(water, /data-ui="card-head"/);
  assert.match(water, /Kolam Nila/);
  const plain = render(ui.Card, { pad: 'sm', className: 'extra' }, 'isi');
  assert.match(plain, /data-area="neutral"/);
  assert.match(plain, /\bp-4\b/);
  assert.match(plain, /\bextra\b/);
  assert.match(plain, /rounded-card/);
  assert.match(render(ui.Card, { as: 'article' }, 'isi'), /^<article/);
});

test('form controls use the text-2 line and the focus token', () => {
  const input = classOf(render(ui.Input, { value: 'a', onChange() {} }), 'input');
  assert.match(input, /\bborder-text-2\b/);
  assert.match(input, /\bh-10\b/);
  assert.match(input, /\bfocus-visible:ring-focus\b/);
  const field = render(ui.Field, { label: 'Nama', hint: 'Wajib diisi' }, h(ui.Input, { value: '' }));
  const labelClass = classOf(field, 'label');
  assert.doesNotMatch(labelClass, /uppercase/);
  const id = field.match(/<label[^>]* for="([^"]+)"/)?.[1];
  assert.ok(id);
  assert.match(field, new RegExp(`<input[^>]* id="${id.replace(/[:]/g, '\\$&')}"`));
});

test('theme-surfaces.css holds the per-theme treatments and is imported', () => {
  const surfaces = read('../../app/styles/theme-surfaces.css');
  const index = read('../../app/styles/index.css');
  assert.match(index, /@import\s+["']\.\/theme-surfaces\.css["']/);
  assert.match(surfaces, /@supports\s*\(\s*\(?\s*backdrop-filter:\s*blur\(1px\)/);
  assert.match(surfaces, /\[data-theme="lumina"\]/);
  assert.match(surfaces, /\[data-theme="catatan-lapangan"\]/);
  assert.match(surfaces, /\[data-theme="kebun-air"\]/);
  assert.match(surfaces, /prefers-reduced-motion/);
  assert.doesNotMatch(surfaces, /#[0-9a-f]{3,8}\b/i, 'colours come from tokens only');
});

test('index.css drops the old glass, gradient, dark hacks, and legacy shims', () => {
  const css = read('../../app/styles/index.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.dark\s+\.text-/);
  assert.doesNotMatch(css, /\.dark/);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur/);
  assert.doesNotMatch(css, /gradient\(/);
  for (const lama of ['.glass-card', '.glass-panel', '.glass-input', '.panel-inset', '.button-primary', '.button-ghost', '.button-danger', '.material-symbols-outlined', '.kat-icon']) {
    assert.ok(!css.includes(lama), `${lama} sudah dihapus dari index.css`);
  }
  assert.doesNotMatch(css, /--c-outline-variant|--c-on-surface-variant/, 'alias variabel warna lama sudah dihapus');
});

test('shared component sources contain no raw colours', () => {
  const dir = new URL('./ui/', import.meta.url);
  const files = readdirSync(dir).filter(name => /\.(jsx?|js)$/.test(name) && !name.includes('.test.'));
  assert.ok(files.length >= 10);
  const raw = /#[0-9a-f]{3,8}\b|rgba?\(|\b(?:bg|text|border|ring|from|to|via)-(?:red|amber|emerald|sky|green|yellow|blue|slate|gray|zinc|stone|white|black)\b|bg-gradient|material-symbols/i;
  for (const name of files) {
    const hit = read(`./ui/${name}`).match(raw);
    assert.equal(hit, null, `${name} uses a raw colour: ${hit?.[0]}`);
  }
});

test('legacy exports keep rendering with their current call-site props', () => {
  const noop = () => {};
  const cases = {
    Badge: () => render(ui.Badge, { tone: 'ok', icon: 'circle-check', className: 'ml-2' }, 'Terhubung'),
    Empty: () => render(ui.Empty, { icon: 'inbox', title: 'Belum ada data', hint: 'Tambahkan alat.', action: h('button', null, 'Tambah') }),
    Card: () => render(ui.Card, { pad: 'sm', className: 'flex' }, 'isi'),
    Button: () => render(ui.Button, { variant: 'ghost', size: 'sm', icon: 'pencil', onClick: noop, disabled: true, type: 'submit', title: 'Ubah' }, 'Ubah'),
    SectionTitle: () => render(ui.SectionTitle, { eyebrow: 'E', title: 'Judul', subtitle: 'Sub', action: h('button', null, 'Aksi') }),
    Field: () => render(ui.Field, { label: 'Label', hint: 'Petunjuk', className: 'col-span-2' }, h(ui.Input, { value: 'x', onChange: noop })),
    Input: () => render(ui.Input, { value: undefined, onChange: noop, placeholder: 'Cari', type: 'search', className: 'w-40' }),
    Table: () => render(ui.Table, { head: ['Nama', 'Status'] }, h('tr', null, h('td', null, 'A'), h('td', null, 'B'))),
    StatCard: () => render(ui.StatCard, { label: 'Alat', value: 3, unit: 'unit', icon: 'radio', hint: 'Terhubung', tone: 'warn' }),
    Select: () => render(ui.Select, { value: 'a', onChange: noop, options: [{ value: 'a', label: 'A' }], placeholder: 'Pilih' }),
    Modal: () => render(ui.Modal, { open: true, onClose: noop, title: 'Tambah', wide: true }, 'isi'),
    IconButton: () => render(ui.IconButton, { icon: 'trash-2', onClick: noop, title: 'Hapus', tone: 'bad', size: 'sm' }),
    NumberInput: () => render(ui.NumberInput, { value: 4, onChange: noop, min: 0 }),
    Bar: () => render(ui.Bar, { value: 40, max: 80, tone: 'warn', label: 'Kenyang' }),
    Avatar: () => render(ui.Avatar, { avatar: { id: 'a', warna: 'var(--x)', warnaTeks: 'var(--y)' }, nama: 'Budi Santoso', size: 40, className: 'x' }),
    AvatarPilih: () => render(ui.AvatarPilih, { avatar: null, nama: 'Budi', terpilih: true, onClick: noop }),
    AksiBaris: () => render(ui.AksiBaris, null, h('button', null, 'a')),
    TextArea: () => render(ui.TextArea, { value: 'catatan', onChange: noop, rows: 3 }),
  };
  for (const [name, renderCase] of Object.entries(cases)) {
    assert.equal(typeof ui[name], 'function', `${name} must stay exported`);
    const markup = renderCase();
    assert.ok(markup.length > 0, `${name} renders markup`);
    assert.doesNotMatch(markup, /material-symbols/, `${name} uses Icon, not the icon font`);
  }

  assert.deepEqual(ui.STATUS_TONE, { online: 'ok', warning: 'warn', maintenance: 'info', offline: 'bad' });
  assert.equal(ui.STATUS_LABEL.offline, 'Tidak terhubung');
  assert.deepEqual(Object.keys(ui.UKURAN), ['sm', 'md', 'lg']);

  const modal = cases.Modal();
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-label="Tutup"/);
  assert.equal(render(ui.Modal, { open: false, onClose: noop, title: 'x' }, 'isi'), '');

  const bar = cases.Bar();
  assert.match(bar, /role="progressbar"/);
  assert.match(bar, /aria-valuenow="50"/);
  assert.match(bar, /bg-track/);

  const avatar = cases.Avatar();
  assert.match(avatar, />BS</);
  assert.match(render(ui.Avatar, { nama: 'Ani' }), /bg-primary/);

  const table = cases.Table();
  assert.match(classOf(table, 'th'), /\buppercase\b/, 'uppercase only in table headers');
});

test('Bar fills with the tone colour on the track, never the pale band', () => {
  const fillOf = props => render(ui.Bar, { value: 50, label: 'Progres', ...props })
    .match(/data-ui="bar-fill"[^>]* class="([^"]*)"|class="([^"]*)"[^>]* data-ui="bar-fill"/)
    ?.slice(1).find(Boolean) ?? '';
  for (const [tone, expected] of [[undefined, 'bg-primary'], ['brand', 'bg-primary'], ['warn', 'bg-warn-fg'], ['bad', 'bg-bad-fg']]) {
    const markup = render(ui.Bar, { value: 50, label: 'Progres', tone });
    const fill = fillOf({ tone });
    assert.match(fill, new RegExp(`\\b${expected}\\b`), `tone ${tone} fills with ${expected}`);
    assert.doesNotMatch(markup, /\bbg-band\b/);
    assert.match(markup, /\bbg-track\b/);
  }
});

test('new design-system components are exported', () => {
  const noop = () => {};
  assert.equal(ui.EmptyState, ui.Empty);
  assert.equal(ui.Metric, ui.StatCard);
  assert.equal(ui.Badge, ui.StatusPill);

  const header = render(ui.PageHeader, { title: 'Pantauan', subtitle: '3 alat', actions: h('button', null, 'Unduh'), sample: true });
  assert.match(header, /<h1[^>]*>Pantauan<\/h1>/);
  assert.match(header, /Data contoh/);

  const tabs = render(ui.Tabs, { tabs: [{ id: 'a', label: 'Alat', count: 2 }, { id: 'b', label: 'Log' }], value: 'b', onChange: noop });
  assert.match(tabs, /role="tablist"/);
  assert.equal((tabs.match(/aria-selected="true"/g) || []).length, 1);
  assert.match(tabs, /<button[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*Log/s);

  const chip = render(ui.FilterChip, { active: true, onClick: noop }, 'Kolam');
  assert.match(chip, /aria-pressed="true"/);
  assert.match(classOf(chip, 'button'), /\bh-8\b/);

  const check = render(ui.Checkbox, { label: 'Ingat saya', checked: true, onChange: noop });
  assert.match(check, /type="checkbox"/);
  assert.match(check, /Ingat saya/);

  const sw = render(ui.Switch, { label: 'Notifikasi', checked: true, onChange: noop });
  assert.match(sw, /role="switch"/);
  assert.match(sw, /aria-checked="true"/);
});

test('Tabs keyboard: panah memutar, Home/End ke ujung, tombol lain diabaikan', async () => {
  const { tujuanTab } = await vite.ssrLoadModule('/src/shared/components/ui/tujuanTab.js');
  assert.equal(tujuanTab('ArrowRight', 0, 3), 1);
  assert.equal(tujuanTab('ArrowRight', 2, 3), 0, 'ArrowRight dari tab terakhir kembali ke awal');
  assert.equal(tujuanTab('ArrowLeft', 0, 3), 2, 'ArrowLeft dari tab pertama ke akhir');
  assert.equal(tujuanTab('ArrowLeft', 2, 3), 1);
  assert.equal(tujuanTab('Home', 2, 3), 0);
  assert.equal(tujuanTab('End', 0, 3), 2);
  assert.equal(tujuanTab('Enter', 1, 3), null);
  assert.equal(tujuanTab('ArrowRight', 0, 0), null, 'tanpa tab tidak ada tujuan');
  // Tabs memakai fungsi yang sama untuk onKeyDown, bukan salinan sendiri.
  assert.match(read('./ui/Tabs.jsx'), /tujuanTab\(event\.key, indeksAktif, tabs\.length\)/);
});

test('Avatar memetakan warna tersimpan ke keluarga token tanpa warna inline', () => {
  const pilihan = [
    ['#0f5238', 'leaf', /bg-leaf-bg text-leaf-fg/],
    ['#0f766e', 'water', /bg-water-bg text-water-fg/],
    ['#1e40af', 'water', /bg-water-bg text-water-fg/],
    ['#6d28d9', 'info', /bg-info-bg text-info-fg/],
    ['#b45309', 'warn', /bg-warn-bg text-warn-fg/],
    ['#9f1239', 'primary', /bg-primary text-on-primary/],
  ];
  for (const [warna, keluarga, kelas] of pilihan) {
    const markup = render(ui.Avatar, { avatar: { id: 'x', warna, warnaTeks: '#ffffff' }, nama: 'Budi Santoso', size: 'sm' });
    assert.match(markup, new RegExp(`data-family="${keluarga}"`), warna);
    assert.match(classOf(markup, 'span'), kelas, warna);
    assert.match(markup, />BS</);
    assert.doesNotMatch(markup, /background-color|[^-]color:|#[0-9a-f]{3,8}\b/i, `${warna}: tanpa warna inline`);
  }
  // Tanpa avatar, warna tak terbaca, atau abu-abu: keluarga bawaan primary.
  for (const avatar of [undefined, null, {}, { warna: 'var(--x)' }, { warna: '#808080' }]) {
    const markup = render(ui.Avatar, { avatar, nama: 'Budi' });
    assert.match(markup, /data-family="primary"/);
    assert.match(classOf(markup, 'span'), /\bbg-primary\b/);
  }
});

test('Avatar pengguna yang sama berwarna sama di semua tempat memakai prop avatar', () => {
  const dipakai = ['../../app/layout/SmartSidebar.jsx', '../../kelola-user/pages/AdminUsers.jsx', '../../profil-saya/pages/Profil.jsx', '../../masuk/pages/Login.jsx'];
  for (const berkas of dipakai) {
    const sumber = read(berkas);
    const tag = sumber.match(/<Avatar\b[^>]*>/)?.[0] || '';
    assert.match(tag, /avatar=\{/, `${berkas} meneruskan prop avatar`);
  }
});

test('Switch: aria-label opsional menggantikan nama aksesibel, teks tampak tetap', () => {
  const noop = () => {};
  const tanpa = render(ui.Switch, { label: 'Aktif', checked: true, onChange: noop });
  assert.doesNotMatch(tanpa, /aria-label=/);
  const dengan = render(ui.Switch, { label: 'Aktif', 'aria-label': 'Aktifkan aturan Isi data HPP area', checked: true, onChange: noop });
  assert.match(dengan, /aria-label="Aktifkan aturan Isi data HPP area"/);
  assert.match(dengan, /role="switch"/);
  assert.match(dengan, />Aktif<\/button>/, 'teks status tampak tetap');
});

test('kelas tautan-tombol diturunkan dari varian tombol (hanya :enabled yang berbeda)', async () => {
  const { kelasTombol } = await vite.ssrLoadModule('/src/shared/components/ui/tombol.js');
  for (const variant of ['primary', 'secondary', 'danger', 'ghost']) {
    const tombol = kelasTombol({ variant }).split(' ');
    const tautan = kelasTombol({ variant, tautan: true }).split(' ');
    const hoverTombol = tombol.filter(kelas => kelas.startsWith('enabled:hover:')).map(kelas => kelas.replace('enabled:hover:', 'hover:'));
    assert.ok(hoverTombol.length > 0, `${variant}: tombol punya hover`);
    for (const kelas of hoverTombol) assert.ok(tautan.includes(kelas), `${variant}: tautan memakai ${kelas}`);
    assert.ok(!tautan.some(kelas => kelas.startsWith('enabled:')), `${variant}: tautan tanpa :enabled`);
    assert.ok(!tautan.some(kelas => kelas.startsWith('disabled:')), `${variant}: tautan tanpa gaya nonaktif`);
  }
});
