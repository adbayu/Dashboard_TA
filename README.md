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

## 3. Login, role & fitur

### Cara masuk

Aplikasi kini punya halaman masuk (`/masuk`) dan halaman **daftar akun** (`/daftar`). Tanpa
login, semua alamat otomatis dialihkan ke halaman masuk. Akun demo (semuanya berpassword `jagofarm123`):

| Email | Password | Nama | Role | Area |
| --- | --- | --- | --- | --- |
| budi@jagofarm.id | jagofarm123 | Budi Santoso | Pengguna | AR-01, AR-03 |
| siti@jagofarm.id | jagofarm123 | Siti Rahmawati | Pengguna | AR-02 |
| hendra@jagofarm.id | jagofarm123 | Hendra Wicaksono | Pengelola | — |
| agus@jagofarm.id | jagofarm123 | Agus Priyanto | Pengguna (nonaktif) | AR-03 |

Halaman masuk menyediakan tombol **isi otomatis** untuk tiga akun utama, jadi tidak
perlu mengetik password saat demo.

Setelah masuk, **role ditentukan oleh akun** — bukan lagi pilihan manual:

- Akun Pengguna → beranda `/`, hanya boleh membuka halaman pengguna.
- Akun Pengelola → beranda `/admin`, membuka menu pengelolaan.
- Bila alamat dipaksa (mis. pengguna mengetik `/admin`), otomatis dialihkan kembali.
- Sesi bertahan setelah halaman di-refresh; tombol **Keluar** ada di halaman **Profil**
  (bukan di sidebar), bersebelahan dengan ringkasan akun.
- Halaman `/profil` tersedia untuk kedua role.

### Alur pembuatan akun (dua jalur)

**Jalur 1 — pendaftaran sendiri di `/daftar`.** Tautan "Daftar di sini" ada di halaman masuk.
Pendaftar memilih peran, dan perannya menentukan perlakuan akun:

| Peran yang dipilih | Status setelah daftar | Bisa langsung masuk? |
| --- | --- | --- |
| **Operator Farm** (pengguna) | `aktif` | Ya — langsung diarahkan ke beranda `/` |
| **Pengelola Farm** | `menunggu` | Tidak — harus disetujui pengelola yang sudah ada |

Alasannya: hak pengelola itu akses penuh ke seluruh farm, jadi tidak boleh didapat dari
formulir publik. Pendaftar pengelola melihat layar "Pengajuan terkirim" dan diminta menghubungi
pengelola. Bila mencoba masuk, pesannya jelas: akun masih menunggu persetujuan.

Operator farm boleh langsung aktif karena aksesnya terbatas pada area yang ditugaskan
pengelola — akun baru belum punya area, jadi belum ada data yang bisa dibuka.

**Jalur 2 — dibuat pengelola di `/admin/pengguna`.** Tombol **Tambah pengguna** membuka
formulir berisi nama, email, peran, status, **password awal**, dan area yang dikelola. Bila
kolom password dikosongkan, akun memakai password demo `jagofarm123` dan password itu
ditampilkan pada pesan konfirmasi supaya bisa diserahkan ke pemilik akun. Email dijaga unik —
email yang sudah dipakai akun lain ditolak.

**Persetujuan pengajuan.** Bila ada pendaftar pengelola, halaman `/admin/pengguna` menampilkan
panel **Perlu Persetujuan** di atas tabel (kartu "Menunggu Persetujuan" ikut menghitungnya),
dengan tombol **Setujui** / **Tolak**. Tombol setujui cepat juga tersedia di baris tabel yang
berstatus menunggu. Status akun memakai tiga nilai: `aktif`, `menunggu`, `nonaktif`.

**Validasi di sisi store (bukan hanya HTML).** Nama/email/password wajib, format email
diperiksa, password minimal 6 karakter, konfirmasi password harus sama, dan email tidak boleh
duplikat. Pesan galat tampil di formulir dengan `role="alert"`.

### Halaman profil (`/profil`)

Foto dan identitas di sidebar bisa diklik untuk membuka halaman ini. Yang bisa diubah:

- Nama, email, nomor telepon, jabatan, dan "tentang saya"
- Foto profil dari 6 pilihan avatar
- Ganti password (wajib mengisi password lama, minimal 6 karakter, konfirmasi harus sama)
- **Keluar dari akun** (tombol merah di kartu ringkasan akun) — ditaruh di sini supaya
  sidebar hanya berisi navigasi

Perubahan langsung tampil di sidebar dan tersimpan di `localStorage`.

> **Catatan keamanan:** ini login demo untuk keperluan tugas akhir. Password disimpan
> apa adanya di `localStorage` browser — tidak terenkripsi dan tidak aman untuk produksi.
> Bila nanti dipakai sungguhan, autentikasi harus dipindahkan ke backend (hash password
> + token sesi).

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
| `/masuk` | Masuk | Login + tautan ke pendaftaran + kartu akun demo |
| `/daftar` | Daftar akun | Pilih peran (Operator Farm / Pengelola Farm), data diri, password, foto profil |
| `/` | Dashboard | Telemetri kunci (pH, suhu air, TDS — tiga sensor yang benar-benar ada), **statistik harian kolam** (terendah/rata-rata/tertinggi hari ini + status terhadap ambang), **histori harian per tanggal** (14 hari ke belakang: rata-rata + rentang tiap parameter, status ambang, dan ikan mati), ringkasan area, total HPP, peringatan device, jumlah ikan mati hari ini, kondisi virtual pet, catatan pemantauan terbaru |
| `/iot` | List IoT | Daftar seluruh perangkat + filter (cari, kategori, area, status) |
| `/iot/:id` | Detail Information / Device | Deskripsi & **fungsi alat**, parameter yang diukur, ambang ideal, diagnostik (baterai, sinyal, tanggal kalibrasi), pindah area, **QR alat**, catatan area terkait |
| `/detail-informasi` | Detail Information (QR) | **Pindai QR alat** pakai kamera → penjelasan lengkap alat: jenis, fungsi, parameter + ambang ideal, pembacaan saat ini, arti tiap status, dan catatan perawatan. Bisa juga lewat input manual kode alat |
| `/area` | Kelola Area | Daftar area produksi (kolam/growbed/tandon) + HPP tercatat |
| `/area/:id` | Detail Area | **Input item HPP** (perhitungan total & per unit otomatis), **statistik harian sensor**, **catat ikan mati harian** (kolam saja, populasi ikut disesuaikan), **pemantauan kolam** (pH, suhu, TDS, catatan), **catat panen** + margin untung/rugi, daftar device di area |
| `/v-pet` | V-Pet | Pemantauan farm dalam bentuk hewan peliharaan: pakan, bermain, bersihkan, rawat; level & tahap evolusi; kondisi air area tertaut (pH, suhu, TDS) |
| `/gamifikasi` | Gamifikasi | Misi harian, koleksi badge, papan peringkat, riwayat perolehan poin |
| `/chatbot` | Chatbot Aquaponik | Tanya-jawab seputar aquaponik (ikan & sayur) berbasis basis pengetahuan lokal, menyertakan pembacaan sensor area terpilih |

### 3.2 Role Pengelola / Admin

| Route | Halaman | Isi |
| --- | --- | --- |
| `/admin` | Dashboard Pengelola | Ringkasan seluruh farm, pintasan menu, unit yang butuh tindakan, **laporan ikan mati hari ini**, peringkat poin |
| `/admin/pengguna` | Kelola User | Tambah/ubah/hapus akun, peran (pengguna/pengelola), status aktif, **hak akses area**, penyesuaian poin, sebaran area per akun |
| `/admin/iot` | Kelola IoT | Registrasi perangkat, kategori, penempatan area, status, baterai, **kalibrasi**, hapus, dan **QR alat** — modal QR kini menampilkan panel penjelasan lengkap yang sama dengan yang dibaca pengguna |
| `/admin/detail-informasi` | Detail Information (pengelola) | **Penjelasan alat yang SAMA dengan yang dibaca pengguna**: tempel isi QR atau pilih alat dari daftar, lalu lihat fungsi, parameter + ambang, pembacaan, arti status, dan catatan perawatan persis seperti tampilan pengguna |
| `/admin/kategori` | Kategori Device | Jenis alat: nama, ikon, warna, deskripsi, dan daftar **parameter + ambang ideal** (min–max) |
| `/admin/area` | Kelola Area | Area (kolam yang sudah dipasangi IoT): tipe, lokasi, volume, komoditas, populasi, **ambang ideal khusus area** (opsional), pemilihan device, penanggung jawab |
| `/admin/v-pet` | Kelola Virtual Pet | Nama & jenis pet, area pemantauan tertaut, kondisi (kenyang/kebahagiaan/kebersihan/kesehatan), jalur evolusi, reset pet |
| `/admin/point` | Sistem Point | Aturan perolehan poin (aktivitas, poin, batas harian, aktif/nonaktif), badge (ikon + ambang poin), saldo & penyesuaian poin pengguna, audit riwayat poin |

**QR alat**: berisi URL halaman perangkat (`/iot/:id`). Saat dipindai, yang muncul adalah
nama alat, kategori, deskripsi, daftar fungsi, lokasi, dan status unit.

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
src/components/QrCode.jsx           46  QR asli (paket qrcode) berisi kode alat
src/components/QrScanner.jsx       180  Pemindai QR kamera (BarcodeDetector bawaan browser), dipakai pengguna & pengelola
src/components/PanelInfoAlat.jsx   312  Panel penjelasan alat — dipakai BERSAMA pengguna & pengelola
src/components/AksiQr.jsx           210  Tombol Unduh PNG / Salin isi QR / Cetak label (satu sumber, keempat pintu QR)
src/services/aquaBot.js            139  Mesin pencarian jawaban chatbot
src/services/iotInfo.js             62  Resolver isi QR alat (3 format: kode ringkas/URL/kode alat)

src/pages/Login.jsx                174  Masuk + tautan ke pendaftaran
src/pages/Daftar.jsx               274  Daftar akun sendiri (operator langsung aktif, pengelola perlu persetujuan)
src/pages/Dashboard.jsx            342  Role pengguna
src/pages/ListIot.jsx              362  (termasuk komponen DeviceDetail; modal QR pakai panel bersama)
src/pages/DetailInformation.jsx    183  Pindai QR alat -> penjelasan lengkap perangkat (panel bersama)
src/pages/KelolaArea.jsx           169
src/pages/AreaDetail.jsx           433
src/pages/VPet.jsx                 169
src/pages/Gamifikasi.jsx           198
src/pages/Chatbot.jsx              185
src/pages/Profil.jsx               237  Termasuk tombol Keluar

### Detail Information — memindai QR alat

Menu **Detail Information** (`/detail-informasi`) ada di sidebar pengguna. Halaman ini
menerima tiga bentuk isi QR, karena label lama mungkin sudah dicetak/ditempel di alat:

| Isi QR | Contoh | Dikenali sebagai |
| --- | --- | --- |
| Kode ringkas | `JAGOFARM\|AQ-PH-001\|IOT-001` | format yang dicetak aplikasi |
| URL halaman | `http://.../iot/IOT-001` | ambil ID perangkat dari URL |
| Kode alat saja | `AQ-PH-001` | cari perangkat lewat kode alat |

Resolver-nya `cariPerangkat(devices, teks)` di `src/services/iotInfo.js`, dan isi QR-nya
dihasilkan oleh **satu** fungsi `ambilKodeAlat(device)` di store — dipakai halaman List IoT
dan Kelola IoT. Jadi label yang dicetak pengelola pasti terbaca oleh pengguna.

Hasil pemindaian menjelaskan: jenis & lokasi alat, fungsi alat dalam sistem, tiap parameter
beserta ambang idealnya, pembacaan saat ini dibanding ambang, arti tiap status, dan catatan
perawatan yang menyesuaikan jenis alat.

Pemindai kamera memakai `BarcodeDetector` bawaan Chrome/Edge — tanpa library tambahan.
Browser yang belum mendukungnya mendapat pesan jujur, dan kolom kode tetap tersedia di
kartu yang sama. Hak akses dijaga: pengguna hanya bisa membuka alat di area yang diampu.

**Penjelasan alat itu satu sumber, dipakai EMPAT tempat.** Isi penjelasannya tinggal di
`src/components/PanelInfoAlat.jsx` dan dipakai oleh:

| Tempat | Role | Cara membuka |
| --- | --- | --- |
| `/detail-informasi` | pengguna | pindai QR dengan kamera, atau ketik kode alat |
| `/iot/:id` → modal **QR alat** | pengguna | tombol QR di halaman detail perangkat |
| `/admin/detail-informasi` | pengelola | tempel isi QR, atau pilih alat dari daftar + pencarian |
| modal **QR alat** di `/admin/iot` | pengelola | tombol QR pada baris alat |

Sebelum disatukan, penjelasan ada di TIGA tempat dengan isi berbeda: halaman pengguna
menjelaskan semuanya, modal QR di Kelola IoT hanya nama/kategori/fungsi, dan modal QR di
List IoT memakai `QrPanel` sendiri. Akibatnya penjelasan yang dibaca pengelola tidak sama
dengan yang dibaca pengguna. Sekarang teks, ambang, arti status, dan catatan perawatan
berbunyi dari satu komponen, jadi menyuntingnya di satu tempat cukup. Yang tetap berbeda
hanya pintu masuknya dan tombol aksi di kartu QR: pengguna melihat tombol menuju halaman
perangkat, pengelola melihat tombol menuju halaman pengelola.

### Mengatur QR: yang bisa & belum bisa dilakukan pengelola

**Tombol aksi pada kartu QR** (untuk KEDUA role, karena semuanya berasal dari satu
komponen `src/components/AksiQr.jsx`):

| Tombol | Yang terjadi |
| --- | --- |
| **Unduh PNG** | Mengunduh **label siap tempel** `qr-<KODE>.png` — bukan QR mentah: kanvas 900×1100 px berisi QR + kode alat + nama perangkat + area + isi QR, dibuat saat tombol diklik |
| **Salin isi QR** | Menyalin `JAGOFARM|<kode>|<id>` ke papan klip untuk diuji di kolom pencarian (ada fallback `execCommand` untuk alamat non-HTTPS) |
| **Cetak label** | Membuka jendela cetak berisi label 76 mm; bisa langsung ke printer atau "Simpan sebagai PDF" |

Yang **sudah** bisa dilakukan pengelola sekarang:

| Tindakan | Di mana |
| --- | --- |
| Perangkat baru otomatis punya QR (isi dibentuk dari `code` + `id`) | Tambah perangkat di Kelola IoT |
| Mengubah kode alat (karena itu isi QR ikut berubah) | Ubah perangkat di Kelola IoT |
| Mengunduh label PNG, menyalin isi QR, mencetak label | tombol QR di Kelola IoT, `/admin/detail-informasi`, dan panel di halaman pengguna |
| Menghapus perangkat beserta QR-nya | tombol hapus di Kelola IoT |
| Memeriksa isi QR persis seperti yang dibaca pengguna | `/admin/detail-informasi`, modal QR |
| Memindai label fisik yang sudah ditempel di lapangan | `/admin/detail-informasi` → **Pindai QR alat** (kamera) |

Yang **belum** ada (jangan diklaim ada):

- **Mencetak gambar QR langsung dari data lama.** QR yang sudah dicetak/ditempel di alat
  (berisi tautan `http://127.0.0.1:4173/iot/IOT-001`) tetap terbaca karena pembacanya
  menerima tiga format. Tapi kalau alamat server berubah (mis. dipasang di domain nyata),
  label lama itu perlu dicetak ulang dari aplikasi — dan mencetak ulang berarti kode alat
  harus diubah dulu supaya isi QR-nya ikut berubah.
- **Riwayat cetak label** (siapa mencetak & kapan) — belum ada jejaknya.

Catatan penting saat memindai: **kamera tidak bisa membaca QR di layar yang sama**. Karena
itu pemindai sisi pengelola berguna untuk menguji label yang sudah ditempel, bukan untuk
menguji QR yang sedang tampil di monitor.

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

**Penyimpanan**: `localStorage` dengan kunci `aquasmart_smart_v1`. Data bertahan setelah
halaman di-refresh. Tombol **↻** di top bar mengembalikan data demo ke kondisi awal.

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

## 6. Status saat ini: SEMUA DATA MASIH DUMMY

**Belum ada perangkat IoT fisik yang tersambung.** Ini penting diketahui:

| Yang tampak hidup | Sebenarnya |
| --- | --- |
| Nilai sensor berubah tiap 5 detik | `setInterval` di `SmartStore.jsx` menambah angka acak kecil (simulasi) |
| 3 perangkat IoT (IOT-001 … IOT-003: pH, suhu, TDS) | Data tulisan tangan di `src/data/seed.js` |
| Riwayat harian (titik tiap 30 menit) | Dibuat sekali saat app dimuat dari pola acak, bukan hasil pembacaan alat |
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
2. **Kontrak nama parameter** sudah ditetapkan lewat `metric.key` dan **dibatasi ke tiga
   sensor yang benar-benar ada**: `ph`, `temp` (suhu air), `tds`. Perangkat cukup mengirim
   dengan kunci yang sama — kunci lain (DO, EC, turbidity, lux, kelembapan, flow, daya)
   sengaja tidak dipakai lagi di data, UI, maupun formulir.
3. **Ambang ideal** (pH 6,2–7,6; suhu 23,5–30,5 °C; TDS 520–980 ppm di `METRIC_RANGE`)
   dikelola di menu **Kategori Device** — pastikan nilainya cocok dengan alat yang dipakai.
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
- Sesi login & profil: login benar/salah, akun nonaktif ditolak, isi otomatis akun demo,
  ubah data profil & foto (tersimpan ke `localStorage`), ganti password (validasi password
  lama, panjang minimal, konfirmasi sama), logout, sesi bertahan setelah refresh
- Statistik harian kolam: terendah/rata-rata/tertinggi + jam pembacaan terakhir dihitung
  dari `readings`, status ambang diwarnai benar (di dalam / di luar ambang)
- **Detail Information selaras antar role** — `PanelInfoAlat.jsx` dipakai bersama; diuji
  dengan menempel kode alat yang sama di `/detail-informasi` dan `/admin/detail-informasi`
  lalu membandingkan teks hasil render: **identik** untuk 3 alat berbeda (AQ-PH-001 2031
  karakter, AQ-TMP-002 1997, AQ-TDS-003 2059). Modal QR di Kelola IoT juga memuat panel
  lengkap itu (3068 karakter), bukan lagi ringkasan nama/kategori/fungsi
- **Detail Information (pindai QR)** — menu pengguna untuk memindai QR alat lewat kamera,
  lalu menampilkan penjelasan lengkap alat tersebut. Tata letaknya diukur pada 6 lebar
  (760–1440px, termasuk 841px = lebar efektif layar pengguna): tombol rata dalam satu baris,
  tidak ada elemen meluber keluar kartu, `scrollX` tetap 0, kontras 0 gagal di kedua mode
- **Aksi QR (unduh/salin/cetak)** — `AksiQr.jsx` dipakai keempat pintu QR (pengguna:
  `/detail-informasi` & modal di `/iot/:id`; pengelola: `/admin/detail-informasi` & modal di
  `/admin/iot`). Diuji dengan mengklik tombolnya sungguhan, menangkap `a.download` dan
  `window.open`:
  - keempatnya menampilkan **tepat 3 tombol** (32px, satu baris) — pernah muncul 6 di modal
    Kelola IoT karena tombolnya ikut dipasang di modal DAN di panel bersama; duplikat dibuang
  - unduh → `qr-AQ-PH-001.png`, dan gambarnya diperiksa dengan `Image.onload`:
    **900×1100 px, ~50 KB** — label siap tempel, bukan QR 200px yang diperbesar
  - salin → papan klip berisi `JAGOFARM|AQ-PH-001|IOT-001` (persis yang dicari resolver)
  - cetak → jendela cetak dibuka lalu `print()` dipanggil
  - 0 error runtime, 0 gagal kontras di kedua mode
- **Pemindai kamera sisi pengelola** — `/admin/detail-informasi` kini juga bisa memindai
  label fisik, bukan hanya menempel isi QR. Diuji dengan menimpa `getUserMedia` +
  `BarcodeDetector`: `videoWidth` 320 (kamera benar-benar tersambung — bukti elemen `<video>`
  ter-mount sebelum `srcObject` dipasang), 2 kali deteksi, hasil muncul ("Cocok lewat ID
  perangkat")
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

- Autentikasi berbasis server: password masih tersimpan apa adanya di `localStorage`
  (tidak terenkripsi, tidak ada token sesi) — lihat catatan keamanan di bagian 3
- Verifikasi email saat pendaftaran (sekarang email hanya diperiksa format & keunikannya)
- Lupa password / reset mandiri (password hanya bisa diganti sendiri lewat Profil, atau
  ditimpa pengelola lewat Kelola User)
- Riwayat persetujuan akun (siapa menyetujui pengajuan & kapan) — statusnya disimpan, jejaknya belum
- Penyambungan data IoT asli (lihat bagian 6)
- Payment gateway, notifikasi email/WhatsApp
- Ekspor data dan unggah foto profil sendiri (sekarang memilih dari 6 avatar)
- Riwayat pembacaan sensor per **device** (grafik tren jangka panjang) — yang sudah ada baru
  riwayat **harian per area** (titik tiap 30 menit hari ini) yang dipakai statistik harian
- Riwayat ikan mati lintas hari (belum ada grafik tren kematian mingguan/bulanan)
- Sebagian aturan poin belum terhubung ke aksi otomatis (lihat bagian 5)
