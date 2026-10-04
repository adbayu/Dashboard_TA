# ADR-0003: Update live memakai SSE

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Dashboard perlu menampilkan nilai baru tanpa reload. Data hanya mengalir satu arah (server ke browser), dengan frekuensi rendah (1 pesan per device per 30 detik).

## Keputusan

Pakai Server-Sent Events di `GET /api/v1/stream`. Hub koneksi disimpan di memori proses. Polling `/latest` tiap 30 detik jadi cadangan.

## Konsekuensi

- Browser menyambung ulang otomatis dan bisa mengirim `Last-Event-ID`.
- Cookie sesi ikut terkirim dengan `withCredentials`, jadi tidak perlu protokol autentikasi tambahan.
- `EventSource` di browser tidak bisa mengirim header `Authorization`, jadi klien API key perlu library SSE lain atau polling.
- Hanya cocok untuk satu instance API. Kalau lebih, butuh `LISTEN/NOTIFY` PostgreSQL atau Redis pub/sub.

## Alternatif yang ditolak

- **WebSocket:** dua arah, padahal tidak ada pesan dari browser ke server. Perlu penanganan reconnect dan autentikasi sendiri.
- **Polling saja:** paling sederhana, tapi status "Live" jadi tertunda sampai 30 detik dan request ke server lebih banyak.
