# JagoFarm — SmartDashboard Aquaponik (Dashboard TA)

Sistem dashboard berbasis web untuk monitoring **aquaponik** (kolam ikan + sayur dalam satu
siklus air) yang terintegrasi dengan perangkat **IoT**. Aplikasi memiliki **2 role**
(Pengguna dan Pengelola/Admin) dengan fitur yang berbeda.

Stack: **Vite 8 + React 19 + Tailwind CSS 3 + react-router-dom 7**, tema visual "Lumina Aqua".
Repo: https://github.com/adbayu/Dashboard_TA.git — branch kerja: **`dev/antigravity`**.

> Dokumen pilot backend (Fastify + PostgreSQL, Sprint 1) tetap ada di
> [PILOT-SETUP.md](PILOT-SETUP.md) dan [PERSIAPAN-PILOT.md](PERSIAPAN-PILOT.md).
> Dokumen ini fokus pada SmartDashboard Aquaponik.

---

## 1. Cara menjalankan

### Mode pengembangan (hot reload)

```bash
cd C:\JagoFarm_TA\Dashboard_TA
npm install
npm run dev
```

Buka `http://localhost:5173/`.

### Mode hasil build (uji produksi)

```bash
cd C:\JagoFarm_TA\Dashboard_TA
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1
```

Buka `http://127.0.0.1:4173/`.

> Catatan Windows: gunakan `node node_modules/vite/bin/vite.js build` langsung, bukan
> `npm run build` melalui shell background — proses npm/npx di host ini menggantung
> sampai timeout walaupun build-nya sendiri selesai dalam ~1,4 detik.

### Perintah lain

| Perintah | Fungsi |
| --- | --- |
| `npx --no-install oxlint src` | Lint kode frontend |
| `npm run typecheck` | Type-check backend (`server/tsconfig.json`) |
| `npm run api` | Jalankan backend pilot (Fastify) |
| `npm run simulator` | Jalankan simulator pengirim telemetri ke backend pilot |
| `npm run test:pilot` | Uji kontrak backend pilot |

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

## 3. Role & fitur

Role diganti langsung dari sidebar (tombol **Pengguna** / **Pengelola**) — tidak ada login
di tahap ini; role disimpan di `localStorage`.

### Tata letak & responsif

Sidebar **selalu tampil tanpa perlu klik tombol** mulai lebar jendela 640px, dengan lebar
yang menyesuaikan ruang:

| Lebar jendela | Sidebar | Tombol menu |
| --- | --- | --- |
| ≥ 1280px | 288px | tidak ada |
| 768 – 1279px | 256px | tidak ada |
| 640 – 767px | 224px | tidak ada |
| < 640px | tersembunyi | muncul (buka/tutup) |

Untuk memastikan tampilan tidak rusak, halaman diuji pada 13 lebar jendela
(1600 → 380px) × 15 halaman = **195 pemeriksaan**: sidebar muncul sesuai aturan dan
tidak ada geser horizontal di semua kombinasi.

### 3.1 Role Pengguna (operator farm)

| Route | Halaman | Isi |
| --- | --- | --- |
| `/` | Dashboard | Telemetri kunci (pH, DO, suhu, TDS), ringkasan area, total HPP, peringatan device, kondisi virtual pet, catatan pemantauan terbaru |
| `/iot` | List IoT | Daftar seluruh perangkat + filter (cari, kategori, area, status) |
| `/iot/:id` | Detail Information / Device | Deskripsi & **fungsi alat**, parameter yang diukur, ambang ideal, diagnostik (baterai, sinyal, tanggal kalibrasi), pindah area, **QR alat**, catatan area terkait |
| `/area` | Kelola Area | Daftar area produksi (kolam/growbed/tandon) + HPP tercatat |
| `/area/:id` | Detail Area | **Input item HPP** (perhitungan total & per unit otomatis), **pemantauan kolam** (pH, DO, suhu, EC, catatan), **catat panen** + margin untung/rugi, daftar device di area |
| `/v-pet` | V-Pet | Pemantauan farm dalam bentuk hewan peliharaan: pakan, bermain, bersihkan, rawat; level & tahap evolusi; kondisi air area tertaut |
| `/gamifikasi` | Gamifikasi | Misi harian, koleksi badge, papan peringkat, riwayat perolehan poin |
| `/chatbot` | Chatbot Aquaponik | Tanya-jawab seputar aquaponik (ikan & sayur) berbasis basis pengetahuan lokal, menyertakan pembacaan sensor area terpilih |

### 3.2 Role Pengelola / Admin

| Route | Halaman | Isi |
| --- | --- | --- |
| `/admin` | Dashboard Pengelola | Ringkasan seluruh farm, pintasan menu, unit yang butuh tindakan, peringkat poin |
| `/admin/pengguna` | Kelola User | Tambah/ubah/hapus akun, peran (pengguna/pengelola), status aktif, **hak akses area**, penyesuaian poin, sebaran area per akun |
| `/admin/iot` | Kelola IoT | Registrasi perangkat, kategori, penempatan area, status, baterai, **kalibrasi**, hapus, dan **QR alat** |
| `/admin/kategori` | Kategori Device | Jenis alat: nama, ikon, warna, deskripsi, dan daftar **parameter + ambang ideal** (min–max) |
| `/admin/area` | Kelola Area | Area (kolam yang sudah dipasangi IoT): tipe, lokasi, volume, komoditas, populasi, pemilihan device, penanggung jawab |
| `/admin/v-pet` | Kelola Virtual Pet | Nama & jenis pet, area pemantauan tertaut, kondisi (kenyang/kebahagiaan/kebersihan/kesehatan), jalur evolusi, reset pet |
| `/admin/point` | Sistem Point | Aturan perolehan poin (aktivitas, poin, batas harian, aktif/nonaktif), badge (ikon + ambang poin), saldo & penyesuaian poin pengguna, audit riwayat poin |

**QR alat**: berisi URL halaman perangkat (`/iot/:id`). Saat dipindai, yang muncul adalah
nama alat, kategori, deskripsi, daftar fungsi, lokasi, dan status unit.

---

## 4. Struktur berkas yang ditambahkan/diubah

### 4.1 Berkas baru (22 berkas, ~4.400 baris)

```
src/SmartApp.jsx                   122  Shell aplikasi: router, judul halaman, toast
src/store/SmartStore.jsx           456  Sumber data tunggal (state global + aksi)
src/data/seed.js                   367  Seluruh data awal + basis pengetahuan chatbot
src/components/ui.jsx              193  Komponen dasar (Card, Button, Modal, Table, ...)
src/components/SmartSidebar.jsx    165  Sidebar + definisi menu per role
src/components/SmartTopBar.jsx      78  Top bar: status device, tema, reset demo
src/components/QrCode.jsx           46  QR asli (paket qrcode) berisi URL perangkat
src/services/aquaBot.js            139  Mesin pencarian jawaban chatbot

src/pages/Dashboard.jsx            204  Role pengguna
src/pages/ListIot.jsx              348  (termasuk komponen DeviceDetail)
src/pages/KelolaArea.jsx           118
src/pages/AreaDetail.jsx           299
src/pages/VPet.jsx                 151
src/pages/Gamifikasi.jsx           197
src/pages/Chatbot.jsx              183

src/pages/admin/AdminDashboard.jsx 126  Role pengelola
src/pages/admin/AdminUsers.jsx     219
src/pages/admin/AdminIot.jsx       238
src/pages/admin/AdminCategories.jsx 212
src/pages/admin/AdminAreas.jsx     233
src/pages/admin/AdminVPet.jsx      158
src/pages/admin/AdminPoints.jsx    244
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
| `areas` | Area produksi (kolam/growbed/tandon) + item HPP |
| `devices` | Perangkat IoT + nilai sensornya |
| `users` | Akun, peran, hak akses area, saldo poin |
| `pet` | Virtual pet: jenis, level, tahap, kondisi, jurnal |
| `pointRules`, `badges`, `ledger` | Aturan poin, badge, riwayat perolehan poin |
| `missions`, `leaderboard`, `points` | Misi harian, papan peringkat, saldo poin pengguna aktif |
| `monitoring`, `harvests` | Catatan pemantauan kolam & catatan panen |
| `chat` | Riwayat percakapan chatbot |

**Penyimpanan**: `localStorage` dengan kunci `aquasmart_smart_v1`. Data bertahan setelah
halaman di-refresh. Tombol **↻** di top bar mengembalikan data demo ke kondisi awal.

**Perhitungan turunan** yang disediakan store:

- `hppTotal(areaId)` → `{ total, perUnit }` — jumlah `qty × unitPrice` seluruh item biaya,
  dibagi populasi area untuk HPP per ekor/lubang tanam.
- `activeAlerts` — device yang statusnya bukan `online`.
- `categoryOf(id)`, `areaOf(id)`, `devicesByArea(areaId)`.

**Status device**: `online` (Terhubung), `warning` (Perlu perhatian), `maintenance`
(Perawatan), `offline` (Tidak terhubung).

**Sistem poin**: beberapa aksi otomatis memberi poin ke akun pengguna aktif — catat
pemantauan kolam (+15), catat panen (+100), rawat virtual pet (+10 per tindakan), dan
menyelesaikan misi harian (sesuai poin misi). Poin tercatat di `ledger` dan menaikkan
peringkat pengguna.

Aturan poin lain (mis. "Isi data HPP area" +25) terdaftar dan dapat diubah di menu
**Sistem Point** sebagai konfigurasi aturan, tetapi belum terhubung ke aksi otomatis —
baru sebagian aturan yang sudah diimplementasikan. Daftar aturan di halaman **Gamifikasi**
juga menampilkan seluruh aturan yang dikonfigurasi.

---

## 6. Status saat ini: SEMUA DATA MASIH DUMMY

**Belum ada perangkat IoT fisik yang tersambung.** Ini penting diketahui:

| Yang tampak hidup | Sebenarnya |
| --- | --- |
| Nilai sensor berubah tiap 5 detik | `setInterval` di `SmartStore.jsx` menambah angka acak kecil (simulasi) |
| 10 perangkat IoT (IOT-001 … IOT-010) | Data tulisan tangan di `src/data/seed.js` |
| Status Terhubung/Perlu perhatian/Offline | Teks statis di data, bukan hasil ping ke alat |
| QR alat | QR asli & valid, tetapi isinya URL halaman web — bukan data dari alat |
| Jawaban chatbot | Pencarian teks pada 12 artikel lokal di `seed.js` — tanpa LLM, tanpa internet |

Aplikasi tetap "berjalan" walau jaringan dimatikan — itu tandanya data masih dummy.

> Backend Fastify + PostgreSQL di `server/` **sudah ada** (pilot Sprint 1) tetapi
> **belum** dihubungkan ke SmartDashboard.

### Titik penyambungan IoT nanti

1. **Backend endpoint** untuk menerima kiriman sensor (HTTP POST atau MQTT), lalu simpan ke
   PostgreSQL. Data dummy di `seed.js` + interval simulasi diganti pemanggilan API
   (mis. `pilotApi('/devices')`), UI di atasnya tidak perlu diubah karena semua membaca
   dari satu store.
2. **Kontrak nama parameter** sudah ditetapkan lewat `metric.key`:
   `ph`, `do`, `temp`, `tds`, `turbidity`, `airTemp`, `humidity`, `lux`, `uv`, `flow`,
   `runtime`, `power`, `voltage`, `kwh`, `dose`. Perangkat cukup mengirim dengan kunci yang sama.
3. **Ambang ideal** (pH 6,2–7,2 dan seterusnya) dikelola di menu **Kategori Device** —
   pastikan nilainya cocok dengan alat yang dipakai.
4. **Status online/stale/offline** sebaiknya dihitung dari waktu kiriman terakhir diterima,
   bukan diset manual seperti sekarang.
5. **Kalibrasi**: field `lastCalibration` per device dapat diisi otomatis dari jadwal kalibrasi.

---

## 7. Catatan pengujian yang sudah dilakukan

- `node node_modules/vite/bin/vite.js build` → **sukses**
- `npx --no-install oxlint src` → **0 error**
- 15 route (7 pengguna + 8 admin, termasuk halaman detail) ditelusuri di browser
  sungguhan → **0 gagal, tanpa error runtime**
- Uji fungsional: tambah item HPP (Rp1.530.000 → Rp1.605.000; Rp3.060 → Rp3.210 per ekor),
  catat pemantauan (poin 1.240 → 1.255), beri pakan V-Pet (kenyang 72% → 90%, poin +10),
  QR tergenerate, data bertahan setelah refresh
- Chatbot diuji dengan 13 pertanyaan (12 topik aquaponik + 1 pertanyaan di luar topik
  "resep rendang padang") → **13/13 benar**, termasuk menolak menjawab saat di luar cakupan
- Responsif: 13 lebar jendela (1600, 1280, 1024, 940, 820, 768, 700, 660, 640, 639, 500,
  420, 380px) × 15 halaman = **195 pemeriksaan** → sidebar tampil sesuai aturan, tanpa
  geser horizontal, tanpa error runtime

---

## 8. Yang belum ada

- Autentikasi/login nyata dan kontrol akses berbasis server (role masih di `localStorage`)
- Penyambungan data IoT asli (lihat bagian 6)
- Payment gateway, notifikasi email/WhatsApp
- Halaman pengaturan profil pengguna dan ekspor data
- Riwayat pembacaan sensor per device (grafik tren) — sekarang hanya nilai saat ini
- Sebagian aturan poin belum terhubung ke aksi otomatis (lihat bagian 5)
