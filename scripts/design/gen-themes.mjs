// Membangkitkan src/app/styles/themes.css dari design/tokens.json.
// Jalankan: npm run design:themes
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = new URL('../../', import.meta.url)
const TOKENS_PATH = fileURLToPath(new URL('design/tokens.json', ROOT))
const OUTPUT_PATH = fileURLToPath(new URL('src/app/styles/themes.css', ROOT))

const FONT_JAKARTA = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif'
const FONT_SOURCE = '"Source Sans 3 Variable", "Source Sans 3", system-ui, sans-serif'
const FONT_FRAUNCES = '"Fraunces Variable", Fraunces, Georgia, serif'
const FONT_INTER = '"Inter Variable", Inter, system-ui, sans-serif'
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace'

// Nilai non-warna per tema, dari spec §5 (urutan tema = urutan keluaran).
const THEME_VARS = {
  'kebun-air': { head: FONT_JAKARTA, body: FONT_JAKARTA, num: FONT_MONO, card: '8px', control: '8px' },
  'catatan-lapangan': { head: FONT_FRAUNCES, body: FONT_SOURCE, num: FONT_SOURCE, card: '4px', control: '4px' },
  'panel-instrumen': { head: FONT_SOURCE, body: FONT_SOURCE, num: FONT_MONO, card: '6px', control: '6px' },
  'tanah-lumut': { head: FONT_JAKARTA, body: FONT_JAKARTA, num: FONT_JAKARTA, card: '10px', control: '10px' },
  lumina: { head: FONT_INTER, body: FONT_INTER, num: FONT_INTER, card: '20px', control: '999px' },
}

const MODE_SUFFIX = /-(light|dark)$/

const hexToTriplet = (hex) => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`Nilai warna bukan hex 6 digit: ${hex}`)
  const n = parseInt(match[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

const colorLines = (tokens, paletteId) =>
  tokens.map((token) => {
    const hex = token.value[paletteId]
    if (!hex) throw new Error(`Token ${token.name} tidak punya nilai untuk ${paletteId}`)
    return `  --c-${token.name}: ${hexToTriplet(hex)};`
  })

const varLines = (vars) => [
  `  --font-head: ${vars.head};`,
  `  --font-body: ${vars.body};`,
  `  --font-num: ${vars.num};`,
  `  --radius-card: ${vars.card};`,
  `  --radius-control: ${vars.control};`,
  '  --radius-pill: 999px;',
]

const block = (selector, lines) => `${selector} {\n${lines.join('\n')}\n}`

export function buildThemesCss(tokens) {
  const palettes = tokens.color.themes.map((theme) => {
    const match = MODE_SUFFIX.exec(theme.id)
    if (!match) throw new Error(`Id tema tanpa akhiran -light/-dark: ${theme.id}`)
    return { id: theme.id, theme: theme.id.slice(0, match.index), mode: match[1] }
  })
  const colors = tokens.color.tokens
  const fallbackTheme = 'kebun-air'

  const blocks = [
    '/* Dibangkitkan oleh scripts/design/gen-themes.mjs dari design/tokens.json. Jangan disunting manual. */',
    block(':root', [...colorLines(colors, `${fallbackTheme}-light`), ...varLines(THEME_VARS[fallbackTheme])]),
  ]

  // Selektor [data-pratinjau] (Ruling R11) membuat elemen mana pun bertema lokal,
  // mis. pratinjau mini ThemePicker: <span data-pratinjau data-theme="lumina" data-mode="dark">.
  // Selektor pratinjau ditulis lebih dulu agar `:root[...] {` tetap utuh dalam satu baris.
  const selectors = (attrs) => `[data-pratinjau]${attrs},\n:root${attrs}`
  for (const [theme, vars] of Object.entries(THEME_VARS)) {
    const themeAttr = `[data-theme="${theme}"]`
    blocks.push(block(selectors(themeAttr), varLines(vars)))
    for (const palette of palettes.filter((p) => p.theme === theme)) {
      blocks.push(block(selectors(`${themeAttr}[data-mode="${palette.mode}"]`), colorLines(colors, palette.id)))
    }
  }

  return `${blocks.join('\n\n')}\n`
}

export function writeThemesCss() {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'))
  const css = buildThemesCss(tokens)
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, css, 'utf8')
  return css
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeThemesCss()
  console.log(`themes.css ditulis: ${OUTPUT_PATH}`)
}
