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
- Error console/runtime: 0. Cleanup schema, pool, Chrome, Fastify, Vite, PostgreSQL disposable, dan port berstatus selesai.
- Per area bukan temuan: run E2 sebelumnya mengukur 58 route, mengikuti governor global maksimum 50 request dalam rolling 60 detik, tanpa 429; agregat cocok dengan PostgreSQL. Durasi batch sekitar 60 detik tidak memerlukan perubahan produk.
- File JSON scratch saat ini berisi focused rotation-tail run. Bukti full E2 sebelumnya berasal dari output sesi dan tidak tersedia lagi sebagai JSON tersimpan.

## Belum diuji

- Matriks lengkap loading, kosong, error, dan berisi untuk setiap tab Monitoring, Log kejadian, panel Sandbox, modal rotasi, dan alur klaim: **belum diuji**. Interaksi dan jalur berhasil tertentu sudah diuji, tetapi itu bukan pengganti matriks penuh per permukaan.
- Pengujian bench perangkat fisik Minggu 3, termasuk HW-02 sampai HW-08: **belum diuji** pada follow-up ini.
- Keputusan owner apakah bukti software cukup untuk penerimaan sementara atau gate Minggu 3 harus menunggu verifikasi perangkat fisik: **menunggu keputusan**.

## Keputusan produk dan status gate

Keputusan produk **menunggu keputusan owner**. Opsi:

1. **Rekomendasi:** pertahankan gate Minggu 3 belum lulus penuh sampai uji bench perangkat fisik dan matriks state UI selesai.
2. Terima status software-only untuk temuan audit ini, tetapi catat gate Minggu 3 tetap belum lulus penuh dan semua pemeriksaan fisik/UI yang belum dilakukan tetap pending.
3. Ajukan penjadwalan ulang pemeriksaan fisik melalui revisi rencana yang disetujui owner. Follow-up ini tidak mengubah kriteria Test Plan bagian 7.

Status akhir: AS-007-01 sampai AS-007-03 **PASS** dalam cakupan follow-up. Gate Minggu 3 secara keseluruhan **belum dinyatakan PASS** karena pemeriksaan fisik dan matriks state lengkap masih belum diuji serta keputusan produk masih menunggu owner.
