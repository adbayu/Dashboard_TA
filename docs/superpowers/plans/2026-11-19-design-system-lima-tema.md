# Design System Lima Tema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti tampilan "Lumina Aqua" warisan dengan design system lima tema (Kebun Air bawaan, Catatan Lapangan, Panel Instrumen, Tanah & Lumut, Lumina), masing-masing terang/gelap, plus fitur pengguna untuk memilih tema.

**Architecture:** Satu atribut di `<html>` (`data-theme`, `data-mode`) memilih palet; semua warna jadi CSS variable triplet RGB yang dihasilkan skrip dari `design/tokens.json`, dipetakan ke Tailwind sebagai token semantik. Perlakuan khusus tema (kaca Lumina, baris Catatan Lapangan, kepala kartu berwarna Kebun Air) hanya ada di CSS di bawah `[data-theme]`. Komponen bersama ditulis ulang mengikuti artifact Design System; halaman dimigrasi per kelompok, dijaga tes "ratchet" yang melarang kelas warna mentah.

**Tech Stack:** React 19, Vite 8, Tailwind 3.4, `node --test`, `lucide-react` (ISC), Fontsource (`@fontsource-variable/plus-jakarta-sans`, `@fontsource-variable/source-sans-3`, `@fontsource-variable/fraunces`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`), chart.js 4.

**Spec:** `docs/superpowers/specs/2026-11-18-design-system-tema-design.md`. Acuan visual: artifact "JagoFarm Design System" https://claude.ai/artifact/5Xm2AcE4o4neeiWSQXVUoV (komponen, `tema.md`) dan kanvas "JagoFarm Halaman" https://claude.ai/artifact/8gF9oisWMW9Au7LAwNvmPK (24 halaman × 5 tema). Sumber token: `design/tokens.json` (dibuat ulang dengan `python -I scripts/design/gen_tokens.py design/tokens.json`).

## Global Constraints

- Lima id tema: `kebun-air`, `catatan-lapangan`, `panel-instrumen`, `tanah-lumut`, `lumina`. Mode tersimpan: `terang | gelap | sistem`; mode terhitung di DOM: `light | dark`.
- Bawaan: `{ "tema": "kebun-air", "mode": "sistem" }`. Kunci `localStorage`: `jagofarm.tampilan`.
- Token warna (39 nama, persis seperti `design/tokens.json`) jadi `--c-<nama>: R G B`. Tidak ada hex, `rgb()`, atau kelas warna Tailwind mentah (`text-red-600`, `bg-emerald-50`, `bg-gradient-*`) di JSX.
- Huruf per tema (spec §5): Kebun Air Plus Jakarta Sans + JetBrains Mono; Catatan Lapangan Fraunces (judul) + Source Sans 3; Panel Instrumen Source Sans 3 + JetBrains Mono; Tanah & Lumut Plus Jakarta Sans; Lumina Inter. Di-host sendiri, tanpa Google Fonts.
- Radius kartu/kontrol: Kebun Air 8/8, Catatan Lapangan 4/4, Panel Instrumen 6/6, Tanah & Lumut 10/10, Lumina 20/999 px.
- Ikon hanya lewat komponen `Icon` (lucide-react, stroke 1.75, 18 px bawaan). Font Material Symbols dihapus.
- Skala tinggi kontrol tetap: `sm` 32, `md` 40, `lg` 44 px (`UKURAN` di `ui.jsx`; dicek `frontendReview.test.js`). Halaman IoT tetap memakai `.iot-touch-targets` (44 px).
- Teks UI berbahasa Indonesia, tanpa em dash, tanpa emoji, tanpa eyebrow huruf kapital di atas judul, tanpa deskripsi di bawah menu. Status selalu teks + ikon.
- Tata letak sama untuk semua tema. Fitur dan alur halaman mengikuti aplikasi saat ini; kanvas hanya acuan visual (deviasi kanvas seperti editor di Detail informasi pengelola tidak diimplementasikan).
- `/pilot` (`src/pilot/`) di luar cakupan.
- Gerbang tiap task: `npm run test:ui`, `npm run test:vpet`, `npm run test:qr`, `npm run lint`, `npm run build` semuanya lulus.

## Review Focus

1. `localStorage` diblokir/melempar error, atau berisi JSON rusak/nilai tema tak dikenal: aplikasi tetap tampil dengan bawaan, tanpa crash (Task 2).
2. Mode `sistem` dan OS berganti terang/gelap saat halaman terbuka: tampilan ikut berubah tanpa muat ulang; tidak ada kilatan tema salah saat muat pertama (Task 2, Task 4).
3. Pengguna lama yang menyimpan `theme: 'dark'` di state SmartStore: setelah update, mode jadi `gelap` sekali saja dan tidak menimpa pilihan baru (Task 2).
4. Nama ikon dari data tersimpan (kategori alat, seed gamifikasi) yang tidak ada di peta ikon: tampil ikon cadangan, bukan kosong atau error (Task 5).
5. Browser tanpa `backdrop-filter` di tema Lumina: kartu jadi permukaan padat yang tetap terbaca, bukan transparan di atas gradien (Task 6).

---

## Fase A: Fondasi

### Task 1: Generator `themes.css` dari `design/tokens.json`

**Files:**
- Create: `scripts/design/gen-themes.mjs`
- Create: `src/app/styles/themes.css` (hasil generator, di-commit)
- Modify: `package.json` (script `"design:themes": "node scripts/design/gen-themes.mjs"`, `"test:ui": "node --test \"src/**/*.test.js\" \"tests/design/*.test.mjs\""`)
- Test: `tests/design/gen-themes.test.mjs`
- Commit juga: `design/tokens.json`, `scripts/design/gen_tokens.py` (sudah dibuat saat menyusun plan)

**Interfaces:**
- Produces: `buildThemesCss(tokens: object) => string` (export bernama dari `gen-themes.mjs`); file `themes.css` berisi satu blok per kombinasi `:root[data-theme="<tema>"][data-mode="<light|dark>"]` dengan `--c-<nama>: R G B;` untuk 39 token, plus blok `:root[data-theme="<tema>"]` berisi `--font-head`, `--font-body`, `--font-num`, `--radius-card`, `--radius-control`, `--radius-pill`. `:root` tanpa atribut = Kebun Air terang (cadangan).

- [ ] **Step 1: Tulis tes gagal** di `tests/design/gen-themes.test.mjs`: baca `design/tokens.json`, panggil `buildThemesCss`, lalu assert:
  - output memuat `:root[data-theme="kebun-air"][data-mode="light"]` dan `--c-surface: 255 253 248;`
  - output memuat `:root[data-theme="lumina"][data-mode="dark"]` dan `--c-primary: 52 211 153;`
  - jumlah blok `[data-mode=` = 10
  - blok `:root[data-theme="catatan-lapangan"]` memuat `--radius-card: 4px;` dan `--font-head: "Fraunces Variable"`
  - `themes.css` di disk sama persis dengan `buildThemesCss(tokens)` (mencegah file usang)
- [ ] **Step 2:** `node --test tests/design/gen-themes.test.mjs` → FAIL (modul tidak ada).
- [ ] **Step 3:** Implementasikan `buildThemesCss` + CLI yang menulis `src/app/styles/themes.css`. Id tema di JSON `kebun-air-light` dipecah jadi `tema` + `mode` dengan memotong akhiran `-light|-dark`. Nilai non-warna per tema diambil dari tabel di spec §5 (konstanta di skrip, satu objek per tema).
- [ ] **Step 4:** `npm run design:themes && node --test tests/design/gen-themes.test.mjs` → PASS.
- [ ] **Step 5:** Commit `feat(design): generate theme variables from tokens.json`.

### Task 2: Preferensi tampilan (tema + mode) dan provider

**Files:**
- Create: `src/shared/theme/themePreference.js`
- Create: `src/shared/theme/TampilanProvider.jsx`
- Modify: `src/shared/store/SmartStore.jsx:236,434-435,515,1240` (hapus `theme`/`toggleTheme`; migrasi sekali)
- Modify: `src/main.jsx` (bungkus aplikasi dengan `TampilanProvider`)
- Modify: konsumen `theme`: `src/app/layout/SmartTopBar.jsx`, `src/components/iot/ReadingChart.jsx`, `src/kelola-area/pages/DeviceClaim.jsx`, `src/list-iot/pages/ListIot.jsx`
- Test: `src/shared/theme/themePreference.test.js`

**Interfaces:**
- Produces (`themePreference.js`): `TEMA = ['kebun-air','catatan-lapangan','panel-instrumen','tanah-lumut','lumina']`, `MODE = ['terang','gelap','sistem']`, `STORAGE_KEY = 'jagofarm.tampilan'`, `DEFAULT_PREFERENCE`, `readPreference(storage) => {tema, mode}`, `writePreference(storage, pref) => void` (tidak melempar), `resolveMode(mode, prefersDark: boolean) => 'light'|'dark'`, `applyToRoot(rootEl, pref, prefersDark) => void`, `migrateLegacyTheme(storage, legacyTheme) => {tema, mode} | null`.
- Produces (`TampilanProvider.jsx`): `useTampilan() => { tema, mode, resolvedMode, setTema(t), setMode(m) }`.
- Consumes: `themes.css` (Task 1).

- [ ] **Step 1: Tulis tes gagal** (`node:test`, storage palsu berbasis `Map`):
  - `readPreference` dengan storage kosong → `{tema:'kebun-air', mode:'sistem'}`
  - storage berisi `'{rusak'` → bawaan; berisi `{"tema":"ungu","mode":"gelap"}` → `{tema:'kebun-air', mode:'gelap'}`
  - storage yang `getItem` melempar → bawaan; `writePreference` dengan `setItem` melempar → tidak melempar
  - `resolveMode('sistem', true)` → `'dark'`; `resolveMode('terang', true)` → `'light'`
  - `applyToRoot(el, {tema:'lumina', mode:'gelap'}, false)` → `el.dataset.theme === 'lumina'`, `el.dataset.mode === 'dark'`
  - `migrateLegacyTheme(storageKosong, 'dark')` → `{tema:'kebun-air', mode:'gelap'}` dan tersimpan; bila `jagofarm.tampilan` sudah ada → `null` dan tidak menimpa
- [ ] **Step 2:** `node --test src/shared/theme/themePreference.test.js` → FAIL.
- [ ] **Step 3:** Implementasikan fungsi murni di `themePreference.js`. Di `TampilanProvider`: baca preferensi, panggil `migrateLegacyTheme` dengan `theme` lama dari state SmartStore yang tersimpan, pasang listener `matchMedia('(prefers-color-scheme: dark)')` (dilepas saat unmount) yang memanggil `applyToRoot` saat mode `sistem`. Konsumen lama yang membaca `theme === 'dark'` berganti ke `useTampilan().resolvedMode === 'dark'`.
- [ ] **Step 4:** Jalankan gerbang (Global Constraints) → semua PASS.
- [ ] **Step 5:** Commit `feat(theme): add theme preference with system mode and legacy migration`.

### Task 3: Tailwind memakai token semantik

**Files:**
- Modify: `tailwind.config.js`
- Test: `tests/design/tailwind-tokens.test.mjs`

**Interfaces:**
- Produces: kelas warna `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text`, `text-text-2`, `bg-primary`, `text-on-primary`, `ring-focus`, `text-ok-fg`, `bg-warn-bg`, `text-bad-fg`, `bg-water-bg`, `text-leaf-fg`, dst. untuk ke-39 token (`rgb(var(--c-<nama>) / <alpha-value>)`); `font-head`, `font-body`, `font-num` (`var(--font-*)`); `rounded-card`, `rounded-control`, `rounded-pill` (`var(--radius-*)`).
- Alias sementara (dihapus di Task 14) agar halaman lama tetap jalan: `on-surface`→`text`, `on-surface-variant`→`text-2`, `outline-variant`→`border`, `outline`→`text-2`, `surface-container*`→`surface-2`, `surface-container-lowest`→`surface`, `inverse-primary`→`primary`, `error`→`bad-fg`.

- [ ] **Step 1: Tes gagal:** import `tailwind.config.js`; assert `colors.surface === 'rgb(var(--c-surface) / <alpha-value>)'`, setiap nama token di `design/tokens.json` punya entri warna, `fontFamily.num` memuat `var(--font-num)`, `borderRadius.card === 'var(--radius-card)'`, dan alias `on-surface-variant` menunjuk `--c-text-2`.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Bangun objek `colors` dari daftar nama token (dibaca dari `design/tokens.json` saat config dimuat) plus tabel alias. Hapus warna hex statis lama (`primary: "#0f5238"`, `botanical`, `emerald.accent`, dll.) dan `boxShadow.emerald-glow`.
- [ ] **Step 4:** Gerbang → PASS (build harus tetap jalan karena alias).
- [ ] **Step 5:** Commit `feat(design): map tailwind colors to semantic theme tokens`.

### Task 4: Huruf di-host sendiri dan boot tanpa kilatan

**Files:**
- Modify: `package.json` (dependensi Fontsource di Tech Stack)
- Create: `src/shared/theme/loadThemeFonts.js`
- Modify: `index.html` (hapus semua `<link>` Google Fonts & Material Symbols; tambah skrip inline boot)
- Modify: `src/app/styles/index.css` (impor `themes.css`; `body { background: rgb(var(--c-bg)); color: rgb(var(--c-text)); font-family: var(--font-body); }`; `h1..h6 { font-family: var(--font-head) }`)
- Test: `tests/design/boot-theme.test.mjs`

**Interfaces:**
- Produces: `loadThemeFonts(tema) => Promise<void>` (impor dinamis CSS Fontsource yang dibutuhkan tema; Kebun Air dimuat statis sebagai bawaan); dipanggil `TampilanProvider` saat `tema` berubah.
- Skrip boot inline membaca `jagofarm.tampilan` dalam `try/catch`, memvalidasi terhadap 5 tema/3 mode, lalu menyetel `data-theme`/`data-mode` sebelum `main.jsx` dimuat.

- [ ] **Step 1: Tes gagal:** baca `index.html`; assert tidak memuat `fonts.googleapis.com` dan `Material+Symbols`; memuat skrip inline dengan `jagofarm.tampilan` dan `prefers-color-scheme`; skrip itu muncul sebelum `<script type="module" src="/src/main.jsx">`. Jalankan isi skrip boot dalam `vm` dengan `document.documentElement` palsu + `localStorage` yang melempar → atribut jadi `kebun-air`/`light`.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** `npm install` paket Fontsource; implementasikan `loadThemeFonts` (peta tema → daftar `import()`); tulis skrip boot dan perubahan CSS.
- [ ] **Step 4:** Gerbang → PASS; `npm run build` tidak memuat URL Google Fonts (cek `dist/index.html`).
- [ ] **Step 5:** Commit `feat(theme): self-host fonts and set theme before first paint`.

### Task 5: Komponen `Icon` (lucide-react) dengan peta nama lama

**Files:**
- Modify: `package.json` (`lucide-react`)
- Create: `src/shared/components/Icon.jsx`
- Test: `tests/design/icon-map.test.mjs`

**Interfaces:**
- Produces: `Icon({ name, size = 18, className, label })` (tanpa `label` → `aria-hidden="true"`; dengan `label` → `role="img" aria-label`); `ICON_MAP: Record<string, LucideComponent>` berisi nama Material lama (mis. `sensors`→`Radio`, `water`→`Waves`, `dark_mode`→`Moon`, `check_circle`→`CircleCheck`, `warning`→`TriangleAlert`, `science`→`FlaskConical`, `device_thermostat`→`Thermometer`, `water_ec`→`Droplet`, `qr_code_scanner`→`ScanQrCode`, `pets`→`PawPrint`) dan nama lucide kebab-case baru; `FALLBACK_ICON = CircleHelp`.

- [ ] **Step 1: Tes gagal:** pindai semua `src/**/*.{js,jsx}` dengan regex audit (`icon[=:]\s*['"]([a-z_-]+)['"]` dan isi `material-symbols-outlined`), plus nilai `icon` di `src/**/data/*.js`; assert setiap nama ada di `ICON_MAP` (pesan gagal mencantumkan nama yang hilang). Render `Icon name="tidak-ada"` ke string → memuat svg cadangan, tidak melempar.
- [ ] **Step 2:** Jalankan → FAIL (±108 nama).
- [ ] **Step 3:** Isi `ICON_MAP` sampai tes lulus; ikon dengan stroke 1.75.
- [ ] **Step 4:** Gerbang → PASS.
- [ ] **Step 5:** Commit `feat(ui): add lucide Icon component with legacy name map`.

### Task 6: Komponen bersama mengikuti Design System

**Files:**
- Modify: `src/shared/components/ui.jsx` (jadi barrel re-export)
- Create: `src/shared/components/ui/` → `Button.jsx`, `StatusPill.jsx`, `Alert.jsx`, `Card.jsx`, `PageHeader.jsx`, `Field.jsx` (Field, Input, NumberInput, Select, TextArea, Checkbox, Switch), `Tabs.jsx`, `FilterChip.jsx`, `Modal.jsx`, `EmptyState.jsx`, `Table.jsx`, `Avatar.jsx`, `Metric.jsx`
- Create: `src/app/styles/theme-surfaces.css` (perlakuan per tema, diimpor dari `index.css`)
- Modify: `src/app/styles/index.css` (hapus `.glass-card`, `.glass-panel`, `.glass-input`, `.panel-inset`, `.button-*`, `.dark .text-*`, `.kat-icon` dark hack, gradien `body`)
- Modify: `src/uiContrast.test.js` (ditulis ulang, lihat Step 1)
- Test: `src/shared/components/ui.test.js`

**Interfaces:**
- Consumes: kelas token (Task 3), `Icon` (Task 5).
- Produces (nama lama tetap diekspor agar halaman lama jalan): `Button({variant: 'primary'|'secondary'|'danger'|'ghost', size, icon, ...})` (`soft` dipetakan ke `secondary`), `IconButton`, `Badge` = alias `StatusPill({tone: 'ok'|'warn'|'bad'|'info'|'muted', icon, children})`, `Alert({tone, title, children, action})` baru, `Card({area: 'water'|'leaf'|'neutral', title, subtitle, action, pad, as})`, `SectionTitle({title, subtitle, action})` (prop `eyebrow` diabaikan), `PageHeader`, `Field/Input/NumberInput/Select/TextArea/Checkbox/Switch`, `Tabs({tabs, value, onChange})`, `FilterChip({active, onClick, children})`, `Modal` (perilaku fokus/Esc dipertahankan persis), `Empty` = alias `EmptyState`, `Table`, `AksiBaris`, `Avatar`, `AvatarPilih`, `StatCard` = alias `Metric`, `Bar` = alias `RangeBar` (Task 7), `UKURAN`, `STATUS_TONE`, `STATUS_LABEL`.
- `theme-surfaces.css` memuat: Lumina (gradien latar, kartu `@supports (backdrop-filter: blur(1px))` kaca 62% + blur 16px, selain itu `surface` padat; glow tombol utama; judul halaman gradien; keping pill kapital), Catatan Lapangan (tanpa bayangan, sidebar `side-bg`), Kebun Air (kepala kartu `area` berwarna).

- [ ] **Step 1: Tes gagal.** `ui.test.js` (render SSR seperti `frontendReview.test.js`): `Button variant="primary"` memuat kelas `bg-primary` dan `text-on-primary`, tidak memuat `shadow-emerald-glow`; `StatusPill tone="warn" icon="warning"` memuat svg + teks; `Alert tone="bad"` punya `role="alert"`; `SectionTitle eyebrow="X"` tidak merender `X`; `Card area="water"` punya `data-area="water"`. `uiContrast.test.js` ditulis ulang: dari `design/tokens.json` hitung kontras untuk tiap 10 palet: `on-primary/primary`, `text/surface`, `text-2/surface`, `warn-fg/warn-bg`, `bad-fg/bad-bg`, `info-fg/info-bg`, `side-text/side-bg`, `side-active-text/side-active` ≥ 4,5; `focus/surface` dan `text-2/surface` sebagai garis input ≥ 3. `theme-surfaces.css` harus memuat `@supports` untuk `backdrop-filter`.
- [ ] **Step 2:** `node --test src/shared/components/ui.test.js src/uiContrast.test.js` → FAIL.
- [ ] **Step 3:** Implementasikan komponen. Gaya hanya lewat kelas token Tailwind dan `theme-surfaces.css`; tinggi dari `UKURAN`.
- [ ] **Step 4:** Gerbang → PASS (`frontendReview.test.js` tetap lulus: subtitle TopBar, `UKURAN`, label `Field`).
- [ ] **Step 5:** Commit `feat(ui): rebuild shared components on theme tokens`.

### Task 7: Komponen domain IoT

**Files:**
- Create: `src/components/iot/SensorReading.jsx`, `src/components/iot/RangeBar.jsx`, `src/components/iot/AreaSection.jsx`, `src/components/iot/TaskList.jsx`
- Modify: `src/components/iot/ReadingChart.jsx` (warna dari CSS variable), `LiveIndicator.jsx`, `SensorStateBadge.jsx`, `AttentionBadge.jsx`, `EventList.jsx`, `LogTable.jsx`
- Create: `src/shared/theme/readThemeColor.js`
- Test: `src/components/iot/SensorReading.test.js`, perbarui `ReadingChart.test.js`

**Interfaces:**
- Produces: `SensorReading({ name, icon, device, value, decimals, unit, min, max, status: 'normal'|'low'|'high'|'stale'|'unknown', measuredAt, variant })` (varian `tile`/`row` dipilih CSS tema, bukan prop, kecuali dipaksa); `RangeBar({ value, min, max, scaleMin, scaleMax, status, label })`; `AreaSection({ area: 'water'|'leaf'|'neutral', icon, title, meta, children })`; `TaskList({ items: [{label, done, note}] })`; `readThemeColor(name: string, alpha?: number) => string` (membaca `--c-<name>` dari `document.documentElement`, mengembalikan `rgb(R G B / a)`; di SSR mengembalikan warna Kebun Air terang dari `design/tokens.json`).
- `ReadingChart` membaca `chart-1` (atau `leaf-fg`/`water-fg` sesuai prop `area`), `warn-fg` untuk ambang, `border` untuk grid; render ulang saat `useTampilan()` berubah; `animation: false` dipertahankan.

- [ ] **Step 1: Tes gagal:** `SensorReading` dengan `value=1020 max=900 status="high"` merender teks "Di atas batas", ikon, "1.020" (format `id-ID`), "ppm", dan `RangeBar` dengan `aria-valuenow`; `value=null` → "Belum ada data"; `status="stale"` → "Data tertunda". `ReadingChart.test.js`: opsi dataset memakai hasil `readThemeColor('chart-1')`, tidak ada hex literal di sumber (`readFile` + regex `#[0-9a-f]{6}`).
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Implementasikan; format angka lewat `Intl.NumberFormat('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })`.
- [ ] **Step 4:** Gerbang → PASS.
- [ ] **Step 5:** Commit `feat(iot): add theme-aware sensor reading components`.

### Task 8: Shell, pemilih tema, dan Profil › Tampilan

**Files:**
- Modify: `src/app/layout/SmartSidebar.jsx` (hapus `hint` dari render, gradien inline → `bg-side-bg`, grup menu sesuai kanvas)
- Modify: `src/app/layout/SmartTopBar.jsx` (hapus eyebrow "Mode …"; ganti tombol gelap/terang dengan tombol tema cepat yang membuka popover)
- Modify: `src/app/SmartApp.jsx` (hapus subtitle `TITLES` yang hanya mengulang judul; kontainer konten)
- Create: `src/shared/theme/ThemePicker.jsx`, `src/shared/theme/ModeToggle.jsx`, `src/shared/theme/ThemeQuickMenu.jsx`
- Modify: `src/profil-saya/pages/Profil.jsx` (bagian "Tampilan"; tombol Keluar memakai `Button variant="danger"`, kelas `tombol-keluar` dihapus)
- Test: `src/shared/theme/ThemePicker.test.js`, perbarui `src/frontendReview.test.js` bila assertion menyebut teks eyebrow

**Interfaces:**
- Consumes: `useTampilan()` (Task 2), komponen Task 6.
- Produces: `ThemePicker({ value, onChange })`: `role="radiogroup"` berisi 5 `role="radio"` (nama + deskripsi satu baris dari spec §5 + pratinjau mini yang memakai `data-theme` lokal), panah kiri/kanan memindah pilihan; `ModeToggle({ value, onChange })`: segmented control Terang/Gelap/Ikuti sistem. `MENUS` tetap diekspor dengan bentuk yang dicek `frontendReview.test.js`.

- [ ] **Step 1: Tes gagal:** render `ThemePicker value="lumina"` → 5 radio, tepat satu `aria-checked="true"` bernama "Lumina"; panah kanan dari `lumina` memanggil `onChange('kebun-air')`; `ModeToggle` merender 3 pilihan dengan label persis "Terang", "Gelap", "Ikuti sistem"; `SmartSidebar` tidak merender teks `hint` mana pun dari `MENUS`; `SmartTopBar` tidak memuat "Mode Pengguna".
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Implementasikan sesuai artboard `profil` dan `Main` di kanvas.
- [ ] **Step 4:** Gerbang → PASS. Lalu jalankan `npm run dev`, buka `/profil`, ganti kelima tema × tiga mode; pastikan tema bertahan setelah muat ulang dan tanpa kilatan.
- [ ] **Step 5:** Commit `feat(theme): add theme picker to profile and top bar`.

---

## Fase B: Migrasi halaman

Setiap task di fase ini mengikuti resep yang sama, dijaga satu tes ratchet.

**Resep halaman:** (1) buka artboard halaman itu di kanvas (tema Kebun Air dan Catatan Lapangan); (2) ganti kelas warna mentah, hex, `glass-*`, `panel-inset`, `bg-gradient-*`, `uppercase tracking-*` (selain kepala `Table`) dengan token/komponen; (3) ganti `<span className="material-symbols-outlined">` dengan `Icon`; (4) hapus eyebrow, baris 4 `StatCard` pembuka, kartu hero gradien, ikon dekoratif; (5) banner buatan tangan → `Alert`; tab/chip buatan tangan → `Tabs`/`FilterChip`; (6) pertahankan semua perilaku, teks fitur, `role`/`aria-*` yang dicek tes, dan `.iot-touch-targets`.

### Task 9: Tes ratchet + halaman publik

**Files:**
- Create: `tests/design/no-legacy-styles.test.mjs`
- Modify: `src/masuk/pages/Login.jsx`, `src/daftar/pages/Daftar.jsx`, `src/kelola-area/pages/DeviceClaim.jsx`, `src/profil-saya/pages/Profil.jsx`

**Interfaces:**
- Produces: `MIGRATED` (array path di tes) dan pola terlarang `LEGACY = [/\b(text|bg|border)-(red|amber|emerald|sky|green|slate|gray)-\d{2,3}\b/, /material-symbols-outlined/, /\bglass-(card|panel|input)\b/, /\bpanel-inset\b/, /bg-gradient-to-/, /#[0-9a-fA-F]{3,8}\b/, /eyebrow=/]`. Tiap task Fase B menambahkan file-nya ke `MIGRATED`.

- [ ] **Step 1:** Tulis tes ratchet dengan `MIGRATED` berisi 4 file di atas; pesan gagal mencantumkan file:baris.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Migrasikan keempat halaman (artboard `masuk`, `daftar`, `klaim-alat`, `profil`). `DeviceClaim` tetap phone-first, target sentuh 44 px.
- [ ] **Step 4:** Gerbang → PASS.
- [ ] **Step 5:** Commit `refactor(ui): migrate public pages to theme tokens`.

### Task 10: Pantauan, V-Pet, Misi & poin, Chatbot

**Files:** `src/dashboard/pages/Dashboard.jsx`, `src/v-pet/pages/VPet.jsx`, `src/v-pet/styles/pet.css`, `src/v-pet/components/PetKarakter.jsx`, `src/gamifikasi/pages/Gamifikasi.jsx`, `src/chatbot-aquaponik/pages/Chatbot.jsx`; tambah ke `MIGRATED`.

- [ ] **Step 1:** Tambah file ke `MIGRATED`; tambah tes di `src/frontendReview.test.js`: Dashboard merender `Alert` ringkasan sebelum `AreaSection`, dan tidak merender lebih dari satu baris `Metric`; Gamifikasi tidak memuat emoji (regex `\p{Extended_Pictographic}`).
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Migrasi sesuai artboard `Main`, `v-pet`, `misi-poin`, `chatbot`. Pantauan: Alert ringkasan → area (water/leaf) → SensorReading → ReadingChart → TaskList; jumlah alat di Alert dihitung dari data, bukan teks tetap. Medali emoji Gamifikasi → nomor peringkat. GIF V-Pet tidak diubah.
- [ ] **Step 4:** Gerbang (termasuk `npm run test:vpet`) → PASS.
- [ ] **Step 5:** Commit `refactor(ui): migrate monitoring home and engagement pages`.

### Task 11: Halaman IoT pengguna

**Files:** `src/list-iot/pages/ListIot.jsx`, komponen detail alat (`DeviceDetail` di `src/app/SmartApp.jsx` beserta `src/shared/iot/components/PanelInfoAlat.jsx`), `src/kelola-area/pages/DeviceLog.jsx`, `src/kelola-area/pages/Monitoring.jsx`, `src/detail-information/pages/DetailInformation.jsx`, `src/detail-information/components/QrScanner.jsx`, `src/shared/qr/components/AksiQr.jsx`, `src/shared/qr/components/QrCode.jsx`; tambah ke `MIGRATED`.

- [ ] **Step 1:** Tambah ke `MIGRATED`; perbarui `frontendReview.test.js` untuk `ComparisonChart`: ganti assertion `stroke-primary/tertiary/secondary` menjadi `stroke-chart-1`, `stroke-water-fg`, `stroke-leaf-fg` (seri pembanding memakai warna area); `TABS` tetap `['Per paket','Per sensor','Per area']`.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Migrasi sesuai artboard `daftar-alat`, `detail-alat`, `log-sensor`, `monitoring`, `pindai-qr`. Tab buatan tangan → `Tabs`. Warna QR cetak (hitam di atas putih) dipindah ke `@media print` di CSS, bukan hex di JSX.
- [ ] **Step 4:** Gerbang (termasuk `npm run test:qr`, `LogTable.test.js`, `DeviceLog.test.js`, `ReadingChart.test.js`) → PASS.
- [ ] **Step 5:** Commit `refactor(ui): migrate user IoT pages`.

### Task 12: Area pengguna dan pengelola

**Files:** `src/kelola-area/pages/KelolaArea.jsx`, `src/kelola-area/pages/AreaDetail.jsx`, `src/kelola-area/pages/AdminAreas.jsx`, Create: `src/kelola-area/model/areaTone.js`; tambah ke `MIGRATED`.

**Interfaces:**
- Produces: `areaTone(jenis: string) => 'water'|'leaf'|'neutral'`.

- [ ] **Step 1:** Tambah ke `MIGRATED`; tes `areaTone`: `'kolam'→'water'`, `'tandon'→'water'`, `'growbed'→'leaf'`, lainnya→`'neutral'`; kartu area merender `data-area` hasil `areaTone`.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Migrasi sesuai artboard `area`, `detail-area`, `admin-area`. Halaman pengguna tidak punya tombol tambah area. Bagian misi bulanan, panen, dan riwayat di `AreaDetail` tetap ada dengan gaya baru.
- [ ] **Step 4:** Gerbang (termasuk `AdminIotPage.test.js`, tes `fish-population`) → PASS.
- [ ] **Step 5:** Commit `refactor(ui): migrate area pages`.

### Task 13: Halaman pengelola dan developer

**Files:** `src/dashboard-pengelola/pages/AdminDashboard.jsx`, `src/kelola-user/pages/AdminUsers.jsx`, `src/kelola-area/pages/admin/AdminIotPage.jsx`, `src/kategori-device/pages/AdminCategories.jsx`, `src/detail-information/pages/AdminDetailInformation.jsx`, `src/kelola-virtual-pet/pages/AdminVPet.jsx`, `src/sistem-point/pages/AdminPoints.jsx`, `src/kelola-area/pages/Developer.jsx`, `src/components/iot/SandboxPanel.jsx`; tambah ke `MIGRATED`.

- [ ] **Step 1:** Tambah ke `MIGRATED`; tes: `AdminDashboard` merender daftar "Perlu ditangani" sebelum pintasan menu, tanpa ubin ikon; chip filter di 4 halaman admin memakai `FilterChip` (`aria-pressed`).
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Migrasi sesuai artboard `admin*` dan `developer`. `AdminDetailInformation` tetap pratinjau baca-saja seperti sekarang (bukan editor kanvas). Warna kategori dari data (`categories.js`, seed avatar) dipetakan ke `water | leaf | neutral` / token, bukan hex.
- [ ] **Step 4:** Gerbang → PASS.
- [ ] **Step 5:** Commit `refactor(ui): migrate manager and developer pages`.

### Task 14: Bersih-bersih dan verifikasi visual

**Files:**
- Modify: `tailwind.config.js` (hapus alias Task 3), `src/app/styles/index.css` (sisa aturan lama), `tests/design/no-legacy-styles.test.mjs` (`MIGRATED` → semua `src/**/*.jsx` kecuali `src/pilot/**`)
- Modify: `DESIGN.md` (ringkas: tunjuk ke spec, `design/tokens.json`, artifact Design System), `docs/iot/06-design-system.md` (tandai bagian token digantikan)

- [ ] **Step 1:** Ubah ratchet ke seluruh `src/**/*.jsx` (kecuali pilot) dan hapus alias → jalankan, FAIL di sisa pemakaian.
- [ ] **Step 2:** Bereskan sisa pemakaian sampai lulus.
- [ ] **Step 3:** Gerbang → PASS.
- [ ] **Step 4:** Verifikasi visual dengan `npm run dev` dan panel browser: 24 rute × 5 tema × terang/gelap pada lebar 360, 841, 1440 px; tidak ada scroll horizontal, fokus keyboard terlihat, status terbaca. Catat temuan, perbaiki, ulangi gerbang.
- [ ] **Step 5:** Commit `chore(design): remove legacy theme layer and document design system`.
