import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test, mock } from 'node:test'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { CircleHelp, CircleCheck } from 'lucide-react'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))

// --- Pemindai nama ikon Material lama --------------------------------------

// Kandidat nama ikon: huruf kecil, angka, garis bawah/tanda hubung.
const NAMA = String.raw`[a-z][a-z0-9_-]*`

// Token hasil regex yang jelas bukan nama ikon. Setiap entri wajib punya alasan.
const BUKAN_IKON = new Map([
  // (kosong: belum ada false positive pada pemindaian saat ini)
])

function kumpulkanFile(dir, hasil = []) {
  for (const nama of readdirSync(dir)) {
    const path = join(dir, nama)
    if (statSync(path).isDirectory()) {
      // /pilot di luar cakupan peta ikon.
      if (relative(root, path).replaceAll('\\', '/') === 'src/pilot') continue
      kumpulkanFile(path, hasil)
    } else if (/\.(js|jsx)$/.test(nama) && !/\.test\.(js|jsx)$/.test(nama)) {
      hasil.push(path)
    }
  }
  return hasil
}

function literal(teks) {
  return [...teks.matchAll(new RegExp(String.raw`['"](${NAMA})['"]`, 'g'))].map((m) => m[1])
}

// Hanya literal pada posisi hasil kondisional (setelah ? atau :), bukan yang dibandingkan di kondisi.
function literalHasil(teks) {
  return [...teks.matchAll(new RegExp(String.raw`[?:]\s*['"](${NAMA})['"]`, 'g'))].map((m) => m[1])
}

function pindaiFile(sumber) {
  const nama = new Set()
  const tambah = (daftar) => daftar.forEach((n) => nama.add(n))

  // 1. icon="x" / icon: 'x' / icon={'x'} (nilai literal tunggal).
  for (const m of sumber.matchAll(new RegExp(String.raw`\bicon\s*[=:]\s*\{?\s*['"](${NAMA})['"]`, 'g'))) nama.add(m[1])

  // 2. Kondisional pada prop/properti icon: icon={ok ? 'a' : 'b'} atau icon: ok ? 'a' : 'b'.
  //    Ekspresi berhenti di } atau di awal properti berikutnya, supaya tone={x ? 'warn' : 'ok'} tidak ikut.
  for (const m of sumber.matchAll(/\bicon\s*[=:]\s*\{?\s*(?!['"])([^}\n]*)/g)) {
    tambah(literalHasil(m[1].split(/,\s*[A-Za-z_]+\s*:/)[0]))
  }

  // 3. Isi <span className="material-symbols-outlined ...">...</span> (teks, atau ekspresi dengan literal).
  for (const m of sumber.matchAll(/material-symbols-outlined[^>]*>([^<]*)</g)) {
    const isi = m[1].trim()
    if (new RegExp(`^${NAMA}$`).test(isi)) nama.add(isi)
    else tambah([...literalHasil(isi), ...[...isi.matchAll(new RegExp(String.raw`^\{\s*['"](${NAMA})['"]\s*\}$`, 'g'))].map((x) => x[1])])
  }

  // 4. Daftar konstanta ikon: const ICONS = ['a', 'b'].
  for (const m of sumber.matchAll(/\bconst\s+[A-Z_]*ICONS[A-Z_]*\s*=\s*\[([^\]]*)\]/g)) tambah(literal(m[1]))

  return nama
}

function pindaiSemua() {
  const hasil = new Map() // nama -> daftar file
  for (const file of kumpulkanFile(join(root, 'src'))) {
    for (const nama of pindaiFile(readFileSync(file, 'utf8'))) {
      if (BUKAN_IKON.has(nama)) continue
      if (!hasil.has(nama)) hasil.set(nama, [])
      hasil.get(nama).push(relative(root, file).replaceAll('\\', '/'))
    }
  }
  return hasil
}

// Data seed server: tidak ada kolom ikon yang dirender UI (diverifikasi saat pindai).
function adaIkonDiServer(dir = join(root, 'server'), hasil = []) {
  for (const nama of readdirSync(dir)) {
    const path = join(dir, nama)
    if (statSync(path).isDirectory()) adaIkonDiServer(path, hasil)
    else if (/\.(ts|js|sql|json)$/.test(nama) && /\bicon\b/i.test(readFileSync(path, 'utf8'))) {
      hasil.push(relative(root, path).replaceAll('\\', '/'))
    }
  }
  return hasil
}

// --- Memuat Icon.jsx lewat Vite SSR ------------------------------------------

async function muatIcon(t) {
  const vite = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  t.after(() => vite.close())
  return vite.ssrLoadModule('/src/shared/components/Icon.jsx')
}

const komponenValid = (v) =>
  typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v)

test('pemindai menemukan nama ikon lama di src (bukan daftar kosong)', () => {
  const nama = pindaiSemua()
  assert.ok(nama.size > 60, `hanya ${nama.size} nama ditemukan; pemindai kemungkinan rusak`)
})

// Nama tertentu di src hilang begitu halamannya dimigrasi (Fase B), jadi
// kemampuan pemindai diperiksa pada contoh tetap, bukan pada isi src yang berubah.
test('pemindai menangkap semua bentuk pemakaian ikon pada contoh tetap', () => {
  const contoh = `
    <Button icon="sensors" />
    const a = { icon: 'water' }
    <IconButton icon={gelap ? 'light_mode' : 'dark_mode'} />
    <Badge icon={ok ? 'check_circle' : 'warning'} tone={x ? 'warn' : 'ok'} />
    <span className="material-symbols-outlined">{muat ? 'visibility_off' : 'visibility'}</span>
    <span className="material-symbols-outlined">pets</span>
    const KAT_ICONS = ['trending_down', 'deployed_code']
  `
  const nama = pindaiFile(contoh)
  for (const wajib of ['sensors', 'water', 'dark_mode', 'check_circle', 'warning', 'pets']) {
    assert.ok(nama.has(wajib), `pemindai harus menemukan "${wajib}"`)
  }
  // Ikon dari ekspresi kondisional ikut tertangkap.
  for (const kondisional of ['light_mode', 'visibility_off', 'trending_down', 'deployed_code']) {
    assert.ok(nama.has(kondisional), `ikon kondisional "${kondisional}" harus tertangkap`)
  }
  assert.equal(nama.has('warn'), false, 'tone={x ? warn : ok} bukan ikon')
})

test('seed server tidak memuat nama ikon yang dirender UI', () => {
  assert.deepEqual(adaIkonDiServer(), [], 'ada kolom ikon di server; tambahkan ke pemindai dan peta')
})

test('ICON_MAP memuat setiap nama ikon yang dipakai di src', async (t) => {
  const { ICON_MAP } = await muatIcon(t)
  const hilang = [...pindaiSemua()]
    .filter(([nama]) => !(nama in ICON_MAP))
    .map(([nama, file]) => `${nama} (${file[0]})`)
  assert.equal(hilang.length, 0, `${hilang.length} nama ikon belum ada di ICON_MAP: ${hilang.join(', ')}`)
})

test('setiap nilai ICON_MAP adalah komponen lucide yang valid', async (t) => {
  const { ICON_MAP, FALLBACK_ICON } = await muatIcon(t)
  const rusak = Object.entries(ICON_MAP).filter(([, v]) => !komponenValid(v)).map(([k]) => k)
  assert.deepEqual(rusak, [], `nilai bukan komponen (ekspor lucide hilang): ${rusak.join(', ')}`)
  assert.equal(FALLBACK_ICON, CircleHelp)
})

test('peta berisi nama lucide kebab-case dan tidak lagi mengenal nama Material lama', async (t) => {
  const { ICON_MAP } = await muatIcon(t)
  const { Radio, Waves, Moon, TriangleAlert, FlaskConical, Thermometer, Droplet, ScanQrCode, PawPrint } =
    await import('lucide-react')
  assert.equal(ICON_MAP.radio, Radio)
  assert.equal(ICON_MAP.waves, Waves)
  assert.equal(ICON_MAP.moon, Moon)
  assert.equal(ICON_MAP['circle-check'], CircleCheck)
  assert.equal(ICON_MAP['triangle-alert'], TriangleAlert)
  assert.equal(ICON_MAP['flask-conical'], FlaskConical)
  assert.equal(ICON_MAP.thermometer, Thermometer)
  assert.equal(ICON_MAP.droplet, Droplet)
  assert.equal(ICON_MAP['scan-qr-code'], ScanQrCode)
  assert.equal(ICON_MAP['paw-print'], PawPrint)
  // Nama Material lama sudah dihapus (R15): tidak ada alias snake_case.
  for (const lama of ['sensors', 'check_circle', 'water_ec', 'device_thermostat', 'qr_code_scanner', 'pets']) {
    assert.equal(lama in ICON_MAP, false, `${lama} seharusnya tidak lagi ada di ICON_MAP`)
  }
  assert.equal(Object.keys(ICON_MAP).some((nama) => nama.includes('_')), false, 'tidak ada kunci snake_case')
})

test('Icon: bawaan 18 px, stroke 1.75, dekoratif tanpa label', async (t) => {
  const { Icon } = await muatIcon(t)
  const html = renderToStaticMarkup(React.createElement(Icon, { name: 'check_circle', className: 'text-ok' }))
  assert.match(html, /^<svg\b/)
  assert.match(html, /width="18"/)
  assert.match(html, /height="18"/)
  assert.match(html, /stroke-width="1\.75"/)
  assert.match(html, /aria-hidden="true"/)
  assert.match(html, /focusable="false"/)
  assert.match(html, /class="[^"]*\btext-ok\b/)
  assert.doesNotMatch(html, /role=/)
})

test('Icon: size bisa diganti; label menjadikannya role img', async (t) => {
  const { Icon } = await muatIcon(t)
  const html = renderToStaticMarkup(React.createElement(Icon, { name: 'sensors', size: 24, label: 'Sensor aktif' }))
  assert.match(html, /width="24"/)
  assert.match(html, /role="img"/)
  assert.match(html, /aria-label="Sensor aktif"/)
  assert.doesNotMatch(html, /aria-hidden/)
  assert.doesNotMatch(html, /focusable/)
})

test('Icon: nama tak dikenal memakai ikon cadangan, tidak melempar, satu peringatan per nama', async (t) => {
  const { Icon, FALLBACK_ICON } = await muatIcon(t)
  const warn = mock.method(console, 'warn', () => {})
  t.after(() => warn.mock.restore())

  const render = (name) => renderToStaticMarkup(React.createElement(Icon, { name }))
  const cadangan = renderToStaticMarkup(
    React.createElement(FALLBACK_ICON, { size: 18, strokeWidth: 1.75, 'aria-hidden': 'true', focusable: 'false' }),
  )
  let html = ''
  assert.doesNotThrow(() => { html = render('tidak-ada') })
  assert.match(html, /^<svg\b/)
  assert.equal(html, cadangan)
  render('tidak-ada')
  render('tidak-ada')
  assert.doesNotThrow(() => render(undefined))
  assert.doesNotThrow(() => render(''))
  assert.doesNotThrow(() => render(42))
  assert.equal(warn.mock.calls.filter((c) => String(c.arguments[0]).includes('tidak-ada')).length, 1)
})

test('nama Material lama dari data tersimpan jatuh ke ikon cadangan lewat IkonSlot', async (t) => {
  const vite = await createServer({
    root,
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  t.after(() => vite.close())
  const { IkonSlot } = await vite.ssrLoadModule('/src/shared/components/ui/IkonSlot.jsx')
  const { FALLBACK_ICON } = await vite.ssrLoadModule('/src/shared/components/Icon.jsx')
  const warn = mock.method(console, 'warn', () => {})
  t.after(() => warn.mock.restore())
  const cadangan = renderToStaticMarkup(
    React.createElement(FALLBACK_ICON, { size: 18, strokeWidth: 1.75, 'aria-hidden': 'true', focusable: 'false', 'data-icon': 'water_ec' }),
  )
  for (const nama of ['water_ec', 'potted_plant', 'ikon-yang-tidak-ada']) {
    const html = renderToStaticMarkup(React.createElement(IkonSlot, { icon: nama }))
    assert.match(html, /^<svg\b/, `${nama} tetap menggambar ikon`)
    assert.match(html, new RegExp(`data-icon="${nama}"`))
  }
  const html = renderToStaticMarkup(React.createElement(IkonSlot, { icon: 'water_ec' }))
  assert.equal(html.replace(/ data-icon="[^"]*"/, ''), cadangan.replace(/ data-icon="[^"]*"/, ''))
})
