# Test Plan & Acceptance: IoT System

| Atribut | Isi |
| --- | --- |
| Status | Draft v0.1 |
| Dasar | [PRD](01-prd.md), [API Contract](03-api-contract.md), [Firmware & Hardware](04-firmware-hardware.md) |

## 1. Lapisan pengujian

| Lapisan | Alat | Lokasi | Kapan dijalankan |
| --- | --- | --- | --- |
| Kontrak backend | `node --test` + PostgreSQL asli | `server/pilot.test.ts` (diperluas) dan `server/v1.test.ts` (baru) | Setiap PR. Script `test:pilot` sekarang hanya menjalankan `pilot.test.ts`, jadi tambahkan script `test:v1` atau perluas pola file-nya |
| Typecheck | `tsc -p server/tsconfig.json` | `server/` | Setiap PR |
| Lint frontend | `oxlint` | `src/` | Setiap PR |
| Uji manual UI | Checklist di bagian 4 | Browser desktop dan HP | Setiap akhir minggu |
| Uji bench alat | Checklist di bagian 5 | Meja kerja, gelas berisi air | Minggu 1 sampai 3 |
| Uji lapangan | Prosedur di bagian 6 | Kolam | Minggu 4 |

Aturan yang sudah berlaku di pilot tetap dipakai: uji backend memakai database sungguhan, bukan mock, dan backend yang mati harus menghasilkan error yang terlihat, bukan data contoh.

## 2. Regresi pilot

Semua uji yang sudah ada di `pilot.test.ts` wajib tetap hijau setelah migration 002. Ini termasuk S1-01 sampai S1-11, isolasi riwayat, rotasi credential saat transfer, CSRF, dan batas pilot.

## 3. Uji kontrak `/api/v1` (otomatis)

| ID | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| V1-01 | Migration 001 + 002 dijalankan dua kali | Kali kedua tidak mengubah apa pun, tidak error |
| V1-02 | Buat tipe satuan dengan 2 sensor | 400 `VALIDATION_FAILED` |
| V1-03 | Buat tipe paket dengan 1 sensor | 400 `VALIDATION_FAILED` |
| V1-04 | Ubah sensor di tipe yang sudah punya device | 409 `CONFLICT` |
| V1-05 | Ingest v2 satuan dengan 1 nilai, lalu kirim ulang payload yang sama | 200, readings tersimpan; retry `messageId` sama memberi `duplicate: true` |
| V1-06 | Ingest v2 paket dengan sensor kurang atau berlebih | 400 `VALIDATION_FAILED` |
| V1-07 | Ingest v2 dengan `type` berbeda dari tipe device | 400 `VALIDATION_FAILED` |
| V1-08 | Ingest v1 dari device pilot lama | Tetap 200 |
| V1-09 | Key `test` membaca device live | 404 |
| V1-10 | Key `live` membaca device sandbox | 404 |
| V1-11 | Key tanpa `readings:read` memanggil `/latest` | 403 `FORBIDDEN_SCOPE` |
| V1-12 | Key yang sudah dicabut | 401 `UNAUTHENTICATED` |
| V1-13 | Request dengan cookie dan key sekaligus | 400 `AMBIGUOUS_AUTH` |
| V1-14 | POST sandbox claim dengan key test tanpa `Origin` | Pengecekan Origin tidak menolak, tetapi device sandbox tersembunyi dengan 404 `NOT_FOUND` |
| V1-15 | Request cookie dengan `Origin` asing (POST) | 403 |
| V1-16 | Key `live` melewati 60 request per menit | 429 dengan `retry-after` |
| V1-17 | Klaim dengan kode aktivasi kedaluwarsa | 400 |
| V1-18 | Dua akun mengklaim device live yang sama bersamaan | Tepat satu berhasil, satunya 409 |
| V1-19 | Nilai keluar ambang lalu kembali normal | Tepat 2 event: `threshold_low`/`high` lalu `threshold_clear` |
| V1-20 | Override ambang area | `/latest` memakai ambang area, `threshold.source = "area"` |
| V1-21 | `/readings?bucket=5m` untuk 24 jam | Maksimal 288 titik, urut waktu |
| V1-22 | `/readings` dengan rentang lebih dari 31 hari | 400 |
| V1-23 | SSE: actor A tidak menerima event device milik B | Tidak ada event B di stream A |
| V1-24 | Device tanpa kiriman lebih dari 180 detik | Event `offline` ditulis tepat sekali |
| V1-24b | Job offline publish event ke SSE setelah commit dan mengalami rollback | Event terbit setelah commit; rollback tidak mempublish |
| V1-25 | Device lama `IOT-001` dicari lewat `legacyId` dan kode `AQ-PH-001` | Keduanya menemukan device yang sama |
| V1-26 | `POST /devices/:id/qr` dengan sesi `user` | 403 |
| V1-27 | Database mati | 503 `UNAVAILABLE`, tanpa data contoh |
| V1-28 | Kode aktivasi dibuat ulang lewat `POST /devices/:id/activation`, lalu kode lama dipakai untuk klaim | Kode lama ditolak 400, kode baru berhasil |
| V1-29 | Generator kode alat setelah `AQ-PH-001` sudah ada | Device pH baru mendapat `AQ-PH-002` |
| V1-30 | Rotasi, release, claim, aktivasi, QR, atau preview QR terhadap device sandbox | Semua route menolak dengan 404 `NOT_FOUND` |
| V1-31 | Rotasi credential: hak admin, hash dan timestamp atomik, ingest lama/baru, race rotasi-ingest | Scope non-admin ditolak 403; credential lama 401 sesudah commit, credential baru diterima; race terserialisasi |
| V1-32 | Retensi data sandbox melewati event threshold/koneksi terakhir | Hanya event anchor terakhir dipertahankan; readings/events live tidak disentuh dan threshold tidak ditulis ulang |
| V1-33 | Sesi akun yang belum pernah membuat key test membuka `/sandbox/devices` | Device sandbox diprovisikan idempoten dan satu kali |

## 4. Uji manual UI

| ID | Langkah | Lulus kalau |
| --- | --- | --- |
| UI-01 | Login SmartDashboard dengan akun backend | Menu sesuai peran, profil lama tetap terbaca |
| UI-02 | Matikan backend lalu buka List IoT | Pesan error tampil, tidak ada device contoh |
| UI-03 | Buat tipe paket, buat device, unduh QR | QR bisa di-scan HP dan membuka `/d/:code` |
| UI-04 | Scan QR dari HP, klaim | Device muncul di List IoT akun tersebut |
| UI-05 | Buka `/d/:code` milik orang lain | Info publik + pesan alat sudah dipakai |
| UI-06 | Browser tanpa `BarcodeDetector` (Safari/Firefox) | Input kode manual tersedia dan berfungsi |
| UI-07 | Ubah skenario sandbox ke `ph_turun` | Dalam 1 sampai 2 siklus, kartu pH berubah ke "Di bawah ambang" dan muncul di log kejadian |
| UI-08 | Buat key test, salin secret, tutup modal | Secret tidak bisa dilihat lagi, prefix tampil di tabel |
| UI-09 | Cabut key lalu panggil API dengan key itu | 401 |
| UI-10 | Monitoring tab Per sensor, pilih pH | Device satuan dan paket yang punya pH tampil bersama |
| UI-11 | Ulangi UI-01 sampai UI-10 di mode gelap | Semua teks terbaca, tidak ada elemen hilang |
| UI-12 | Lebar 360 px dan 841 px | Tidak ada scroll horizontal |
| UI-13 | Jalankan seluruh alur hanya dengan keyboard | Semua aksi bisa dicapai, fokus terlihat, Escape menutup modal |
| UI-14 | Buka List IoT dan Detail device dengan telemetry, lalu putuskan SSE setelah tersambung | Nilai terbaru, riwayat 24 jam, dan kejadian berasal dari API; status menunjukkan "Menyambung ulang...", lalu polling menampilkan "Diperbarui tiap 30 detik" bila reconnect gagal |
| UI-15 | Kelola IoT: bandingkan device live terprovisioning, live belum terprovisioning, dan sandbox | Rotasi hanya tampil untuk device live dengan `credentialProvisioned: true`. Modal memindahkan fokus ke dalam, mengunci Tab/Shift+Tab, Escape menutup dan memulihkan fokus; secret tampil sekali dan dialog meminta salin atau pengakuan penyimpanan sebelum ditutup |
| UI-16 | Buat request awal SSE menerima respons non-200, termasuk 429 | Stream tidak dicoba ulang dan UI melanjutkan polling dengan label "Diperbarui tiap 30 detik" |

## 5. Uji bench alat

| ID | Langkah | Lulus kalau |
| --- | --- | --- |
| HW-01 | Ukur tegangan output modul pH dan TDS di air | Tidak pernah lebih dari 3,3 V di pin ESP32 |
| HW-02 | Kalibrasi pH dengan buffer 7,00 dan 4,00, lalu ukur ulang kedua buffer | Selisih maksimal ±0,1 pH (target usulan) |
| HW-03 | Ukur larutan standar TDS setelah kalibrasi | Selisih maksimal ±10% dari nilai standar (target usulan) |
| HW-04 | Varian paket: bandingkan pH dengan modul TDS menyala vs dimatikan | Selisih tidak signifikan saat TDS dimatikan ketika pH dibaca. Kalau tetap terganggu, catat dan diskusikan solusi isolasi |
| HW-05 | Bandingkan DS18B20 dengan termometer acuan | Selisih maksimal ±0,5 °C (akurasi datasheet DS18B20) |
| HW-06 | Cabut WiFi 30 menit lalu sambungkan lagi | Semua sampel terkirim, tanpa celah, tanpa duplikat |
| HW-07 | Restart alat saat WiFi tersambung | Lanjut mengirim tanpa provisioning ulang |
| HW-08 | Rotasi credential dari dashboard lalu provisioning ulang dengan credential baru | Alat masuk state Halted, LED menyala terus. Record buffer lama dengan `measuredAt` sebelum `credential_since` baru ditolak 400 `VALIDATION_FAILED`; ini perilaku yang dimaksud, bukan bug |
| HW-09 | Provisioning dari awal lewat portal | Selesai dari HP tanpa kabel serial |

## 6. Uji lapangan 48 jam

Persiapan:

1. Minimal 1 IoT paket (atau 3 IoT satuan) dipasang di kolam, dikalibrasi di hari yang sama.
2. Backend jalan di hosting yang bisa dijangkau alat.
3. Catat waktu mulai.

Selama uji:

- Putuskan WiFi minimal satu kali selama 30 sampai 60 menit, dengan sengaja.
- Ambil satu pengukuran manual (test kit pH atau termometer) di pagi, siang, dan malam hari, lalu catat untuk dibandingkan.

Kriteria lulus:

| Kriteria | Cara cek |
| --- | --- |
| Tidak ada celah data | Jumlah readings per sensor mendekati 48 × 120 = 5.760. Celah lebih dari 2 interval berturut-turut harus bisa dijelaskan |
| Tidak ada duplikat | `SELECT device_id, message_id, count(*) ... HAVING count(*) > 1` kosong |
| Event offline dan online tercatat saat WiFi diputus | Ada di `device_events` dengan waktu yang cocok |
| Nilai masuk akal | Pengukuran manual berada di dalam toleransi HW-02, HW-03, dan HW-05 |
| Dashboard menampilkan status yang benar selama uji | Dicek manual minimal 3 kali sehari |

## 7. Gate mingguan

| Gate | Kriteria |
| --- | --- |
| Minggu 1: Data ESP32 masuk DB | V1-01 sampai V1-08, V1-25, V1-28, V1-29 hijau. HW-01, HW-05, HW-09 siap diuji pada alat asli |
| Minggu 2: Key mitra berfungsi | V1-09 sampai V1-18 hijau. UI-01 sampai UI-06, UI-08, UI-09 lulus |
| Minggu 3: Dashboard live | V1-19 sampai V1-24 hijau. UI-07, UI-10 lulus. HW-02 sampai HW-04, HW-06 sampai HW-08 lulus |
| Minggu 4: Demo siap | Semua uji di dokumen ini hijau, termasuk uji lapangan 48 jam dan UI-11 sampai UI-13 |

Status verifikasi Minggu 1 pada 4 Oktober 2026: **PASS** untuk gate software dan kesiapan bench. `test:v1` lulus 17/17, `test:pilot` 16/16, dan keempat environment firmware berhasil dibangun. HW-01, HW-05, dan HW-09 siap diuji pada alat asli; pengujian fisik belum dilakukan. Kriteria gate di atas tidak diubah.

Status verifikasi Minggu 2 pada 4 Oktober 2026: **FAIL/belum lulus gate penuh**. V1-09 sampai V1-18: **PASS**. UI-01, UI-02, UI-05, UI-06, UI-08, dan UI-09: **PASS**. Playwright E2E UI-01 menguji form login asli dengan schema PostgreSQL sementara dari `TEST_DATABASE_URL` dan akun admin/user berpassword acak yang hanya disimpan di memori. Kedua role berhasil login, menu Developer/Kelola IoT sesuai peran, nama profil lama tetap tampil, dan logout mengembalikan form login; `pageErrors: 0`. Empat respons HTTP 401 sebelum sesi terautentikasi memang diharapkan, bukan error JavaScript. Password tidak ditulis, dicetak, atau dilaporkan. UI-03 dan UI-04: **belum diuji** untuk pemindaian QR dengan HP fisik; alur URL dan klaim di browser lulus. `test:pilot` lulus 16/16, `test:v1` lulus 35/35, serta typecheck, lint, dan build lulus. Keempat environment firmware berstatus **SUCCESS** (output build: `4 succeeded`). Kriteria gate di atas tidak diubah.

Pembaruan status Minggu 2 pada 5 Oktober 2026: masih **FAIL/belum lulus gate penuh**. Setelah perbaikan lanjutan, `test:v1` lulus 38/38 (termasuk uji `scopes: []` dan batas gagal autentikasi API key), `test:pilot` 16/16, dan unit test frontend 26/26, diverifikasi ulang di Windows dengan PostgreSQL 18 lokal. Typecheck, lint, dan build juga lulus. Persiapan uji HP lewat tunnel HTTPS tersedia di `docs/panduan-uji-manual.md` bagian 4.3. UI-03 dan UI-04 tetap **belum diuji** sampai pemindaian QR dengan HP fisik dilaporkan. Kriteria gate di atas tidak diubah.

Status akhir Minggu 2 pada 5 Oktober 2026: **PASS**. UI-03 dan UI-04 diuji dengan HP Android fisik lewat tunnel HTTPS (`docs/panduan-uji-manual.md` bagian 4.3) memakai database uji terpisah dan akun uji sementara. UI-03: label QR device paket `AQ-PKT-001` terbaca oleh pemindai di aplikasi dan membuka `/d/AQ-PKT-001`. UI-04: akun `user` mengklaim device tersebut, device tampil di List IoT akun itu, dan tabel `ownerships` mencatat akun `user` sebagai pemilik. Pengujian ini menemukan bug pemindai QR: loop deteksi berhenti permanen saat effect dijalankan ulang (React StrictMode di development), sehingga kamera tampil tetapi QR tidak pernah terbaca. Bug diperbaiki di `src/components/QrScanner.jsx` sebelum UI-03 dan UI-04 dinyatakan lulus. Semua kriteria gate Minggu 2 terpenuhi; kriteria di atas tidak diubah.

Status verifikasi A-D backend pada 6 Oktober 2026: `test:pilot` 16/16, `test:v1` 58/58, typecheck, lint, dan build lulus. HW-08: **belum diuji**, menunggu alat asli. Kriteria gate mingguan di bagian 7 tidak diubah.

Status verifikasi E1 pada 6 Oktober 2026: unit frontend 44/44, typecheck, lint, dan build lulus. Click-through headless Chrome memakai fixture API terkontrol pada lebar 360, 841, dan 1280 px; mencakup loading/empty/error/retry List IoT, latest dan polling 429, tema terang/gelap, navigasi Detail, pembacaan dan kejadian live, reconnect berurutan dengan `Last-Event-ID`, seleksi sensor grafik, error riwayat/kejadian, konfirmasi rotasi, Escape dan pemulihan fokus, penolakan 409 yang bisa dicoba ulang, salin credential satu kali, dan penghapusan secret dari state saat dialog ditutup. Tidak ada overflow horizontal atau error console/runtime. Kontrak dan persistensi backend diverifikasi terpisah dengan PostgreSQL asli pada `test:pilot` dan `test:v1`. Kriteria gate mingguan di bagian 7 tidak diubah.
