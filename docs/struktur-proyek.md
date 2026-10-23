# Panduan struktur proyek

Folder setiap fitur langsung berada di dalam `src/`, sejajar dengan `app/` dan `shared/`. Nama folder mengikuti nama output pada menu aplikasi. Halaman dengan nama menu berbeda dipisahkan; halaman pengguna dan pengelola dengan nama menu yang sama tetap berada dalam satu folder, dengan awalan `Admin` pada halaman pengelola.

## Peta folder

```text
Dashboard_TA/
├── src/
│   ├── main.jsx                 # Memilih aplikasi utama atau /pilot
│   ├── app/                     # Router, layout, dan gaya global
│   │   ├── SmartApp.jsx
│   │   ├── layout/
│   │   └── styles/
│   ├── dashboard/  # Dashboard
│   ├── dashboard-pengelola/  # Dashboard Pengelola
│   ├── list-iot/  # List IoT
│   ├── detail-information/  # Detail Information
│   ├── kelola-iot/  # Kelola IoT
│   ├── kategori-device/  # Kategori Device
│   ├── kelola-area/  # Kelola Area
│   ├── v-pet/  # V-Pet
│   ├── kelola-virtual-pet/  # Kelola Virtual Pet
│   ├── gamifikasi/  # Gamifikasi
│   ├── sistem-point/  # Sistem Point
│   ├── chatbot-aquaponik/  # Chatbot Aquaponik
│   ├── masuk/  # Masuk
│   ├── daftar/  # Daftar
│   ├── profil-saya/  # Profil Saya
│   ├── pilot/  # Pilot PostgreSQL
│   ├── shared/
│   │   ├── components/ui.jsx    # Button, Card, Modal, Table, dan UI bersama
│   │   ├── data/seed.js         # Menggabungkan data awal dari tiap fitur
│   │   └── store/SmartStore.jsx # State, sesi demo, dan aksi lintas fitur
│   └── assets/                  # Aset umum yang sudah ada
├── server/
│   ├── index.ts                 # Menjalankan API dan perintah database
│   ├── database/                # Koneksi, transaksi, schema dan migrations/
│   ├── features/
│   │   ├── masuk/security.ts     # Password, hash, token
│   │   ├── kelola-iot/                 # Model sensor, status koneksi, simulator
│   │   └── pilot/app.ts         # Registrasi route dan middleware Fastify
│   └── shared/domain.ts         # Menggabungkan kontrak domain backend
├── tests/
│   ├── v-pet/                   # Kondisi, level, progres dan koleksi pet
│   ├── area/                    # Populasi dan kematian ikan
│   └── server/                  # Database, pilot API dan support pengujian
├── scripts/
│   ├── v-pet/cek-aset.py        # Validasi gambar karakter dan ikon sensor
│   ├── pilot/                   # Start/stop pilot dan simulator
│   └── docker/start-docker.ps1  # Menyalakan Docker Desktop
├── docs/                        # Panduan, rancangan dan gambar tampilan
└── docker/                      # Konfigurasi Nginx
```

`node_modules/` berisi dependensi yang dipasang npm. `dist/` berisi hasil build. Kode fitur yang Anda edit ada di `src/`.

## Isi setiap fitur

Subfolder dibuat saat fitur membutuhkannya:

| Subfolder | Isi |
| --- | --- |
| `pages/` | Halaman yang terhubung dengan route aplikasi |
| `components/` | Komponen tampilan milik fitur |
| `model/` | Aturan, perhitungan, dan pengolahan data |
| `data/` | Data awal, pilihan, atau basis pengetahuan |
| `services/` | Pemanggilan API dan layanan fitur |
| `styles/` | CSS khusus fitur |
| `assets/` | Gambar dan ikon khusus fitur |

## Mulai membaca dari mana?

1. Buka [main.jsx](../src/main.jsx) untuk melihat pemilihan aplikasi berdasarkan URL.
2. Buka [SmartApp.jsx](../src/app/SmartApp.jsx) untuk melihat route dan halaman yang ditampilkan.
3. Pilih fitur dari [daftar fitur](../src/README.md), lalu baca file di `pages/`.
4. Ikuti import halaman ke `components/`, `model/`, dan `services/` fitur tersebut.
5. Buka [SmartStore.jsx](../src/shared/store/SmartStore.jsx) untuk melihat perubahan state dan penyimpanan demo di browser.

State demo masih dikelola bersama karena area, perangkat, akun, pet, dan poin saling terhubung. Data awal sudah dipisahkan ke masing-masing fitur. API pilot masih memakai satu registrasi route di `server/features/pilot/app.ts`; helper akun, IoT, dan database berada di folder tersendiri.

## Contoh: mengubah Virtual Pet

| Yang ingin diubah | File/folder |
| --- | --- |
| Koleksi dan detail pet pengguna | `src/v-pet/pages/VPet.jsx` |
| Pengaturan pet oleh pengelola | `src/kelola-virtual-pet/pages/AdminVPet.jsx` |
| Tampilan karakter dan pemuatan GIF | `src/v-pet/components/PetKarakter.jsx` |
| Reaksi terhadap kondisi air | `src/v-pet/model/reaksiPet.js` |
| Pemilihan gambar berdasarkan level | `src/v-pet/model/petCharacterLevels.js` |
| Aturan EXP dan kenaikan level | `src/v-pet/model/petProgress.js` |
| Normalisasi koleksi pet tersimpan | `src/v-pet/model/petModel.js` |
| Pet awal yang muncul di koleksi | `src/v-pet/data/seed.js` |
| Ukuran panggung dan tampilan pet | `src/v-pet/styles/pet.css` |
| GIF nila | `src/v-pet/assets/karakter-level/nila/` |
| GIF lele | `src/v-pet/assets/karakter-level/lele/` |

Nama GIF mengikuti `level-<angka>__<kondisi>.gif`, misalnya `level-3__senang.gif`. Kondisinya: `normal`, `senang`, `sedih`, `kepanasan`, dan `kedinginan`. Panduan aset tersedia di [README aset v-pet](../src/v-pet/assets/README.md).

## Menambahkan kode baru

Letakkan kode pada fitur yang memiliki perilaku tersebut. Gunakan `shared/` untuk kode yang digunakan beberapa fitur. Tambahkan route baru di `src/app/SmartApp.jsx` dan menu di `src/app/layout/SmartSidebar.jsx`. Tes ditempatkan di `tests/<fitur>/`. Panel penjelasan IoT ada di `src/shared/iot/` dan komponen QR ada di `src/shared/qr/` karena digunakan beberapa halaman.

File konfigurasi seperti `package.json`, `vite.config.js`, `.env`, dan `compose.yaml` tetap di root agar npm, Vite, dan Docker dapat menemukannya.

## Perintah pemeriksaan

| Perintah | Pemeriksaan |
| --- | --- |
| `npm run dev` | Menjalankan UI dengan hot reload |
| `npm run build` | Memastikan UI dan import dapat dibangun |
| `npm run lint` | Pemeriksaan kode |
| `npm run test:vpet` | Tes aturan pet dan populasi ikan |
| `npm run cek:aset` | Validasi aset v-pet |
| `npm run typecheck` | Pemeriksaan tipe backend dan tes backend |
| `npm run test:pilot` | Tes API dan migrasi; memerlukan `TEST_DATABASE_URL` ke database PostgreSQL khusus pengujian |

Skrip PowerShell pilot sekarang berada di `scripts/pilot/`, misalnya `powershell -File scripts/pilot/start-pilot.ps1`. Skrip Docker berada di `scripts/docker/`.
