# JagoFarm — SmartDashboard Aquaponik (Dashboard TA)

Sistem dashboard berbasis web untuk monitoring **aquaponik** (kolam ikan + sayur dalam satu
siklus air) yang terintegrasi dengan perangkat **IoT**. Aplikasi memiliki tiga role:
Pengguna, Pengelola/Admin, dan Mitra (`partner`).

Stack: **Vite 8 + React 19 + Tailwind CSS 3 + react-router-dom 7**, tema visual "Lumina Aqua".
Repo: https://github.com/adbayu/Dashboard_TA.git — branch pengembangan IoT: **`feat/iot-system`**.

> Dokumen pilot backend (Fastify + PostgreSQL, Sprint 1) tetap ada di
> [PILOT-SETUP.md](PILOT-SETUP.md) dan [PERSIAPAN-PILOT.md](PERSIAPAN-PILOT.md).
> Dokumen ini fokus pada SmartDashboard Aquaponik.

![Tampilan Dashboard JagoFarm](preview.jpg)

---

## 1. Cara menjalankan

### Mode pengembangan (hot reload)

```bash
cd C:\TA\Dashboard_TA
npm ci
npm run dev
```

Buka `http://localhost:5173/`.

### Mode hasil build (uji produksi)

```bash
cd C:\TA\Dashboard_TA
npm run build
npm run preview -- --port 4173 --host 127.0.0.1
```

Buka `http://127.0.0.1:4173/`.

### Perintah lain

| Perintah | Fungsi |
| --- | --- |
| `npm run lint` | Lint kode frontend |
| `npm run typecheck` | Type-check backend (`server/tsconfig.json`) |
| `npm run api` | Jalankan backend pilot (Fastify) |
| `npm run simulator` | Jalankan simulator pengirim telemetri ke backend pilot |
| `npm run test:pilot` | Uji kontrak backend pilot |
| `npm run test:v1` | Uji kontrak API v1 |
| `node --test 'src/**/*.test.js'` | Unit test frontend di `src/` |

### Pilot backend (lokal)

~~~powershell
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
npm run api
~~~

Untuk konfigurasi dan checklist lengkap, lihat [PILOT-SETUP.md](PILOT-SETUP.md).

---

## 2. Dua aplikasi dalam satu build

Pemilihan aplikasi dilakukan berdasarkan **path URL** di `src/main.jsx` (bukan variabel
environment):

| Path | Aplikasi | Keterangan |
| --- | --- | --- |
| `/pilot` dan `/pilot/*` | `src/PilotApp.jsx` | UI pilot backend (Fastify + PostgreSQL), Sprint 1 |
| Semua path lain | `src/SmartApp.jsx` | **SmartDashboard Aquaponik** — bagian utama |

UI demo lama (`/demo/*`, `src/App.jsx`) **sudah dihapus seluruhnya**.

---

## 3. Login, role & fitur

### Cara masuk

Dalam mode API, SmartDashboard memvalidasi login melalui backend dan menggunakan cookie sesi `pilot_session` berdurasi 12 jam. Password dan token sesi tidak disimpan di SmartStore atau `localStorage`. Panduan ini tidak menyediakan akun atau password demo.

Dalam mode API, akun disediakan melalui undangan/backend. Role backend dipetakan ke role UI: `user` menjadi Pengguna, `admin` menjadi Pengelola, dan `partner` menjadi Mitra.

- Pengguna diarahkan ke beranda `/` dan hanya dapat membuka halaman pengguna.
- Pengelola diarahkan ke `/admin` dan dapat membuka menu pengelolaan.
- Akses langsung ke halaman yang tidak sesuai role dialihkan kembali.
- Tombol **Keluar** ada di halaman **Profil**; halaman `/profil` tersedia untuk kedua role.

### Sumber data IoT

Sumber IoT default adalah `VITE_IOT_SOURCE=api`. Hanya `VITE_IOT_SOURCE=local` yang mengaktifkan mode **Data contoh**; pengaturan ini bukan jalur login atau autentikasi.

### Halaman profil (`/profil`)

Foto dan identitas di sidebar bisa diklik untuk membuka halaman ini. Yang bisa diubah:

- Nama, email, nomor telepon, jabatan, dan "tentang saya"
- Foto profil dari 6 pilihan avatar
- Ganti password (hanya tersedia pada mode local; API mode mengelola password melalui backend)
- **Keluar dari akun** (tombol merah di kartu ringkasan akun) — ditaruh di sini supaya
  sidebar hanya berisi navigasi

Perubahan metadata profil langsung tampil di sidebar. Metadata profil dan preferensi UI yang diperlukan disimpan di SmartStore/`localStorage`.

> Penggantian password dari halaman Profil hanya tersedia pada mode local. Pada mode API, sesi memakai cookie backend `pilot_session`; password dan token sesi tidak disimpan di SmartStore/`localStorage`.

### Tata letak & responsif

Sidebar **selalu tampil tanpa perlu klik tombol** di semua ukuran jendela, dengan lebar
yang menyesuaikan ruang:

| Lebar jendela | Sidebar | Tombol menu |
| --- | --- | --- |
| ≥ 1280px | 288px | tidak ada |
| 768 – 1279px | 256px | tidak ada |
| < 768px | 208px | tidak ada |

Untuk memastikan tampilan tidak rusak, halaman diuji pada 13 lebar jendela
(1600 → 380px) × 15 halaman = **195 pemeriksaan**: sidebar muncul sesuai aturan dan
tidak ada geser horizontal di semua kombinasi.

### 3.1 Role Pengguna (operator farm)

| Route | Halaman | Isi |
| --- | --- | --- |
| `/masuk` | Masuk | Login backend dengan cookie sesi pada mode API; login lokal pada mode local |
| `/daftar` | Daftar akun (mode local) | Pendaftaran lokal; pada mode API akun disediakan melalui undangan/backend |
| `/` | Dashboard | Telemetri kunci (pH, suhu air, TDS — tiga sensor yang benar-benar ada), **statistik harian kolam** (terendah/rata-rata/tertinggi hari ini + status terhadap ambang), **histori harian per tanggal** (14 hari ke belakang: rata-rata + rentang tiap parameter, status ambang, dan ikan mati), ringkasan area, total HPP, peringatan device, jumlah ikan mati hari ini, kondisi virtual pet, catatan pemantauan terbaru |
| `/iot` | List IoT | Daftar perangkat dari API pada mode API, dengan filter yang tersedia |
| `/iot/:id` | Detail device | Telemetry/status, ambang efektif, riwayat pembacaan, dan kejadian yang tersedia dari API |
| `/iot/:id/log` | Log sensor | Log pembacaan perangkat dan ekspor melalui API |
| `/detail-informasi` | Detail Information (QR) | Pada mode API, pratinjau publik menampilkan identitas dasar, `areaRef`, sensor, status klaim, dan validitas kode; pemindai kamera memiliki input manual sebagai fallback |
| `/monitoring` | Monitoring | Tampilan sensor, area, dan kejadian perangkat dari API |
| `/developer` | Developer | API key, pemakaian, dan referensi API |
| `/area` | Kelola Area | Daftar area produksi (kolam/growbed/tandon) + HPP tercatat |
| `/area/:id` | Detail Area | **Input item HPP** (perhitungan total & per unit otomatis), **statistik harian sensor**, **catat ikan mati harian** (kolam saja, populasi ikut disesuaikan), **pemantauan kolam** (pH, suhu, TDS, catatan), **catat panen** + margin untung/rugi, daftar device di area |
| `/v-pet` | V-Pet | Karakter 2D (mirip hewan arcade) yang **bereaksi terhadap sensor IoT area tertaut**: suhu terlalu dingin/panas, pH asam/basa, TDS kurang/pekat masing-masing memicu ekspresi, latar kolam, sikap gerak, dan kalimat sendiri; ditambah pakan, bermain, bersihkan, rawat; level, tahap evolusi, dan aksesori yang ikut naik level |
| `/gamifikasi` | Gamifikasi | Misi harian, koleksi badge, papan peringkat, riwayat perolehan poin |
| `/chatbot` | Chatbot Aquaponik | Tanya-jawab seputar aquaponik (ikan & sayur) berbasis basis pengetahuan lokal, menyertakan pembacaan sensor area terpilih |

### 3.2 Role Pengelola / Admin

| Route | Halaman | Isi |
| --- | --- | --- |
| `/admin` | Dashboard Pengelola | Ringkasan seluruh farm, pintasan menu, unit yang butuh tindakan, **laporan ikan mati hari ini**, peringkat poin |
| `/admin/pengguna` | Kelola User | Tambah/ubah/hapus akun, peran (pengguna/pengelola), status aktif, **hak akses area**, penyesuaian poin, sebaran area per akun |
| `/admin/iot` | Kelola IoT | Kelola tipe dan perangkat, buat QR, catat kalibrasi, serta rotasi credential |
| `/monitoring` | Monitoring | Tampilan sensor, area, dan kejadian perangkat dari API |
| `/developer` | Developer | API key, pemakaian, dan referensi API |
| `/admin/detail-informasi` | Detail Information (pengelola) | Panel informasi perangkat berbasis SmartStore; bukan pratinjau publik API |
| `/admin/kategori` | Kategori Device | Jenis alat: nama, ikon, warna, deskripsi, dan daftar **parameter + ambang ideal** (min–max) |
| `/admin/area` | Kelola Area | Area (kolam yang sudah dipasangi IoT): tipe, lokasi, volume, komoditas, populasi, **ambang ideal khusus area** (opsional), pemilihan device, penanggung jawab |
| `/admin/v-pet` | Kelola Virtual Pet | Nama & jenis pet, area pemantauan tertaut, kondisi (kenyang/kebahagiaan/kebersihan/kesehatan), jalur evolusi, reset pet, pratinjau seluruh ekspresi aset, dan karakter yang sama dengan tampilan pengguna (reaksi sensor terlihat dari sisi pengelola) |
| `/admin/point` | Sistem Point | Aturan perolehan poin (aktivitas, poin, batas harian, aktif/nonaktif), badge (ikon + ambang poin), saldo & penyesuaian poin pengguna, audit riwayat poin |

### 3.3 Role Mitra (`partner`)

| Route | Akses |
| --- | --- |
| `/developer` | API key Test milik akun dan sandbox sendiri |
| `/profil` | Profil akun dan keluar |

Mitra tidak dapat membuka halaman farm, monitoring, atau admin. Key Live dan scope `admin`
hanya tersedia untuk pengelola sesuai kebijakan backend.

Alur QR klaim pada mode API dijelaskan pada bagian **Detail Information — memindai QR alat**.

---

## 4. Struktur berkas yang ditambahkan/diubah

### 4.1 Berkas baru (22 berkas, ~4.400 baris)

```
src/SmartApp.jsx                   150  Shell aplikasi: router, judul halaman, toast
src/store/SmartStore.jsx           940  Sumber data tunggal (state global + aksi)
src/data/seed.js                   319  Seluruh data awal + basis pengetahuan chatbot
src/components/ui.jsx              294  Komponen dasar + sistem ukuran (UKURAN: sm/md/lg) & IconButton
src/components/SmartSidebar.jsx    155  Sidebar + definisi menu per role
src/components/SmartTopBar.jsx      72  Top bar: status device, tema, reset demo (IconButton)
src/components/QrCode.jsx           46  QR lokal lama (paket qrcode)
src/components/QrScanner.jsx       180  Pemindai QR kamera (BarcodeDetector bawaan browser), dipakai pengguna & pengelola
src/components/PanelInfoAlat.jsx   312  Panel informasi perangkat untuk alur QR mode local
src/components/AksiQr.jsx           210  Tombol QR untuk alur mode local
src/services/aquaBot.js            139  Mesin pencarian jawaban chatbot
src/services/iotInfo.js             62  Resolver QR untuk alur mode local

src/pages/Login.jsx                174  Masuk + tautan ke pendaftaran
src/pages/Daftar.jsx               274  Daftar akun sendiri (operator langsung aktif, pengelola perlu persetujuan)
src/pages/Dashboard.jsx            342  Role pengguna
src/pages/ListIot.jsx              362  (termasuk komponen DeviceDetail; alur QR local lama)
src/pages/DetailInformation.jsx    183  Pratinjau publik terbatas pada mode API; alur local lama tetap terpisah
src/pages/KelolaArea.jsx           169
src/pages/AreaDetail.jsx           433
src/pages/VPet.jsx                 169
src/pages/Gamifikasi.jsx           198
src/pages/Chatbot.jsx              185
src/pages/Profil.jsx               237  Termasuk tombol Keluar

### Detail Information — memindai QR alat

Keterangan berikut hanya berlaku pada mode API. QR klaim membawa URL
`/d/:code?c=<kode aktivasi>`. Halaman publik `/d/:code` membaca parameter query lalu
menghapusnya dari alamat setelah dibaca. Kode aktivasi rahasia hanya berada pada URL tujuan
QR dan body/request API yang memang dikontrak; nilainya tidak dicantumkan di dokumentasi.
Kode aktivasi berlaku 24 jam dan pengguna harus login untuk mengklaim perangkat.

Pada `/detail-informasi`, QR dapat dipindai dengan kamera dan input manual tersedia sebagai
fallback. Memasukkan kode alat secara manual menampilkan pratinjau publik terbatas pada
identitas dasar, sensor, status klaim, dan validitas kode aktivasi.

Catatan perawatan menyesuaikan jenis sensor: pH memakai larutan buffer 4,0 & 7,0, suhu
memakai uji air es + air hangat, TDS memakai larutan standar 707 ppm.

Tata letaknya diuji pada lebar efektif layar pengguna (841px CSS — layar 1262 device px
dengan skala Windows 150%) sampai 1440px: dua tombol aksi rata dalam satu baris, kartu tidak
menyisakan ruang kosong besar (43px → 21px), QR sejajar dengan teks penjelasnya, dan baris
judul alat rata kiri konsisten.

src/pages/admin/AdminDashboard.jsx 160  Role pengelola
src/pages/admin/AdminUsers.jsx     296  Termasuk pembuatan akun + persetujuan pendaftar
src/pages/admin/AdminIot.jsx       242
src/pages/admin/AdminDetailInformation.jsx 232  Detail Information versi pengelola (panel bersama + pemindai kamera)
src/pages/admin/AdminCategories.jsx 215
src/pages/admin/AdminAreas.jsx     312
src/pages/admin/AdminVPet.jsx      159
src/pages/admin/AdminPoints.jsx    238
```

### 4.2 Berkas yang diubah (9)

| Berkas | Perubahan |
| --- | --- |
| `src/main.jsx` | Pemilih aplikasi: `/pilot` → `PilotApp.jsx`, lainnya → `SmartApp.jsx` (sebelumnya `/demo` → `App.jsx`) |
| `src/PilotApp.jsx` | Tautan "Lihat UI lama" diganti menjadi "Kembali ke SmartDashboard Aquaponik" |
| `src/components/SmartSidebar.jsx` | Sidebar tampil otomatis dari 640px (sebelumnya 1024px); lebar menyesuaikan lebar layar |
| `src/components/SmartTopBar.jsx` | Tombol menu hanya muncul di bawah 640px |
| `src/components/ui.jsx` | `min-w-0` pada Card/StatCard/input agar tabel dan input tidak memaksa halaman melebar |
| `src/SmartApp.jsx` | Jarak kiri konten mengikuti lebar sidebar (`sm:pl-56 md:pl-64 xl:pl-72`) |
| `src/index.css` | `overflow-x: hidden` juga di `html`, bukan hanya `body` |
| `package.json` | Tambah dependency `qrcode` untuk QR alat |
| `package-lock.json` | Ikut menyesuaikan dependency |

### 4.3 Berkas yang dihapus (21)

UI demo lama beserta state/simulator/RAG-nya:

- Komponen: `Sidebar.jsx` (sidebar lama), `TopNavBar.jsx`, `RoleSwitchModal.jsx`,
  `AddSensorModal.jsx`, `CalibrationModal.jsx`, `SlideOverDrawer.jsx`
- Halaman: `Dasbor.jsx`, `MonitoringTanah.jsx`, `MonitoringCuaca.jsx`, `Analitik.jsx`,
  `Riwayat.jsx`, `ManajemenSensor.jsx`, `Ensiklopedia.jsx`, `Pengaturan.jsx`,
  `Profil.jsx`, `AsistenAI.jsx`
- State & layanan: `store/useFarmStore.js`, `services/iotSimulator.js`, `services/ragService.js`
- Lain-lain: `App.jsx`, `App.css`

**Total: 49 berkas berubah, 4.824 baris ditambah, 4.631 baris dihapus.**

### 4.4 Sidebar lama vs baru

| Sidebar lama (dihapus) | Sidebar baru — Pengguna | Sidebar baru — Pengelola |
| --- | --- | --- |
| Utama, Tanah, Cuaca, Analitik, Riwayat, Sensor, Kamus, AI, Setelan, Profil | Dashboard, List IoT, Kelola Area, V-Pet, Gamifikasi, Chatbot Aquaponik | Dashboard Pengelola, Kelola User, Kelola IoT, Kategori Device, Kelola Area, Kelola Virtual Pet, Sistem Point |

---

## 5. Arsitektur data

Seluruh state aplikasi terpusat di **`src/store/SmartStore.jsx`** melalui satu provider
(`SmartProvider` / hook `useSmart`). Tidak ada komponen yang menyimpan data penting
sendiri-sendiri.

Isi state:

| Kunci | Isi |
| --- | --- |
| `role`, `theme` | Role aktif dan tema terang/gelap |
| `categories` | Kategori device + parameter & ambang ideal |
| `areas` | Area produksi (kolam/growbed/tandon) + item HPP + **ambang ideal khusus area** (`targets`, opsional) |
| `devices` | Perangkat IoT + nilai sensornya |
| `users` | Akun, peran, hak akses area, saldo poin (**satu-satunya sumber poin**) |
| `pet` | Virtual pet: jenis, level, tahap, kondisi, jurnal |
| `pointRules`, `badges`, `ledger` | Aturan poin, badge, riwayat perolehan poin |
| `missions` | Misi harian |
| `monitoring`, `harvests` | Catatan pemantauan kolam & catatan panen |
| `readings` | Riwayat pembacaan sensor **14 hari** (hari ini + 13 hari ke belakang, titik tiap 30 menit) — dasar statistik harian DAN tabel histori |
| `kematian` | Catatan ikan mati harian per kolam (diisi manual, satu baris per area per tanggal) |
| `chat` | Riwayat percakapan chatbot |

**Penyimpanan SmartStore**: metadata profil dan preferensi UI yang diperlukan disimpan di `localStorage` dengan kunci `aquasmart_smart_v1`. Pada mode API, cookie backend `pilot_session` berdurasi 12 jam menangani sesi; password dan token sesi tidak disimpan di SmartStore/`localStorage`. Sumber IoT default adalah `VITE_IOT_SOURCE=api`, sedangkan `local` hanya mode **Data contoh**. Tombol **↻** di top bar mengembalikan data demo ke kondisi awal.

**Perhitungan turunan** yang disediakan store:

- `hppTotal(areaId)` → `{ total, perUnit }` — jumlah `qty × unitPrice` seluruh item biaya,
  dibagi populasi area untuk HPP per ekor/lubang tanam.
- `activeAlerts` — device yang statusnya bukan `online`.
- `categoryOf(id)`, `areaOf(id)`, `devicesByArea(areaId)`.
- `areasSaya` — **hak akses area**: pengelola menerima seluruh area, pengguna hanya area
  yang ditugaskan padanya. Dipakai Dashboard, List IoT, Kelola Area, V-Pet, dan Chatbot,
  jadi operator tidak melihat kolam operator lain. `bolehAksesArea(areaId)` untuk
  pengecekan satu area (halaman detail menolak area di luar tanggung jawab).
- `leaderboard` — **diturunkan dari `users`**, bukan daftar terpisah. Papan peringkat di
  Gamifikasi, Dashboard Pengelola, dan Sistem Point membaca daftar yang sama ini, jadi poin
  yang diperoleh pengguna langsung terlihat pengelola.
- `historiArea(areaId, jumlahHari = 14)` — satu baris per tanggal (paling baru di atas)
  berisi label tanggal Indonesia ("Sen, 27 Sep 2026"), rata-rata + rentang min/maks tiap
  parameter, status terhadap ambang, penanda "hari ini", dan jumlah ikan mati hari itu.
  Dipakai tabel **Histori Harian** di dashboard.

**Status device**: `online` (Terhubung), `warning` (Perlu perhatian), `maintenance`
(Perawatan), `offline` (Tidak terhubung).

**Ambang ideal** dipusatkan di store lewat `ambangUntuk(area, kategori, key)`: ambang khusus
area (`area.targets`) dipakai bila ada, kalau tidak jatuh ke ambang bawaan kategori device.
Dashboard, List IoT, detail area, V-Pet, dan statistik harian semuanya memakai helper ini,
sehingga satu pembacaan tidak mungkin diberi status berbeda di halaman berbeda.

**Sistem poin**: beberapa aksi otomatis memberi poin ke akun pengguna aktif — catat
pemantauan kolam (+15), catat panen (+100), rawat virtual pet (+10 per tindakan), dan
menyelesaikan misi harian (sesuai poin misi). Poin tercatat di `ledger` dan menaikkan
peringkat pengguna. Saldo tersimpan di `users[].points` saja — tidak ada angka poin global
kedua yang bisa menyimpang.

Aturan poin lain (mis. "Isi data HPP area" +25) terdaftar dan dapat diubah di menu
**Sistem Point** sebagai konfigurasi aturan, tetapi belum terhubung ke aksi otomatis —
baru sebagian aturan yang sudah diimplementasikan. Daftar aturan di halaman **Gamifikasi**
juga menampilkan seluruh aturan yang dikonfigurasi.

---

## 6. Status data SmartStore dan IoT

`VITE_IOT_SOURCE=api` adalah sumber default. Pada mode API, daftar perangkat, telemetry,
status, riwayat pembacaan, dan kejadian IoT berasal dari backend. Hanya mode
`VITE_IOT_SOURCE=local` yang menampilkan IoT sebagai **Data contoh**.

| Yang tampak hidup | Sebenarnya |
| --- | --- |
| Daftar, telemetry, status, riwayat per perangkat, dan kejadian (mode API) | Data dari backend IoT |
| Daftar dan telemetry IoT (mode local) | **Data contoh**; bukan pembacaan dari backend |
| Statistik harian SmartStore | Perhitungan statistik harian yang ada tetap terpisah dari telemetry API IoT |
| QR klaim (mode API) | Tautan klaim; bukan payload telemetry |
| Jawaban chatbot | Pencarian teks pada 12 artikel lokal di `seed.js` — tanpa LLM, tanpa internet |

Haykal melaporkan uji lapangan lebih dari 48 jam telah dilakukan. Hasil pengukuran mentah dan akurasi sensor tidak diaudit ulang dalam run ini; tidak ada klaim akurasi pengukuran.

> Modul IoT SmartDashboard memakai backend Fastify + PostgreSQL di `server/`; sumber default `VITE_IOT_SOURCE=api`. Mode `local` hanya menampilkan Data contoh.

### Catatan integrasi IoT

1. **Sumber API**: modul IoT SmartDashboard meminta data melalui backend. `VITE_IOT_SOURCE=api` adalah default; hanya `local` yang berlabel Data contoh dan kegagalan API tidak menggantinya secara diam-diam.
2. **Kontrak nama parameter** sudah ditetapkan lewat `metric.key` dan **dibatasi ke tiga
   sensor yang benar-benar ada**: `ph`, `temp` (suhu air), `tds`. Perangkat cukup mengirim
   dengan kunci yang sama — kunci lain (DO, EC, turbidity, lux, kelembapan, flow, daya)
   sengaja tidak dipakai lagi di data, UI, maupun formulir.
3. **Ambang** mengikuti nilai efektif dari API: ambang area bila tersedia, selain itu ambang bawaan.
4. **Status koneksi** diturunkan dari waktu pengukuran/penerimaan terakhir: stale setelah 90 detik dan offline setelah 180 detik.
5. **Kalibrasi** dicatat melalui Kelola IoT.
6. **Batas TDS**: hard maximum ingest adalah 1000 ppm; warning tetap 400/900 ppm. Migration 007 menyelaraskan data tersimpan tanpa mengubah migration 002.

---

## 7. Catatan pengujian yang sudah dilakukan

- `npm run build` → **sukses**
- `npx --no-install oxlint src` → **0 error**
- 15 route (7 pengguna + 8 admin, termasuk halaman detail) ditelusuri di browser
  sungguhan → **0 gagal, tanpa error runtime**
- Uji fungsional: tambah item HPP (Rp1.530.000 → Rp1.605.000; Rp3.060 → Rp3.210 per ekor),
  catat pemantauan (poin 1.240 → 1.255), beri pakan V-Pet (kenyang 72% → 90%, poin +10),
  QR tergenerate, data bertahan setelah refresh
- Sesi login & profil: login benar/salah, akun nonaktif ditolak,
  ubah metadata profil & foto (tersimpan di `localStorage`), ganti password pada mode local,
  logout, sesi API bertahan setelah refresh
- Statistik harian kolam: terendah/rata-rata/tertinggi + jam pembacaan terakhir dihitung
  dari `readings`, status ambang diwarnai benar (di dalam / di luar ambang)
- **QR dan Detail Information (mode API)** — QR klaim membawa URL `/d/:code?c=<kode aktivasi>`;
  halaman publik menghapus query setelah membacanya. Klaim memerlukan login dan kode aktivasi
  berlaku 24 jam. `/detail-informasi` menampilkan pratinjau publik terbatas; input manual
  tersedia sebagai fallback kamera.
- **Histori harian per tanggal**: 14 baris (hari ini + 13 hari ke belakang) tampil di
  dashboard dengan label tanggal/bulan/tahun ("Min, 27 Sep 2026"), rata-rata + rentang
  tiap parameter, status ambang, dan kolom ikan mati
  - Hari ini berisi 21 titik (sampai jam berjalan), hari yang sudah lewat 48 titik penuh
  - Angka **tidak berubah setelah refresh** (dibangkitkan dari benih tanggal, bukan acak) —
    diuji dengan membandingkan nilai sebelum & sesudah refresh: identik
  - Catat 4 ekor ikan mati di Kolam Nila A → baris tanggal hari ini menampilkan "4 ekor"
  - Migrasi: state lama TANPA `readings` dibuka normal, 14 hari langsung terbentuk, dan
    data lama milik pengguna tidak ditimpa
- Kontras halaman Dashboard (309 elemen teks diperiksa): **0 kegagalan di kedua mode**
- Catat ikan mati harian: input 5 ekor → populasi kolam 500 → 495, tercatat satu baris per
  tanggal; input ulang hari yang sama (5 → 8) **memperbarui** baris yang sama (populasi
  turun 3, bukan 8), bukan menumpuk baris baru
- Migrasi data lama: state `localStorage` tanpa `readings`/`kematian` tetap terbuka normal
  (riwayat & catatan dibuat otomatis, data pengguna tidak hilang)
- Form catat ikan mati hanya muncul di area bertipe `kolam`, tidak di growbed/tandon
- Kontras warna (WCAG AA, dihitung dengan komposit latar berlapis + gradien `body`):
  **0 kegagalan di 8 halaman × 2 mode** setelah dua perbaikan — label eyebrow
  `text-primary/70` → `/80` (4,12:1 → ≈4,9:1) dan token `--c-outline` mode terang
  `112 121 115` → `105 114 108` (4,47:1 → ≈4,97:1)
- Kontrol akses: akun pengguna yang mengetik `/admin` dialihkan ke `/`, dan sebaliknya
- **Penyelarasan role pengguna ↔ pengelola** (diuji lintas akun dalam satu sesi):
  - Ambang ideal seragam di 4 halaman — pengelola mengubah pH Kolam Nila A jadi 6,6–7,2 di
    **Kelola Area**, lalu nilai itu muncul identik di kartu telemetri Dashboard, statistik
    harian, detail device, dan halaman V-Pet (sebelumnya Dashboard punya daftar ambang
    sendiri dan V-Pet menulis angkanya sendiri)
  - Hak akses area berlaku nyata: operator AR-01 ditolak membuka AR-02 milik operator lain
    ("bukan tanggung jawab Anda") dan ditolak membuka `/iot/IOT-001` dari akun yang tidak
    mengampu AR-01. Pengelola tetap bisa membuka semuanya
  - Daftar area, perangkat, dan catatan pemantauan tersaring per akun: Budi (AR-01 & AR-03)
    tidak melihat Kolam Lele B di Dashboard, List IoT, maupun Kelola Area
  - Poin tersinkron dua arah: Budi mencatat pemantauan (1.240 → 1.255) dan angka 1.255
    langsung terbaca pengelola di Sistem Point dan Dashboard Pengelola
  - Nama pencatat pemantauan mengikuti akun yang login (Siti mencatat → tercatat
    "Siti Rahmawati"), tidak lagi selalu "Budi Santoso"
  - "Peringkat" di Gamifikasi mengikuti akun yang login, dan baris akun tersebut ditandai
    di papan peringkat
- Chatbot diuji dengan 17 pertanyaan (16 topik aquaponik + 1 pertanyaan di luar topik
  "resep rendang padang") → **17/17 benar**, termasuk menolak menjawab saat di luar cakupan
  dan tetap menjawab pertanyaan istilah (DO/EC) walau sensornya belum terpasang
- Responsif: 13 lebar jendela (1600, 1280, 1024, 940, 820, 768, 700, 660, 640, 639, 500,
  420, 380px) × 15 halaman = **195 pemeriksaan** → sidebar tampil sesuai aturan, tanpa
  geser horizontal, tanpa error runtime
- 7 menu sidebar pengelola dan 6 menu sidebar pengguna diklik satu per satu → semua
  halaman terbuka dengan benar dan penanda menu aktif berpindah
- **Alur pembuatan akun** (kronologis, dalam satu sesi browser supaya `localStorage` sama):
  - Daftar sebagai **Operator Farm** → akun berstatus `aktif`, langsung masuk ke beranda `/`,
    nama pemilik tampil di sidebar
  - Daftar sebagai **Pengelola Farm** → status `menunggu`, muncul layar "pengajuan terkirim",
    dan akun TIDAK dibuatkan sesi
  - Pendaftar pengelola yang mencoba masuk → ditolak dengan pesan "masih menunggu
    persetujuan", dan halaman masuk memberi tahu ada 1 pendaftar menunggu
  - Pengelola menyetujui lewat panel **Perlu Persetujuan** → status jadi `aktif`, panel
    hilang, dan akun itu berhasil masuk ke `/admin`
  - Pengelola membuat akun lewat **Tambah pengguna** dengan password awal sendiri
    (`bayu123456`) + area AR-03 → akun bisa masuk pakai password itu dan hanya melihat AR-03
  - Email duplikat ditolak di kedua jalur: formulir daftar (`Email ini sudah terdaftar`) dan
    formulir pengelola (tidak ada akun kedua terbentuk)
  - Validasi: password < 6 karakter ditolak, konfirmasi password berbeda ditolak, email
    tanpa `@` ditolak oleh validasi HTML **dan** tetap ditolak oleh store
- Kontras halaman masuk & daftar: **0 kegagalan di 2 halaman × 2 mode**
- **Perbaikan mode terang (tampilan "menyatu dengan background"):** penyebabnya diukur, bukan
  ditebak — kartu putih alpha 0.72 di atas latar gradien terang hanya berjarak **1.07:1**,
  dan **border kartu berwarna putih** hanya **1.02:1** terhadap kartunya sendiri (praktis
  tak terlihat). Perbaikannya: latar gradien dibuat lebih teduh (`#e7eef2`→`#c4d3db`),
  kartu jadi 0.92, border jadi hijau tua tipis, shadow dibuat berlapis. Hasil terukur:
  **kartu vs latar 1.07 → 1.21**, **border vs latar 1.10 → 1.38**. Panel bersarang di dalam
  kartu (kotak metrik, gelembung chat, tombol ghost) dipindah ke kelas `.panel-inset`
  dengan garis tepi — sebelumnya `bg-white/50-70` nyaris tak terpisah dari kartu
  (1.02-1.07:1), sekarang **1.46** terhadap kartunya.
  Dua token ikut disesuaikan agar tidak ada regresi kontras: `--c-outline` mode terang
  `105 114 108` → `92 101 95` dan mode gelap `138 152 143` → `158 170 162`.
  Hasil akhir: **0 kegagalan kontras di 9 halaman × 2 mode** (114-137 elemen teks per halaman)

---

## 8. Galeri tampilan

Tangkapan layar asli dari aplikasi yang berjalan (mode hasil build), tersimpan di
`docs/tampilan/`:

| Berkas | Isi |
| --- | --- |
| `01-dashboard-pengguna.png` | Dashboard pengguna (mode terang) — 3 sensor, statistik harian |
| `02-detail-informasi-qr.png` | Detail Information setelah pindai QR — kartu "Kode QR Alat" + 3 tombol aksi |
| `03-dashboard-gelap.png` | Dashboard pengguna (mode gelap) |
| `04-modal-qr-pengelola.png` | Modal QR di Kelola IoT (pengelola) — 3 tombol aksi |
| `05-detail-informasi-pengelola.png` | Detail Information sisi pengelola — ada tombol pemindai kamera |
| `06-halaman-masuk.png` | Halaman masuk (`/masuk`) |

Semua diambil pada 1280x800 px. Cara memperbarui: jalankan `npm run preview`, buka halamannya,
lalu tangkap layar viewport (bukan seluruh halaman — halaman Detail Information sangat panjang
sehingga penangkapan penuh waktu habis).

## 9. Portal tampilan: satu sistem ukuran

Seluruh halaman memakai **satu skala ukuran** dari `src/components/ui.jsx` (`UKURAN`).
Sebelumnya tiap halaman menulis padding tombolnya sendiri sehingga tinggi tombol berbeda-beda
(20/24/30/33/36/38/60/66 px) dan baris tombol tampak melenceng. Aturan yang berlaku:

| Ukuran | Tinggi | Dipakai untuk |
| --- | --- | --- |
| `sm` | 32px | chip, tombol aksi di dalam tabel, aksi sekunder |
| `md` | 40px | **bawaan**: tombol, input, select, textarea |
| `lg` | 44px | aksi utama yang menonjol |

Semua tombol berikon memakai `IconButton` (bukan `<button>` + padding sendiri), jadi tombol
kalibrasi/edit/hapus di tabel seragam dan punya `aria-label`. Input memakai tinggi yang sama
dengan tombol, sehingga baris form tidak perlu trik `items-end`. Radius dipisah menurut peran:
kartu `rounded-2xl`, kontrol `rounded-xl`, chip/badge `rounded-full`. `SectionTitle` punya
garis pemisah tipis di bawahnya supaya judul bagian terbaca sebagai kepala; kartu statistik
memakai `h-full` + barisnya `items-stretch` sehingga kartu sebaris selalu sama tinggi.

### Perbaikan cacat tampilan (jangan dikembalikan)

1. **8 tinggi tombol berbeda → 3 ukuran.** Termasuk tombol "Rawat pet sekarang" dan "Semua
   area" yang tadinya telanjang (radius 0px, tinggi 20px).
2. **Nominal HPP meluber keluar kartu** di kolom sempit (`Rp1.530.000` lewat 9px). Baris HPP
   kini `flex-wrap` + `tabular-nums`; nama area & komoditas memakai `truncate`.
3. **Ruang kosong besar** di kartu statistik yang `hint`-nya hanya satu baris: sisa ruang
   43px → 21px, dan baris kartu memakai `items-stretch`.
4. **Pemilih area V-Pet tersangkut di bawah kartu** (kartu metrik 176px vs select 61px).
   Sekarang area pemantauan di kolomnya sendiri (`sm:order-1`) dan kartu metrik
   (`sm:order-2`), jadi sejajar dari atas.
5. **Form ber-`items-end`** (HPP, panen, parameter kategori, pencarian Detail Information)
   membuat kotak input tidak sejajar saat tinggi labelnya berbeda — label "Harga satuan" yang
   panjang sampai menggeser kotaknya 16px. Semua diubah ke `items-start`.
6. **Empat tombol aksi 33px** di tabel admin (sisa kelas `p-1.5` lama) kini `IconButton`
   `size="sm"` = 32px, lengkap dengan `aria-label`.

### Bug fungsional yang ikut ketemu saat memperbaiki tampilan

**Tombol "Tambah" di empat halaman pengelola tidak membuka apa pun** (Kategori, Area, IoT,
Pengguna). Penyebabnya `const open = editing !== null || form !== empty;` — saat menambah,
form di-set ke objek `empty` **itu sendiri**, sehingga `form !== empty` selalu `false` dan
modal tidak pernah muncul; hanya tombol "Ubah" yang bekerja. Diganti state khusus
`terbuka`/`setTerbuka(true)`. Pelajaran: pintu modal jangan bergantung pada perbandingan
identitas objek.

### Catatan alat ukur

Halaman masuk/daftar memakai panel gradient hijau tua dengan teks putih — itu disengaja dan
kontrasnya benar. Pengukur otomatis melaporkan gagal di sana karena panel memakai
`background-image` gradient, bukan `backgroundColor`; itu artefak alat ukur. Begitu pula
ratusan "elemen meluber" palsu yang muncul saat font ikon Material Symbols tidak termuat di
lingkungan uji (teks ligatur seperti `restaurant` merentang sampai 130px). Selalu saring
`material-symbols-outlined` sebelum menyimpulkan ada elemen melenceng.

**Hasil pengukuran akhir:** 18 rute × 2 mode = 36 pemeriksaan — `luber = 0`, `scrollX = 0`,
`gagal kontras = 0`, `error runtime = 0`; tinggi tombol seluruh aplikasi hanya
`24/32/40` px (chip/sm/md), dengan 60–66px khusus kartu pilihan (avatar, badge).

---

## 10. Yang belum ada

- Penggantian password dari Profil pada mode API belum tersedia; perubahan password hanya
  didukung pada mode local.
- Verifikasi email untuk pendaftaran mode local (email hanya diperiksa format & keunikannya)
- Lupa password / reset mandiri pada mode local (password hanya bisa diganti lewat Profil,
  atau diubah pengelola lewat Kelola User)
- Riwayat persetujuan akun (siapa menyetujui pengajuan & kapan) — statusnya disimpan, jejaknya belum
- Hasil rinci uji lapangan >48 jam dilaporkan pemilik; verifikasi independen atas metrik lapangan dan akurasi hardware belum dilakukan.
- Payment gateway, notifikasi email/WhatsApp
- Ekspor data dan unggah foto profil sendiri (sekarang memilih dari 6 avatar)
- Riwayat pembacaan sensor per **device** (grafik tren jangka panjang) — yang sudah ada baru
  riwayat **harian per area** (titik tiap 30 menit hari ini) yang dipakai statistik harian
- Riwayat ikan mati lintas hari (belum ada grafik tren kematian mingguan/bulanan)
- Sebagian aturan poin belum terhubung ke aksi otomatis (lihat bagian 5)
