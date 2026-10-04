# ADR-0011: Pembuatan gambar QR menerima kode aktivasi di body

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Credential dan kode aktivasi hanya disimpan sebagai hash SHA-256 dan ditampilkan sekali saat dibuat atau dibuat ulang. Endpoint GET QR sebelumnya tidak memiliki cara untuk memperoleh kembali kode mentah yang diperlukan untuk membuat URL pada gambar QR. Menaruh kode di query URL juga dapat membocorkannya ke log atau riwayat browser.

## Keputusan

Gunakan `POST /api/v1/devices/:id/qr?format=svg|png` dengan `activationCode` di body JSON. Server mencocokkan hash kode dan masa berlakunya, lalu membuat gambar tanpa menyimpan kode mentah. Hanya admin yang dapat memakai endpoint ini.

## Konsekuensi

- Klien harus menyimpan kode aktivasi yang baru saja diterima dari pembuatan device atau endpoint buat ulang sampai label QR selesai dibuat.
- Kode yang salah, kedaluwarsa, sudah dipakai, atau sudah diganti mendapat 409 `CONFLICT`.
- Kode aktivasi tidak muncul di URL endpoint, log request, atau penyimpanan backend dalam bentuk mentah.

## Alternatif yang ditolak

- **GET dengan kode aktivasi pada query:** secret dapat tercatat pada URL, log proxy, dan riwayat browser.
- **Menyimpan kode aktivasi mentah:** bertentangan dengan aturan bahwa secret hanya disimpan sebagai hash.
