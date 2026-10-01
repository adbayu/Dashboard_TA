import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: {
    // Aset Virtual Pet JANGAN di-inline menjadi data URI.
    //
    // Alasannya bukan pilihan gaya, tetapi bug nyata: SVG kita memakai kutip
    // tunggal (xmlns='...'), sedangkan penulis data URI bawaan menghasilkan
    // `url("data:image/svg+xml,%3csvg xmlns='...'")` yang TIDAK bisa digambar
    // browser (dibuktikan: new Image().onerror terpanggil). Kalau dibiarkan,
    // karakter pet tidak pernah tampil walau `background-image` sudah terisi.
    //
    // Dengan aturan ini, tiap berkas di src/assets/v-pet/ disalin apa adanya ke
    // dist/assets/v-pet/ dan dipanggil lewat URL biasa, sehingga:
    //   - tidak ada masalah kutip/encoding data URI,
    //   - berkasnya bisa dibuka langsung (mis. /assets/v-pet/karakter/nila-xxxx.svg),
    //   - folder aset tetap terpisah seperti yang diminta untuk pengaturan manual.
    assetsInlineLimit: (filePath) => (filePath.includes('v-pet') ? false : undefined),
  },
})
