import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Build Docker hanya melihat berkas yang di-COPY, bukan seluruh repo. Build lokal
// tidak bisa menangkap berkas yang lupa disalin, jadi test ini mencocokkan berkas
// yang dibaca config build dengan COPY di stage web-build.
const root = new URL('../../', import.meta.url)
const dockerfile = readFileSync(new URL('deploy/Dockerfile', root), 'utf8')

const stage = /FROM\s+\S+\s+AS\s+web-build\s*\n([\s\S]*?)(?=\nFROM\s|$)/i.exec(dockerfile)?.[1] ?? ''
const sumberCopy = stage
  .split('\n')
  .filter(baris => /^COPY\s/i.test(baris) && !/--from=/i.test(baris))
  .flatMap(baris => baris.trim().split(/\s+/).slice(1, -1))

const tersalin = path => sumberCopy.some(src => path === src || path.startsWith(`${src.replace(/\/$/, '')}/`))

const CONFIG_BUILD = ['vite.config.js', 'postcss.config.js', 'tailwind.config.js']

// Path relatif root repo dari new URL("./x", import.meta.url) atau readFileSync("./x").
function berkasYangDibaca(config) {
  const isi = readFileSync(new URL(config, root), 'utf8')
  const pola = /(?:new URL\(|readFileSync\()\s*["'`]\.\/([^"'`]+)["'`]/g
  return [...isi.matchAll(pola)].map(m => m[1])
}

test('stage web-build di Dockerfile ditemukan dan punya COPY', () => {
  assert.ok(stage, 'stage "AS web-build" tidak ditemukan di deploy/Dockerfile')
  assert.ok(sumberCopy.length > 0)
})

test('setiap config build ikut di-COPY ke stage web-build', () => {
  for (const config of CONFIG_BUILD) assert.ok(tersalin(config), `${config} tidak di-COPY`)
})

test('berkas yang dibaca config build ikut di-COPY ke stage web-build', () => {
  const dibaca = CONFIG_BUILD.flatMap(config => berkasYangDibaca(config).map(path => ({ config, path })))
  assert.ok(dibaca.some(({ path }) => path === 'design/tokens.json'), 'tailwind.config.js seharusnya membaca design/tokens.json')
  for (const { config, path } of dibaca) {
    assert.ok(tersalin(path), `${config} membaca ${path}, tapi deploy/Dockerfile tidak meng-COPY-nya (build Docker akan ENOENT)`)
  }
})
