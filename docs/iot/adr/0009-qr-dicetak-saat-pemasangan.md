# ADR-0009: Label QR dicetak saat alat siap dipasang

Status: Diterima · Tanggal: 3 Oktober 2026

## Konteks

QR di label alat berisi kode aktivasi. Pilot membuat kode aktivasi kedaluwarsa 24 jam. Kalau label dicetak jauh sebelum alat dipasang, kodenya sudah tidak berlaku saat pengguna lapangan mencoba klaim (temuan audit 004 nomor 1).

## Keputusan

Kode aktivasi tetap berlaku 24 jam. Label QR dicetak saat alat siap dipasang. Kalau kodenya kedaluwarsa, pengelola menekan "Buat ulang kode aktivasi" (`POST /devices/:id/activation`) lalu mencetak label baru. Kode lama langsung tidak berlaku.

## Konsekuensi

- Label yang terlanjur tertempel bisa jadi tidak berlaku. Halaman QR menampilkan pesan "Kode di QR ini sudah kedaluwarsa. Minta pengelola mencetak ulang QR."
- Jendela penyalahgunaan label yang hilang atau difoto orang lain tetap pendek (24 jam).
- Pengelola perlu printer label atau cara mencetak di lokasi pemasangan.

## Alternatif yang ditolak

- **Kode berlaku sampai diklaim:** label bisa dicetak kapan saja, tapi label yang hilang atau difoto bisa dipakai siapa pun yang lebih dulu memindainya, tanpa batas waktu.
