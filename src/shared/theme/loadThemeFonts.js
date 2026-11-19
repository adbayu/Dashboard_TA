// Huruf di-host sendiri lewat Fontsource (tanpa Google Fonts).
// Bawaan Kebun Air (Plus Jakarta Sans + JetBrains Mono) dimuat statis di main.jsx,
// jadi Tanah & Lumut dan angka Panel Instrumen sudah tercakup. Tema lain memuat
// hurufnya saat dipilih; selagi berkas belum datang, tumpukan huruf cadangan
// di themes.css (system-ui, Georgia) tetap terbaca.
const FONT_IMPORTS = {
  'kebun-air': [],
  'tanah-lumut': [],
  'catatan-lapangan': [
    () => import('@fontsource-variable/fraunces/wght.css'),
    () => import('@fontsource-variable/source-sans-3/wght.css'),
  ],
  'panel-instrumen': [() => import('@fontsource-variable/source-sans-3/wght.css')],
  lumina: [() => import('@fontsource-variable/inter/wght.css')],
}

// Tidak pernah menolak: impor gagal (offline, berkas hilang) ditelan, huruf cadangan berlaku.
export async function loadThemeFonts(tema) {
  const loaders = Object.hasOwn(FONT_IMPORTS, tema) ? FONT_IMPORTS[tema] : []
  await Promise.allSettled(loaders.map((load) => load()))
}
