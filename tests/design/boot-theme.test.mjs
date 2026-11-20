import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { loadThemeFonts } from '../../src/shared/theme/loadThemeFonts.js'
import { MODE, STORAGE_KEY, TEMA } from '../../src/shared/theme/themePreference.js'

const root = new URL('../../', import.meta.url)
const html = readFileSync(new URL('index.html', root), 'utf8')
const caddyfile = readFileSync(new URL('deploy/Caddyfile', root), 'utf8')

// Skrip boot = satu-satunya <script> klasik inline (tanpa atribut) di index.html.
const inlineMatch = /<script>([\s\S]*?)<\/script>/.exec(html)
const bootScript = inlineMatch ? inlineMatch[1] : ''

function fakeRoot() {
  const classes = new Set()
  return {
    dataset: {},
    classList: {
      toggle(name, force) {
        if (force) classes.add(name)
        else classes.delete(name)
      },
      contains: (name) => classes.has(name),
    },
  }
}

function runBoot({ stored, throwing = false, prefersDark = false, noMatchMedia = false } = {}) {
  const documentElement = fakeRoot()
  const sandbox = { document: { documentElement } }
  sandbox.window = sandbox
  if (throwing) {
    Object.defineProperty(sandbox, 'localStorage', {
      get() {
        throw new Error('SecurityError')
      },
    })
  } else {
    sandbox.localStorage = {
      getItem: (key) => (key === STORAGE_KEY && stored !== undefined ? stored : null),
    }
  }
  if (!noMatchMedia) {
    sandbox.matchMedia = (query) => ({ matches: query === '(prefers-color-scheme: dark)' && prefersDark })
  }
  vm.runInNewContext(bootScript, sandbox)
  return documentElement
}

test('index.html tidak memuat huruf atau ikon dari Google Fonts', () => {
  assert.ok(!/Hanken/i.test(html), 'Hanken Grotesk masih dimuat')
  assert.ok(!/Manrope/i.test(html), 'Manrope masih dimuat')
  assert.ok(!/Material\+Symbols/i.test(html), 'Material Symbols masih dimuat')
  assert.ok(!/Material\s*Symbols/i.test(html), 'Material Symbols masih disebut')
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), 'masih ada permintaan ke Google Fonts')
  assert.equal((html.match(/<link[^>]*rel="stylesheet"/g) ?? []).length, 0, 'tidak ada stylesheet eksternal')
})

test('skrip boot inline ada di <head>, sebelum modul main.jsx', () => {
  assert.ok(bootScript.length > 0, 'skrip inline tidak ditemukan')
  assert.ok(bootScript.includes(STORAGE_KEY))
  assert.ok(bootScript.includes('prefers-color-scheme'))
  const headEnd = html.indexOf('</head>')
  assert.ok(inlineMatch.index < headEnd, 'skrip boot harus di dalam <head>')
  assert.ok(inlineMatch.index < html.indexOf('<script type="module" src="/src/main.jsx">'))
})

test('daftar tema dan mode di skrip boot sama dengan themePreference.js', () => {
  const list = (name) => {
    const found = new RegExp(`${name}=\\[([^\\]]*)\\]`).exec(bootScript)
    assert.ok(found, `daftar ${name} tidak ditemukan`)
    return found[1].split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
  }
  assert.deepEqual(list('T'), TEMA)
  assert.deepEqual(list('M'), MODE)
})

test('localStorage melempar error: bawaan kebun-air/light, tanpa crash', () => {
  const el = runBoot({ throwing: true })
  assert.equal(el.dataset.theme, 'kebun-air')
  assert.equal(el.dataset.mode, 'light')
  assert.equal(el.classList.contains('dark'), false, 'kelas dark tidak pernah dipasang')
})

test('preferensi valid terpakai: lumina + gelap menyalakan data-mode saja, tanpa kelas dark', () => {
  const el = runBoot({ stored: JSON.stringify({ tema: 'lumina', mode: 'gelap' }) })
  assert.equal(el.dataset.theme, 'lumina')
  assert.equal(el.dataset.mode, 'dark')
  assert.equal(el.classList.contains('dark'), false, 'jembatan kelas dark sudah dihapus')
})

test('mode terang mengabaikan preferensi gelap OS', () => {
  const el = runBoot({ stored: JSON.stringify({ tema: 'tanah-lumut', mode: 'terang' }), prefersDark: true })
  assert.equal(el.dataset.theme, 'tanah-lumut')
  assert.equal(el.dataset.mode, 'light')
})

test('mode sistem mengikuti prefers-color-scheme, bawaan bila tidak ada simpanan', () => {
  assert.equal(runBoot({ prefersDark: true }).dataset.mode, 'dark')
  assert.equal(runBoot({ prefersDark: false }).dataset.mode, 'light')
  assert.equal(runBoot({ stored: '{"tema":"lumina","mode":"sistem"}', prefersDark: true }).dataset.mode, 'dark')
})

test('matchMedia tidak tersedia pada mode sistem: terang, tanpa crash', () => {
  const el = runBoot({ noMatchMedia: true })
  assert.equal(el.dataset.theme, 'kebun-air')
  assert.equal(el.dataset.mode, 'light')
})

test('JSON rusak, tipe salah, atau nilai tak dikenal jatuh ke bawaan per kolom', () => {
  assert.deepEqual({ ...runBoot({ stored: '{rusak' }).dataset }, { theme: 'kebun-air', mode: 'light' })
  assert.deepEqual({ ...runBoot({ stored: 'null' }).dataset }, { theme: 'kebun-air', mode: 'light' })
  assert.deepEqual({ ...runBoot({ stored: '"lumina"' }).dataset }, { theme: 'kebun-air', mode: 'light' })
  const partial = runBoot({ stored: JSON.stringify({ tema: 'hantu', mode: 'gelap' }) })
  assert.equal(partial.dataset.theme, 'kebun-air')
  assert.equal(partial.dataset.mode, 'dark')
  const partial2 = runBoot({ stored: JSON.stringify({ tema: 'lumina', mode: 'ungu' }), prefersDark: true })
  assert.equal(partial2.dataset.theme, 'lumina')
  assert.equal(partial2.dataset.mode, 'dark')
})

test('CSP produksi mengizinkan skrip boot lewat hash sha256 yang cocok', () => {
  const hash = createHash('sha256').update(bootScript, 'utf8').digest('base64')
  const csp = /Content-Security-Policy\s+"([^"]*)"/.exec(caddyfile)
  assert.ok(csp, 'CSP tidak ditemukan di deploy/Caddyfile')
  const scriptSrc = csp[1].split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'))
  assert.ok(scriptSrc, 'script-src tidak ditemukan')
  assert.ok(scriptSrc.includes(`'sha256-${hash}'`), `hash skrip boot (sha256-${hash}) belum ada di script-src`)
  assert.ok(!scriptSrc.includes('unsafe-inline'), "script-src tidak boleh memakai 'unsafe-inline'")
  // Skrip tanpa baris baru supaya hash tidak bergantung pada akhir baris CRLF/LF.
  assert.ok(!/[\r\n]/.test(bootScript), 'skrip boot harus satu baris')
})

test('loadThemeFonts tidak pernah menolak, juga untuk tema tak dikenal', async () => {
  assert.equal(await loadThemeFonts('tema-tak-ada'), undefined)
  assert.equal(await loadThemeFonts(undefined), undefined)
  // Di Node impor CSS gagal; kegagalan harus ditelan (huruf cadangan berlaku).
  for (const tema of TEMA) assert.equal(await loadThemeFonts(tema), undefined)
})
