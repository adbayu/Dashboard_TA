import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildThemesCss } from '../../scripts/design/gen-themes.mjs'

const root = new URL('../../', import.meta.url)
const tokens = JSON.parse(readFileSync(new URL('design/tokens.json', root), 'utf8'))
const css = buildThemesCss(tokens)

const block = (selector) => {
  const start = css.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `blok ${selector} tidak ditemukan`)
  return css.slice(start, css.indexOf('}', start))
}

test('blok terang Kebun Air memuat token surface sebagai triplet RGB', () => {
  assert.match(css, /:root\[data-theme="kebun-air"\]\[data-mode="light"\]/)
  assert.ok(block(':root[data-theme="kebun-air"][data-mode="light"]').includes('--c-surface: 255 253 248;'))
})

test('blok gelap Lumina memuat primary emerald-400', () => {
  assert.ok(block(':root[data-theme="lumina"][data-mode="dark"]').includes('--c-primary: 52 211 153;'))
})

test('ada 10 blok tema x mode, masing-masing 39 token warna', () => {
  // Tiap blok kini juga punya selektor pratinjau (Ruling R11), jadi hitung per bentuk selektor.
  assert.equal(css.match(/:root\[data-theme="[a-z-]+"\]\[data-mode=/g).length, 10)
  assert.equal(css.match(/\[data-pratinjau\]\[data-theme="[a-z-]+"\]\[data-mode=/g).length, 10)
  for (const theme of ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina']) {
    for (const mode of ['light', 'dark']) {
      const body = block(`:root[data-theme="${theme}"][data-mode="${mode}"]`)
      assert.equal(body.match(/--c-[a-z0-9-]+: \d+ \d+ \d+;/g).length, 39, `${theme}/${mode}`)
    }
  }
})

test('Catatan Lapangan: radius 4px dan judul Fraunces', () => {
  const body = block(':root[data-theme="catatan-lapangan"]')
  assert.ok(body.includes('--radius-card: 4px;'))
  assert.ok(body.includes('--font-head: "Fraunces Variable"'))
  assert.ok(body.includes('--font-body: "Source Sans 3 Variable"'))
})

test('radius dan font per tema mengikuti spec §5', () => {
  const expected = {
    'kebun-air': ['8px', '8px', 'Plus Jakarta Sans Variable', 'JetBrains Mono'],
    'catatan-lapangan': ['4px', '4px', 'Fraunces Variable', 'Source Sans 3 Variable'],
    'panel-instrumen': ['6px', '6px', 'Source Sans 3 Variable', 'JetBrains Mono'],
    'tanah-lumut': ['10px', '10px', 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans Variable'],
    lumina: ['20px', '999px', 'Inter Variable', 'Inter Variable'],
  }
  for (const [theme, [card, control, head, num]] of Object.entries(expected)) {
    const body = block(`:root[data-theme="${theme}"]`)
    assert.ok(body.includes(`--radius-card: ${card};`), `${theme} card`)
    assert.ok(body.includes(`--radius-control: ${control};`), `${theme} control`)
    assert.ok(body.includes('--radius-pill: 999px;'), `${theme} pill`)
    assert.ok(body.includes(`--font-head: "${head}"`), `${theme} head`)
    assert.ok(body.includes(`--font-num: "${num}"`), `${theme} num`)
  }
})

test(':root polos adalah cadangan Kebun Air terang', () => {
  const fallback = block(':root')
  assert.ok(fallback.includes('--c-surface: 255 253 248;'))
  assert.ok(fallback.includes('--radius-card: 8px;'))
  assert.ok(fallback.includes('"Plus Jakarta Sans Variable"'))
})

test('pratinjau tema lokal: setiap blok tema juga cocok dengan [data-pratinjau] (Ruling R11)', () => {
  const selectorList = (body) => css.slice(css.lastIndexOf('}', css.indexOf(body)) + 1, css.indexOf(body)).trim()
  for (const theme of ['kebun-air', 'catatan-lapangan', 'panel-instrumen', 'tanah-lumut', 'lumina']) {
    // Blok huruf/radius: pratinjau berbagi isi yang sama dengan :root[data-theme].
    const fontSelectors = selectorList(`:root[data-theme="${theme}"] {`)
    assert.ok(fontSelectors.includes(`[data-pratinjau][data-theme="${theme}"],`), `${theme} font/radius pratinjau`)
    assert.ok(!fontSelectors.includes('[data-mode='), `${theme} blok huruf tanpa mode`)
    for (const mode of ['light', 'dark']) {
      const colorSelectors = selectorList(`:root[data-theme="${theme}"][data-mode="${mode}"] {`)
      assert.ok(colorSelectors.includes(`[data-pratinjau][data-theme="${theme}"][data-mode="${mode}"],`), `${theme}/${mode} pratinjau`)
    }
  }
  assert.ok(!/^\[data-pratinjau\] \{/m.test(css), 'tidak ada blok pratinjau tanpa tema')
})

test('output deterministik dan memakai LF', () => {
  assert.equal(buildThemesCss(tokens), css)
  assert.ok(!css.includes('\r'))
  assert.ok(css.endsWith('\n'))
})

test('themes.css di disk sama persis dengan hasil generator (tidak usang)', () => {
  const onDisk = readFileSync(fileURLToPath(new URL('src/app/styles/themes.css', root)), 'utf8')
  assert.equal(onDisk.replace(/\r\n/g, '\n'), css)
})
