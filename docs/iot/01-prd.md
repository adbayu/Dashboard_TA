# PRD: IoT System JagoFarm

| Atribut | Isi |
| --- | --- |
| Pemilik | Haykal (IoT System) |
| Status | Draft v0.1, belum direview tim |
| Tanggal | 3 Oktober 2026 |
| Branch kerja | `feat/iot-system` (dibuat dari `dev/antigravity`) |
| Sumber requirement | Papan tulis rapat 17/09/2026, bagian "IoT Systems" |
| Dokumen terkait | [Technical Design](02-technical-design.md), [API Contract](03-api-contract.md), [Firmware & Hardware](04-firmware-hardware.md), [UI/UX](05-ux-design.md), [Design System](06-design-system.md), [Test Plan](07-test-plan.md), [ADR](adr/README.md), [Desain halaman](design/README.md) |

## 1. Ringkasan

IoT System adalah bagian JagoFarm yang menerima data sensor kualitas air (pH, TDS, suhu air) dari ESP32, menyimpannya, lalu membukanya lewat satu API. API ini dipakai oleh tiga pihak: UI SmartDashboard, modul tim lain, dan mitra luar. Perangkat tersedia dalam dua opsi, IoT satuan (1 sensor) dan IoT paket (beberapa sensor dalam satu ESP32), dan dikelola lewat QR.

## 2. Masalah yang diselesaikan

1. UI SmartDashboard di `dev/antigravity` menyimpan seluruh data perangkat di `localStorage` dan `src/data/seed.js`. Nilai sensor yang tampil adalah simulasi di browser, bukan data alat.
2. Backend pilot (`server/`) sudah menerima telemetri, tapi model perangkatnya di-hardcode (`water-v1`, `environment-v1` di `server/domain.ts`) dan belum punya TDS.
3. Belum ada cara bagi modul tim lain atau pihak luar untuk mengambil data IoT secara resmi. Belum ada API key, sandbox, maupun dokumentasi API.
4. Belum ada firmware ESP32 di repo, jadi alat yang sudah dirakit belum bisa mengirim data ke backend.

## 3. Requirement dari papan

| No | Requirement di papan | Diterjemahkan menjadi |
| --- | --- | --- |
| 1 | Dashboard API | API publik `/api/v1` + halaman portal developer untuk kelola API key dan melihat pemakaian |
| 2 | Kelola Device: QR, Sensor, Paket IoT | Katalog jenis sensor, tipe IoT satuan dan paket, registrasi device, QR per device, klaim device lewat scan |
| 3 | Sandbox (API) | Environment uji dengan key `jf_test_` dan device virtual yang datanya digerakkan simulator |
| 4 | Dokumentasi | Referensi OpenAPI otomatis di `/docs` + panduan tertulis di `docs/iot/` |
| 5 | Monitoring IoT per paket/sensor | Tampilan per paket, per sensor, dan per area, lengkap dengan status koneksi, riwayat, dan ambang |
| 6 | Alat | Firmware ESP32 untuk varian satuan dan paket, kalibrasi, buffer offline |

## 4. Tujuan dan non-tujuan

Tujuan untuk rilis ini:

- G1. Minimal 1 unit ESP32 asli mengirim data ke backend tiap 30 detik selama 48 jam. Putus WiFi yang masih di dalam kapasitas buffer alat (48 jam) tidak boleh menghilangkan data, dan celah lebih dari 2 interval berturut-turut harus bisa dijelaskan (kriteria [Test Plan bagian 6](07-test-plan.md#6-uji-lapangan-48-jam)).
- G2. Admin bisa mengelola jenis sensor, tipe IoT satuan dan paket, device, serta mencetak QR tanpa mengubah kode.
- G3. Semua data IoT bisa diakses lewat `/api/v1` dengan API key ber-scope.
- G4. Mitra bisa mencoba API di sandbox tanpa menyentuh data asli.
- G5. Halaman IoT di SmartDashboard membaca data dari API, bukan dari `localStorage`.

Bukan tujuan rilis ini (dicatat supaya tidak melebar):

- MQTT, OTA update firmware, billing untuk mitra, email alert.
- Aktuator (pompa, aerator) dan sensor selain pH, TDS, dan suhu air.
- Memindahkan data non-IoT (V-Pet, gamifikasi, HPP area, chatbot) dari `SmartStore.jsx` ke backend.

## 5. Pengguna dan peran

| Peran | Di UI sekarang | Di backend | Kebutuhan utama |
| --- | --- | --- | --- |
| Pengguna lapangan | `pengguna` | `user` | Lihat kondisi air di area yang diampu, scan QR alat, klaim device |
| Pengelola farm | `pengelola` | `admin` | Daftarkan alat, atur tipe dan ambang, pantau seluruh farm |
| Developer modul tim | Belum ada | Pemegang API key live | Ambil data sensor untuk modulnya lewat API yang stabil |
| Mitra luar | Belum ada | Pemegang API key test/live | Coba API di sandbox, lalu integrasi dengan data asli |

Pemetaan nama peran UI ke backend (`pengelola` = `admin`, `pengguna` = `user`) dijelaskan di Technical Design.

## 6. Fitur dan prioritas

Prioritas memakai MoSCoW: M (Must), S (Should), C (Could). Gambar desain untuk setiap fitur ada di [design/README.md](design/README.md).

| ID | Fitur | Prioritas | Minggu |
| --- | --- | --- | --- |
| F-01 | Katalog jenis sensor (CRUD admin) | M | 1 |
| F-02 | Tipe IoT satuan dan paket (CRUD admin) | M | 1 |
| F-03 | Registrasi device dari tipe, credential device, kode alat | M | 1 |
| F-04 | QR per device (SVG/PNG siap cetak) dan buat ulang kode aktivasi | M | 1 |
| F-05 | Klaim device lewat scan QR atau input kode manual | M | 1 |
| F-06 | Ingest v2 (satuan dan paket), v1 tetap diterima | M | 1 |
| F-07 | Migrasi 3 device lama di seed sebagai IoT satuan | M | 1 |
| F-08 | API key live dan test dengan scope, cabut key | M | 2 |
| F-09 | Rate limit per key dan log pemakaian | M | 2 |
| F-10 | Portal developer `/developer` (Dashboard API) | M | 2 |
| F-11 | Halaman List IoT, Kelola IoT, Detail Information membaca dari API | M | 2 |
| F-12 | Nilai terakhir dan riwayat teragregasi per sensor | M | 3 |
| F-13 | Ambang default per jenis sensor + override per area | M | 3 |
| F-14 | Log kejadian (online, offline, keluar ambang) | M | 3 |
| F-15 | Monitoring per paket, per sensor, per area | M | 3 |
| F-16 | Update live lewat SSE | S | 3 |
| F-17 | Sandbox: device virtual otomatis + skenario | M | 3 |
| F-18 | Referensi OpenAPI di `/docs` dengan Scalar | M | 4 |
| F-19 | Panduan tertulis (quickstart, kontrak ingest, wiring) | M | 4 |
| F-20 | Firmware ESP32 varian satuan dan paket | M | 1 sampai 3 |
| F-21 | Ekspor riwayat ke CSV | C | Setelah rilis |

## 7. User story dan kriteria terima

**US-01. Admin mendaftarkan IoT paket baru** (F-01, F-02)
Sebagai pengelola, saya ingin membuat tipe IoT paket dari jenis sensor yang sudah ada, supaya alat baru bisa didaftarkan tanpa ubah kode.

- Tipe paket wajib punya minimal 2 sensor, tipe satuan tepat 1 sensor.
- Kode tipe unik dan tidak bisa diubah setelah ada device yang memakainya.
- Tipe yang masih punya device aktif tidak bisa dihapus, hanya dinonaktifkan.

**US-02. Admin mendaftarkan device dan mencetak QR** (F-03, F-04)
Sebagai pengelola, saya ingin membuat device dari sebuah tipe lalu mencetak QR-nya, supaya alat bisa ditempel label dan dipasang di kolam.

- Credential device hanya ditampilkan sekali saat dibuat.
- QR berisi kode alat dan kode aktivasi, bisa diunduh sebagai SVG dan PNG.
- Label QR dicetak saat alat siap dipasang, karena kode aktivasi di dalamnya berlaku 24 jam ([ADR-0009](adr/0009-qr-dicetak-saat-pemasangan.md)). Kalau kedaluwarsa, pengelola menekan "Buat ulang kode aktivasi" lalu mencetak label baru. Kode lama langsung tidak berlaku.
- Kode alat mengikuti format `AQ-<SENSOR>-<NNN>` untuk satuan dan `AQ-PKT-<NNN>` untuk paket. Nomor urut dihitung per prefix dan melanjutkan nomor tertinggi yang sudah ada. Kode lama (`AQ-PH-001`, `AQ-TMP-002`, `AQ-TDS-003`) dipakai apa adanya, jadi device pH berikutnya menjadi `AQ-PH-002`.

**US-03. Pengguna mengklaim device lewat QR** (F-05)
Sebagai pengguna lapangan, saya ingin scan QR di alat dan mengklaimnya ke akun saya, supaya datanya muncul di dashboard saya.

- Scan memakai kamera HP. Kalau browser tidak mendukung pemindai, tersedia input kode manual.
- Device yang sudah diklaim orang lain hanya menampilkan informasi publik dan pesan bahwa alat sudah dipakai.
- Kode aktivasi kedaluwarsa 24 jam setelah dibuat, sama seperti pilot sekarang. Halaman QR yang dibuka dengan kode kedaluwarsa meminta pengguna menghubungi pengelola untuk mencetak ulang label.

**US-04. Pengguna memantau kondisi air** (F-12 sampai F-16)
Sebagai pengguna lapangan, saya ingin melihat nilai terakhir dan grafik per sensor, supaya tahu kapan air perlu ditangani.

- Status koneksi selalu tertulis (Terhubung, Data tertunda, Tidak terhubung), bukan hanya warna.
- Nilai di luar ambang diberi label dan tercatat di log kejadian.
- Grafik tersedia untuk 1 jam, 24 jam, dan 7 hari.

**US-05. Developer modul tim mengambil data lewat API** (F-08, F-09, F-10)
Sebagai developer modul lain, saya ingin membuat API key dengan scope baca, supaya modul saya bisa mengambil readings tanpa akses admin.

- Secret key hanya ditampilkan sekali, setelah itu hanya prefix yang terlihat.
- Request dengan key yang dicabut langsung ditolak dengan 401.
- Request melebihi batas mendapat 429 dengan header `retry-after`.

**US-06. Mitra mencoba API di sandbox** (F-17, F-18)
Sebagai mitra, saya ingin mencoba endpoint dengan key test dan device virtual, supaya bisa integrasi tanpa menunggu alat fisik.

- Key `jf_test_` tidak pernah bisa membaca device asli.
- Device virtual punya skenario normal, pH turun, suhu naik, dan offline.
- Contoh request bisa dicoba langsung dari `/docs`.

**US-07. Alat tetap aman saat WiFi putus** (F-20)
Sebagai pengelola, saya ingin alat menyimpan data saat WiFi mati dan mengirim ulang saat tersambung, supaya riwayat tidak bolong.

- Data yang dikirim ulang tidak menimpa nilai terbaru (perilaku pilot S1-08 tetap berlaku).
- Pengiriman ulang dengan `messageId` yang sama tidak membuat data ganda.

## 8. Kebutuhan non-fungsional

| Area | Kebutuhan |
| --- | --- |
| Keamanan | Semua secret (API key, credential device, sesi) hanya disimpan sebagai hash SHA-256. Scope dicek per route. Pengecekan Origin (CSRF) tetap berlaku untuk request ber-cookie |
| Isolasi data | User hanya melihat device miliknya. Key test hanya melihat device sandbox. Perilaku isolasi pilot (S1-04) tetap lulus |
| Keandalan data | Ingest idempoten per `messageId`. Buffer di alat mampu menampung putus koneksi sampai 48 jam |
| Retensi data | Readings device asli disimpan minimal 1 tahun (usulan). Readings sandbox disimpan 7 hari dan log pemakaian API 30 hari, sesuai Technical Design bagian 10 |
| Kapasitas | Target pilot: 20 device × 2.880 pengukuran per hari (interval 30 detik) = 57.600 baris readings per hari, sekitar 21 juta baris per tahun. Angka ini usulan yang dihitung dari batas pilot 20 unit |
| Kesegaran data | Status `stale` setelah 90 detik tanpa pengukuran baru, `offline` setelah 180 detik tanpa kiriman (logika `connectionStatus` yang sudah ada) |
| Aksesibilitas | Mengikuti `DESIGN.md` dan antislop: status tidak hanya warna, bisa dipakai dengan keyboard, kontras WCAG AA |
| Bahasa | UI dan pesan error dalam Bahasa Indonesia. Nama field API dalam bahasa Inggris |

## 9. Ukuran keberhasilan

Rilis dianggap selesai kalau semua gate di [Test Plan](07-test-plan.md) lulus. Ringkasnya:

- Uji lapangan 48 jam lulus sesuai kriteria [Test Plan bagian 6](07-test-plan.md#6-uji-lapangan-48-jam).
- Semua user story US-01 sampai US-07 lulus uji terima.
- Uji kontrak backend (`pilot.test.ts` yang diperluas) hijau.
- Halaman IoT tidak lagi membaca `localStorage` untuk data perangkat.

## 10. Batasan dan asumsi

- Batas pilot di kode sekarang: 10 akun dan 20 unit (`server/app.ts`). Batas ini perlu dinaikkan atau dibuat konfigurasi kalau satuan dan paket dipakai bersamaan.
- Jadwal (mulai 5 Oktober, demo paling lambat 1 November 2026) adalah asumsi dari target kurang dari sebulan.
- Model ESP32 dan modul sensor yang sudah dirakit belum dikonfirmasi. Data `model` di `seed.js` (Atlas EZO-pH, Gravity TDS V1.0, DS18B20) adalah data contoh, belum tentu sama dengan alat asli.
- Hosting untuk uji lapangan belum ditentukan.

## 11. Pertanyaan terbuka

| No | Pertanyaan | Ditanyakan ke |
| --- | --- | --- |
| Q1 | Apakah interpretasi "Dashboard API" (API publik + portal developer) sudah sesuai? | Tim |
| Q2 | Siapa yang boleh membuat key live untuk mitra: hanya admin, atau user juga? | Tim |
| Q3 | Mitra masuk ke portal pakai akun apa? Perlu peran baru `partner` atau cukup `user`? | Tim |
| Q4 | Data area/kolam tanggung jawab modul siapa? | Tim |
| Q5 | Modul "Kelola ..." di sisi kanan papan dipegang siapa saja, dan data IoT apa yang mereka butuhkan? | Tim |
| Q6 | Model persis ESP32 dan modul sensor yang sudah dirakit, serta jumlah unit satuan dan paket | Haykal |
| Q7 | Hosting untuk demo dan uji lapangan | Tim |
