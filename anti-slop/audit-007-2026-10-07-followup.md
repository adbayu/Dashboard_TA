# Follow-up audit antislop 007: UI IoT Minggu 3

Tanggal: 7 Oktober 2026

Follow-up untuk [audit awal](audit-007-2026-10-07.md). Laporan awal tetap tidak berubah. Bagian 7 Test Plan juga tidak diubah. Cakupan follow-up ini adalah temuan AS-007-01 sampai AS-007-03 dan bukti browser/kontras yang relevan.

## Status temuan

| ID | Aturan | Status | Perbaikan | Bukti |
| --- | --- | --- | --- | --- |
| AS-007-01 | R-25 | PASS | Warna fill tombol utama dimiliki kelas komponen, tanpa utility fill tumpang tindih. Border input dan tombol ghost diperkuat hanya di `.iot-touch-targets`; warna tema bersama dan ukuran sentuh tidak diubah. | `ed4020e`; tes regresi komposit alpha lulus; computed style Chrome dan hasil checker di bawah. |
| AS-007-02 | R-03 | PASS | Target sentuh IoT memakai kelas scoped, tanpa mengubah ukuran sentuh bawaan bersama. | `f4fdd3f`; pemeriksaan browser mengukur 105 target dengan lebar dan tinggi minimum 44 px. Pemeriksaan sebelumnya tidak menemukan overflow pada lebar 841, 768, 640, dan 360 px. |
| AS-007-03 | R-02 | PASS | Tujuh pemisah em dash diganti pada dokumen UX dan checklist dalam commit terpisah. | `c87cee6`; pemindaian perubahan dokumen menemukan nol karakter U+2014 pada baris yang diedit. |

## Verifikasi kontras

Chrome 154 memeriksa halaman Kelola IoT dengan schema PostgreSQL disposable pada port 55432. Pemeriksaan membaca computed style setelah transisi tema selesai. Nilai yang terukur:

| Tema | Kontrol | Computed style utama |
| --- | --- | --- |
| Terang | Tombol utama | Fill `rgb(15, 82, 56)`, teks putih |
| Terang | Input IoT | Isian `rgba(255, 255, 255, 0.9)`, border `rgba(15, 82, 56, 0.75)` |
| Terang | Tombol ghost | Isian `rgba(15, 82, 56, 0.05)`, border `rgba(15, 82, 56, 0.8)`, teks `rgb(25, 28, 29)` |
| Gelap | Tombol utama | Fill `rgb(59, 117, 89)`, teks putih |
| Gelap | Input IoT | Isian `rgba(40, 48, 44, 0.6)`, border putih 0.4 |
| Gelap | Tombol ghost | Isian putih 0.06, border putih 0.4, teks `rgb(233, 238, 234)` |

Probe ghost ditambahkan sementara ke permukaan `.iot-touch-targets` hanya saat capture, lalu langsung dihapus. Admin IoT sendiri tidak menampilkan tombol ghost dalam state yang diuji.

Checker `antislop-human/contrast-check.py` dijalankan pada pasangan yang sudah dikomposit terhadap endpoint gradien halaman. Semua batas kontrol memenuhi 3:1. Rasio yang dibawah ditulis sebagai `batas dalam / batas luar`:

| Kontrol dan tema | Latar halaman | Fill komposit | Batas komposit | Rasio batas |
| --- | --- | --- | --- | --- |
| Input terang | `#C4D3DB` | `#F9FBFB` | `#4A7C69` | 4.62:1 / 3.13:1 |
| Ghost terang | `#C4D3DB` | `#BBCDD3` | `#316B57` | 3.79:1 / 4.06:1 |
| Input gelap | `#0D1210` | `#1D2421` | `#777C7A` | 3.73:1 / 4.45:1 |
| Ghost gelap | `#0D1210` | `#1C201E` | `#777978` | 3.76:1 / 4.31:1 |

Ambang untuk batas kontrol adalah 3:1, bukan 4.5:1 yang berlaku untuk teks normal. Pasangan teks yang diperiksa juga lulus 4.5:1: teks utama putih pada fill terang/hover `9.19:1` dan `6.39:1`, fill gelap/hover `5.42:1` dan `5.11:1`; teks ghost terang `10.44:1` dan gelap `14.03:1`.

Capture browser pertama membaca tombol pada awal transisi warna 200 ms, sehingga hasil sesaat masih menunjukkan fill tema terang `#0F5238`. Itu bukan hasil settled. Harness CDP kini menunggu computed style yang diharapkan sebelum mengukur; capture ulang pada tema gelap menunjukkan `#3B7559`. Pemeriksaan itu tidak digunakan sebagai bukti kegagalan permanen.

## Bukti browser lain

- Focused CDP run berstatus PASS: 105 target sentuh Kelola IoT memenuhi 44 x 44 px; rotasi credential, copy, modal focus, Escape, dan pengembalian fokus lulus; alur login lalu klaim QR menghasilkan HTTP 200 dan satu ownership row.
- Error console/runtime: 0. Schema dan pool disposable dihapus; Chrome, Fastify, Vite, serta port aplikasi 3001/5173 ditutup. Listener PostgreSQL khusus yang sudah aktif pada port 55432 tetap berjalan untuk tes berikutnya.
- Per area: run browser mengukur 58 route per batch, tanpa 429, dan agregat cocok dengan PostgreSQL.
- Laporan JSON terbaru ada di `C:/Users/Hi/AppData/Local/hermes/cache/scratch/audit-007-e2-real-browser-report.json`; durasi run 568.777 ms dan status FAIL karena harness menuntut admin membuka detail Sandbox milik user. Detail Sandbox owner serta jalur UI-07/UI-10 yang diminta lulus. Laporan focused sebelumnya disimpan sebagai `audit-007-e2-real-browser-report-before-latest.json`.

## Verifikasi ulang M3 pada HEAD 73cb1ef

Pengujian memakai Chrome 154.0.8037.98, Fastify, dan PostgreSQL 18 pada schema disposable. Schema, pool, Fastify, Vite, dan Chrome ditutup setelah run; cluster port 55432 yang sudah berjalan sebelum harness dibiarkan hidup untuk verifikasi berikutnya.

| ID/cakupan | Status | Bukti |
| --- | --- | --- |
| UI-07 | PASS | Klik kontrol skenario `ph_turun` sungguhan; PUT berhasil HTTP 200. UI dan PostgreSQL menunjukkan pH low serta satu event threshold. Waktu dari perubahan skenario sampai state/event teramati sekitar 3,106 detik. |
| UI-10 | PASS | Pilih sensor pH di Monitoring Per sensor; overview HTTP 200 mengembalikan 21 entri, termasuk device satu-sensor dan paket. |
| Tab Monitoring, filter kejadian/sensor, refresh Per area | PASS pada cakupan yang direkam | Chrome mengklik tiga tab Monitoring, memilih pH, menerapkan filter device/jenis kejadian, cursor, dan tombol `Muat ulang`. Request terkait berstatus 200. Per area memakai 58 request per batch dan cocok dengan agregat PostgreSQL. |
| Skenario Sandbox | FAIL | `ph_turun` lulus; `normal`, `suhu_naik`, dan `offline` belum diuji melalui kontrol browser. |
| Rotasi dan salin | PASS pada alur sukses | Modal konfirmasi/reveal, focus entry, batas Shift+Tab/Tab, Escape, kembali ke pemicu, klik `Salin`, clipboard, pembersihan secret, dan response rotasi diverifikasi. |
| Target sentuh | PASS pada pengukuran yang direkam | Chrome mengukur 105 target Kelola IoT; minimum 44 x 44 px. Developer dan Monitoring juga terukur dengan tinggi minimum 44 px. |
| R-03 responsive | FAIL, cakupan parsial | Tidak ada overflow pada pemeriksaan Monitoring 360 px dan desktop 1280 px, tema terang/gelap. Matriks spesifik 841, 768, 640, 360 untuk bounding box halaman, chart, tabel Per sensor belum lengkap; field ukuran khusus pada report kosong. |
| R-25/R-34 visual | FAIL, cakupan parsial | Computed style dibaca pada halaman ter-render untuk Developer, Monitoring, dan Kelola IoT pada terang/gelap. Screenshot dan pengamatan visual belum dilakukan, jadi persyaratan visual belum terpenuhi. |
| R-32 keyboard | FAIL, cakupan parsial | Developer merekam lima fokus awal; modal rotasi lolos focus trap/Shift+Tab/Tab/Escape/return. Urutan Tab penuh halaman Monitoring belum direkam. |
### R-27 matriks state

| Permukaan | Loading | Kosong | Error | Berisi |
| --- | --- | --- | --- | --- |
| Monitoring Per paket | belum diuji | belum diuji | belum diuji | PASS, kartu paket render pada akun dengan device |
| Monitoring Per sensor | belum diuji | belum diuji | belum diuji | PASS, pH tampil untuk perangkat satu-sensor dan paket |
| Monitoring Per area | belum diuji | belum diuji | belum diuji | PASS, batch API dan agregat PostgreSQL cocok |
| Log kejadian | belum diuji | belum diuji | belum diuji | PASS, hasil filter dan pagination tampil |
| Panel Sandbox | belum diuji | belum diuji | belum diuji | PASS, sandbox nyata dan telemetry/event pH rendah terlihat |
| Modal rotasi credential | belum diuji | belum diuji | belum diuji | PASS, konfirmasi, rotasi, reveal, salin, dan cleanup |
| Alur klaim `/d/:code` | belum diuji | belum diuji | belum diuji | PASS, preview claimable, login, reload, klaim manual HTTP 200 |

Akun tanpa live device belum digunakan untuk memaksa state kosong. Backend tidak dihentikan saat halaman aktif untuk memaksa state error. Loading sengaja tidak diperlambat pada response real. Karena itu matriks ini belum memenuhi penerimaan R-27.

### R-32, tema/kontras, klik, dan responsif

| Pemeriksaan | Status | Bukti |
| --- | --- | --- |
| Tab order Developer | PASS terbatas | Chrome merekam lima fokus awal: Referensi API, dua tombol Buat key, skenario Sandbox, Salin curl. Urutan seluruh halaman belum dicatat. |
| Tab order Monitoring | belum diuji | Harness menguji fokus tab/roving key, bukan urutan Tab penuh antar seluruh kontrol. |
| Modal rotasi focus entry, Tab/Shift+Tab wrap, Escape, return | PASS | Modal memindahkan fokus ke dalam, kedua tepi trap teruji, Escape menutup, fokus kembali ke tombol pemicu. |
| Tema terang/gelap pada DOM yang dirender | PASS parsial | Computed style dibaca pada halaman Developer, Monitoring, dan Kelola IoT di Chrome setelah tema settle. Screenshot dan pengamatan visual belum dilakukan, jadi R-34/R-25 belum lengkap. |
| Klik tab Per paket, Per sensor, Per area | PASS | Tiga tab diklik sungguhan; panel ready tampil. |
| Filter sensor pH dan filter device/jenis event | PASS | Pilihan pH serta filter event mengirim request HTTP 200 dan memperbarui daftar. |
| Tombol Muat ulang Per area | PASS | Menghasilkan batch API berhasil, tanpa 429 pada run. |
| Skenario `ph_turun` | PASS | PUT HTTP 200, pH low dan event threshold terlihat dalam 3.106 ms. |
| Skenario `normal`, `suhu_naik`, `offline` | belum diuji | Belum diklik dalam Chrome. |
| Rotasi credential dan Salin | PASS | POST rotasi, klik Salin, clipboard cocok, secret dibersihkan setelah dialog tutup; nilainya tidak dicatat. |
| Lebar Monitoring 360 px dan 1280 px | PASS terbatas | Run menyatakan tanpa overflow horizontal untuk layout Monitoring pada terang/gelap. |
| Lebar 841, 768, 640 px; batas halaman, chart, tabel Per sensor pada keempat lebar | belum diuji | `responsiveWidths` pada report kosong; belum ada pengukuran bounding-box chart/tabel. |

Run penuh `audit-007-e2-real-browser-check.mjs` berstatus FAIL karena assertion harness juga mewajibkan admin membuka detail device Sandbox milik user; route mengarahkan admin ke halaman admin. Sandbox detail berhasil diperiksa pada sesi owner. Ini temuan ketidakcocokan assertion/role scope, bukan bukti bahwa admin boleh melewati ownership. HTTP/runtime console errors yang tidak diharapkan: 0. R-27 dan audit browser keseluruhan tetap belum diterima sampai matriks yang diminta selesai.

## Preflight tunnel host-side

Tiga hostname localtunnel ephemeral baru dicoba, dengan verifikasi DNS dan TLS standar terhadap ISRG Root X1 yang tertanam di firmware. URL tidak disimpan dalam laporan ini.

| Percobaan | DNS | TLS embedded root | Catatan |
| --- | --- | --- | --- |
| 1 | PASS | PASS | Sertifikat tervalidasi dengan `rejectUnauthorized=true`. |
| 2 | PASS | PASS | Sertifikat tervalidasi dengan `rejectUnauthorized=true`. |
| 3 | PASS | PASS | Sertifikat tervalidasi dengan `rejectUnauthorized=true`. |

Pemeriksaan ini hanya menguji DNS dan rantai TLS. Upstream sementara bukan Fastify, sehingga `/api/health` tidak diverifikasi melalui tunnel. Tidak ada credential provisioning atau flashing ESP32.

## Verifikasi build filesystem

`board_build.filesystem = littlefs` pada `firmware/platformio.ini`. `pio run -d firmware -e paket_water -t buildfs` dan `pio run -d firmware -e satuan_ph -t buildfs` sama-sama SUCCESS. Kedua image `littlefs.bin` berukuran 1.441.792 byte; partition table hasil build untuk `paket_water` memiliki partisi `spiffs` di offset `0x290000` berukuran `0x160000` (1.441.792 byte). Target PlatformIO `uploadfs` tersedia untuk kedua environment. Target `uploadfs` tidak dijalankan karena itu menulis ke ESP32 dan instruksi meminta berhenti sebelum flashing; karena itu keberhasilan transfer ke perangkat belum diverifikasi.

## Catatan keputusan owner dan status gate

Keputusan owner: **opsi 1**. Gate Minggu 3 tetap belum lulus penuh sampai bench fisik HW-02, HW-03, HW-04, HW-06, HW-07, HW-08 dan matriks state R-27 lengkap dinyatakan lulus. Tidak ada keputusan produk yang menunggu owner. Kriteria gate bagian 7 tidak diubah.

Bench fisik HW-02/03/04/06/07/08 belum dilakukan dan hanya boleh ditutup dengan bukti alat asli. Meskipun UI-07/UI-10 dan sebagian pemeriksaan browser lulus, R-27, R-32, R-34/R-25 visual, dan R-03 responsive lengkap masih terbuka. Karena itu gate M3 keseluruhan **belum lulus penuh**.

## Catatan commit

Commit SSE yang terlewat pada daftar sebelumnya: `d08b9f5 fix(iot): segarkan nilai setelah SSE tersambung kembali`. Commit ini memakai fetch streaming, membawa kredensial sesi same-origin, membatalkan stream saat logout/unmount, dan memperbarui nilai sekali setelah reconnect berhasil. Commit ini dipertahankan terpisah dan tidak diubah.

## Status audit

AS-007-01 sampai AS-007-03 tetap PASS untuk perbaikan yang sudah diverifikasi. Verifikasi ulang tidak mengubah laporan awal. Audit browser M3 dan gate keseluruhan tidak dinyatakan PASS karena matriks R-27 serta beberapa pemeriksaan wajib masih belum lengkap.

Harness tambahan untuk matriks belum dapat dibuat: OpenCode mengembalikan `Your authentication token has expired`. Tidak ada model pengganti yang digunakan dan tidak ada kode produk yang diubah. Perlu autentikasi ulang OpenCode sebelum melanjutkan pemeriksaan browser yang tersisa.
