import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import config from '../../tailwind.config.js'

const root = new URL('../../', import.meta.url)
const tokens = JSON.parse(readFileSync(new URL('design/tokens.json', root), 'utf8'))
const tokenNames = tokens.color.tokens.map((t) => t.name)
const { colors, fontFamily, borderRadius, boxShadow = {} } = config.theme.extend
const rgbVar = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

test('setiap token di tokens.json punya warna Tailwind rgb(var(--c-nama))', () => {
  assert.equal(tokenNames.length, 39)
  assert.equal(colors.surface, 'rgb(var(--c-surface) / <alpha-value>)')
  for (const name of tokenNames) {
    assert.equal(colors[name], rgbVar(name), `warna ${name}`)
  }
})

test('keluarga huruf dan radius mengikuti variabel tema', () => {
  assert.ok(fontFamily.num.includes('var(--font-num)'))
  assert.ok(fontFamily.head.includes('var(--font-head)'))
  assert.ok(fontFamily.body.includes('var(--font-body)'))
  assert.equal(borderRadius.card, 'var(--radius-card)')
  assert.equal(borderRadius.control, 'var(--radius-control)')
  assert.equal(borderRadius.pill, 'var(--radius-pill)')
})

test('tidak ada alias warna lama: hanya 39 token, tanpa alias huruf atau bayangan lama', () => {
  assert.deepEqual(Object.keys(colors).sort(), [...tokenNames].sort())
  for (const lama of ['on-surface', 'on-surface-variant', 'outline-variant', 'surface-container', 'background', 'secondary', 'tertiary', 'error', 'emerald-accent', 'emerald-glow']) {
    assert.equal(lama in colors, false, `alias ${lama} seharusnya sudah dihapus`)
  }
  assert.deepEqual(Object.keys(fontFamily).sort(), ['body', 'head', 'num'])
  assert.equal('emerald-glow' in boxShadow, false)
})

test('mode gelap dibaca dari data-mode, bukan kelas dark', () => {
  assert.deepEqual(config.darkMode, ['selector', '[data-mode="dark"]'])
})

test('tidak ada warna hex statis di konfigurasi Tailwind', () => {
  for (const [name, value] of Object.entries(colors)) {
    assert.equal(typeof value, 'string', `warna ${name} harus string datar`)
    assert.ok(!value.startsWith('#'), `warna ${name} tidak boleh hex`)
  }
  for (const [name, value] of Object.entries(boxShadow)) {
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(value), `bayangan ${name} tidak boleh hex`)
  }
})

test('kelas warna lama yang dihapus tidak lagi dipakai di src', () => {
  const removed = [
    'primary-action', 'primary-container', 'on-primary-container', 'primary-fixed',
    'on-primary-fixed', 'on-primary-fixed-variant', 'secondary-container', 'on-secondary',
    'on-secondary-container', 'secondary-fixed', 'secondary-fixed-dim', 'on-secondary-fixed',
    'on-secondary-fixed-variant', 'tertiary-container', 'on-tertiary', 'on-tertiary-container',
    'tertiary-fixed', 'tertiary-fixed-dim', 'on-tertiary-fixed', 'on-tertiary-fixed-variant',
    'on-background', 'surface-dim', 'surface-bright', 'inverse-surface', 'inverse-on-surface',
    'surface-tint', 'error-container', 'on-error', 'on-error-container',
    'botanical-dark', 'botanical-base', 'botanical-mid', 'botanical-light',
  ]
  for (const name of removed) {
    assert.equal(name in colors, false, `${name} seharusnya sudah dihapus dari konfigurasi`)
  }
  const prefix = 'bg|text|border|ring|from|to|via|fill|stroke|outline|divide|shadow|decoration|accent|caret|placeholder|ring-offset|border-[tblrxy]'
  const pattern = new RegExp(String.raw`(?<![\w-])(?:${prefix})-(?:${removed.join('|')})(?![\w-])`)
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(jsx?|tsx?|css|html)$/.test(entry) && !/\.test\./.test(entry)) files.push(path)
    }
  }
  walk(fileURLToPath(new URL('src/', root)))
  for (const file of files) {
    const hit = pattern.exec(readFileSync(file, 'utf8'))
    assert.equal(hit, null, `${file} memakai kelas warna yang sudah dihapus: ${hit && hit[0]}`)
  }
})
