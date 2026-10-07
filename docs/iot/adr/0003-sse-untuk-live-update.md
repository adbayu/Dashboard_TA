# ADR-0003: Update live memakai SSE

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Dashboard perlu menampilkan nilai baru tanpa reload. Data hanya mengalir satu arah (server ke browser), dengan frekuensi rendah (1 pesan per device per 30 detik).

## Keputusan

Pakai Server-Sent Events di `GET /api/v1/stream`. Hub koneksi disimpan di memori proses. Polling `/latest` tiap 30 detik jadi cadangan.

## Konsekuensi

- Klien browser memakai `fetch` dan `ReadableStream`, lalu mengelola parser SSE, reconnect berurutan, backoff, dan pembatalan dengan `AbortController`. `credentials: 'same-origin'` mengirim cookie sesi same-origin.
- Reconnect memakai `Last-Event-ID`. Server hanya mereplay frame `device_event`; frame `reading` tidak memiliki ID dan tidak direplay. Setelah koneksi yang sudah terbentuk tersambung kembali dengan HTTP 200, subscriber me-refresh nilai latest tepat satu kali.
- Berbeda dari `EventSource`, fetch client dapat memeriksa status HTTP dan `Retry-After` serta menentukan header request. Sebagai tradeoff, reconnect dan pembatalan lifecycle harus dikelola klien.
- Hanya cocok untuk satu instance API. Kalau lebih, butuh `LISTEN/NOTIFY` PostgreSQL atau Redis pub/sub.

## Alternatif yang ditolak

- **WebSocket:** dua arah, padahal tidak ada pesan dari browser ke server. Perlu penanganan reconnect dan autentikasi sendiri.
- **Polling saja:** paling sederhana, tapi status "Live" jadi tertunda sampai 30 detik dan request ke server lebih banyak.
