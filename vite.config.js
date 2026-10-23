import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export function developmentHostOptions(command, value) {
  if (command !== 'serve' || !value) return {}
  const allowedHosts = [...new Set(value.split(',').map(host => host.trim()).filter(Boolean))]
  return allowedHosts.length ? { allowedHosts } : {}
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      ...developmentHostOptions(command, env.DEV_ALLOWED_HOSTS),
      headers: { 'Referrer-Policy': 'no-referrer' },
      proxy: { '/api': 'http://127.0.0.1:3001', '/docs': 'http://127.0.0.1:3001' },
    },
    build: {
    // Aset Virtual Pet JANGAN di-inline menjadi data URI.
    //
    // Alasannya bukan pilihan gaya, tetapi bug nyata: SVG kita memakai kutip
    // tunggal (xmlns='...'), sedangkan penulis data URI bawaan menghasilkan
    // `url("data:image/svg+xml,%3csvg xmlns='...'")` yang TIDAK bisa digambar
    // browser (dibuktikan: new Image().onerror terpanggil). Kalau dibiarkan,
    // karakter pet tidak pernah tampil walau `background-image` sudah terisi.
    //
    // Dengan aturan ini, tiap berkas di src/v-pet/assets/ disalin apa adanya ke
    // dist/assets/ dengan nama hash dan dipanggil lewat URL biasa, sehingga:
    //   - tidak ada masalah kutip/encoding data URI,
    //   - berkasnya bisa dibuka langsung lewat URL aset hasil build,
    //   - folder aset tetap terpisah seperti yang diminta untuk pengaturan manual.
      assetsInlineLimit: filePath => (filePath.includes('v-pet') ? false : undefined),
    },
  }
})
