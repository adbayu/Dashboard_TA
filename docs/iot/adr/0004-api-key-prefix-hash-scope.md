# ADR-0004: API key ber-prefix, disimpan sebagai hash, dengan scope

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Modul tim lain dan mitra perlu mengakses API tanpa cookie sesi. Backend sudah menyimpan credential device dan token sesi sebagai hash SHA-256 dari secret 32 byte acak.

## Keputusan

- Format: `jf_live_<64 hex>` dan `jf_test_<64 hex>`. Prefix membuat key mudah dikenali di log dan bisa dideteksi secret scanner.
- Yang disimpan: hash SHA-256, 12 karakter pertama sebagai `prefix` untuk ditampilkan, scope, dan environment.
- Scope: `devices:read`, `devices:write`, `readings:read`, `admin`.
- Rate limit per key memakai `@fastify/rate-limit` dengan `keyGenerator` berbasis ID key. Store-nya memori.

## Konsekuensi

- Key yang bocor dari database tidak bisa dipakai, karena yang tersimpan hanya hash.
- Key yang hilang tidak bisa ditampilkan ulang. Pengguna harus mencabut lalu membuat key baru.
- SHA-256 tanpa salt aman di sini karena secret-nya acak 256 bit, bukan password buatan manusia.
- Hitungan rate limit hilang saat server restart. Ini bisa diterima untuk satu instance.

## Alternatif yang ditolak

- **JWT:** tidak bisa dicabut seketika tanpa daftar blokir, dan isinya terbaca kalau bocor.
- **OAuth2 client credentials:** terlalu berat untuk kebutuhan dan waktu yang ada.
