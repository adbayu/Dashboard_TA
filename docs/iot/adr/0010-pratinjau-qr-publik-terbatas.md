# ADR-0010: Pratinjau QR publik dengan field terbatas

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Halaman `/d/:code` dibuka dari QR sebelum pengguna masuk. Kontrak API umum mewajibkan sesi untuk membaca device, sedangkan desain QR perlu menampilkan ringkasan agar pengguna dapat memastikan alat yang akan diklaim. Data area belum diputuskan kepemilikannya (Q4).

## Keputusan

`GET /api/v1/devices?code=...` menjadi endpoint publik untuk pratinjau QR. Response hanya berisi kode dan nama device, tipe, daftar sensor, status klaim, serta hasil pemeriksaan kode aktivasi yang diberikan lewat parameter `c`. Endpoint tidak mengembalikan area, readings, ID pemilik, credential, atau kode aktivasi mentah.

## Konsekuensi

- Halaman QR dapat menampilkan ringkasan sebelum login.
- Kode device dapat ditebak, tetapi endpoint tidak membuka data operasional atau identitas akun.
- Informasi area tetap disembunyikan sampai keputusan Q4 dibuat.

## Alternatif yang ditolak

- **Mewajibkan sesi untuk pratinjau:** halaman QR tidak dapat memberi konteks alat sebelum pengguna masuk.
- **Mengembalikan seluruh detail device:** membuka area, readings, atau metadata pemilik ke publik.
