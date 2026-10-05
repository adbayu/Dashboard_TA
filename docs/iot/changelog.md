# Changelog API IoT

Semua perubahan pada `/api/v1` dan payload `POST /api/ingest` dicatat di sini, yang terbaru di atas.

## Belum dirilis

- Minggu 2 frontend: pemindai QR di aplikasi kini membaca QR di mode development. Loop deteksi sebelumnya berhenti permanen setelah effect dijalankan ulang oleh React StrictMode.
- Minggu 2 frontend: halaman `/d/:code` menghapus parameter `c` dari address bar setelah dibaca, dan halaman dikirim dengan `Referrer-Policy: no-referrer`. Isi QR tetap `/d/<code>?c=<kode aktivasi>` sesuai API Contract 6.3. Dev server Vite menerima host tunnel HTTPS lewat `DEV_ALLOWED_HOSTS` khusus development; validasi `APP_ORIGIN` di backend tidak berubah.
- Minggu 2: usulan limit gagal autentikasi API key 20 per IP per 60 detik untuk key berformat valid yang salah atau dicabut. Setelah penuh, key berformat valid dari IP tersebut mendapat `429 RATE_LIMITED` sebelum lookup sampai jendela reset; key valid tidak menambah penghitung tetapi ikut tertahan, termasuk pengguna lain di jaringan NAT atau kampus. Key malformed/non-API, sesi cookie, scope 403, dan error 5xx tidak menambah penghitung. Limit API lama tidak berubah.
- Minggu 2: pembuatan API key mensyaratkan minimal satu scope; request dengan `scopes: []` ditolak sebagai `400 VALIDATION_FAILED`.
- Minggu 2 frontend: Kelola IoT menggunakan route yang tersedia. Aksi Nonaktifkan pada screenshot 04 disembunyikan karena API belum menyediakan field atau route; tidak ada perubahan kontrak API. Area hanya memakai `areaRef` aktual atau isian manual. Developer memakai data key dan usage aktual, tanpa panel Sandbox atau statistik contoh.
- Minggu 2 UX: halaman Developer memiliki tautan "Referensi API" ke `/docs/openapi.json` di tab baru. Vite mem-proxy `/docs` ke backend. Tautan menampilkan OpenAPI JSON, sedangkan Scalar tetap direncanakan untuk Minggu 4.
- Minggu 2 UX: List IoT dan Detail device menampilkan identitas, status, dan sensor dari API; nilai, grafik, dan kejadian menampilkan "Belum ada data". Komponen latest/readings/riwayat/events menunggu Minggu 3; nilai screenshot bukan data aktual. Tidak ada perubahan kontrak API atau gate.
- Minggu 2: pengelolaan API key lewat sesi cookie, secret hanya dikembalikan saat pembuatan, prefix dan hash SHA-256 yang disimpan, pencabutan langsung, kebijakan role, serta ringkasan usage tujuh hari.
- Minggu 2: migration 003 menambahkan indeks prefix API key untuk lookup autentikasi; indeks usage yang sudah ada tetap digunakan.
- Minggu 2: scope route ditegakkan untuk sesi dan API key. Scope `readings:read` juga didaftarkan untuk route Minggu 3 tanpa menambahkan endpoint readings.
- Minggu 2: key `test` dibatasi ke device sandbox dan key `live` ke device non-sandbox, dengan isolasi ownership dan response 404 untuk resource yang tidak dapat diakses.
- Minggu 2: rate limit API key 60 request/menit untuk `live` dan 30 request/menit untuk `test`. Usage dan `last_used_at` dicatat secara non-blocking dengan route template Fastify. Query retensi 30 hari didokumentasikan, belum dijadwalkan.
- Firmware membekukan `meta.rssi` di record buffer (36 menjadi 40 byte) supaya retry setelah balasan hilang mendapat `duplicate: true`, bukan 409. Sampel yang direkam saat Wi-Fi putus dikirim tanpa `rssi`. Tes A2 kini mencakup retry sampel online dan sampel buffer offline.
- Menambahkan migrasi PostgreSQL bernomor dan backfill tipe sensor, tipe perangkat, serta tiga device legacy. Batas fisik TDS 5000 ppm masih sementara, menunggu spesifikasi modul sebenarnya.
- Pratinjau QR publik dibatasi ke ringkasan device tanpa area, readings, akun, credential, atau kode aktivasi. Kode aktivasi boleh ada hanya di URL isi QR dan request pratinjau sesuai kontrak 6.3. Halaman klaim menghapusnya dari entri riwayat aktif, memakai kebijakan referrer tanpa pengiriman, dan meminta input manual sesudah refresh.
- Gate Minggu 1 mencakup V1-28 dan V1-29 sesuai cakupan pemilik.
- Payload idempoten membandingkan versi, model/tipe, waktu ukur, readings, dan `meta`; perubahan metadata pada `messageId` yang sama mendapat 409 `CONFLICT`.
- Tabel `readings` menyimpan metadata ingest untuk membedakan retry v1 dan v2, termasuk nilai `meta`.
- Draft awal kontrak `/api/v1` dan ingest v2. Lihat [API Contract](03-api-contract.md).
- Tes integrasi memverifikasi bentuk payload ingest v2 dari keempat varian firmware, retry idempoten, dan `measuredAt` historis 30 menit dari sampel buffer.
