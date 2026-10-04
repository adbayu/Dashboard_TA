# Changelog API IoT

Semua perubahan pada `/api/v1` dan payload `POST /api/ingest` dicatat di sini, yang terbaru di atas.

## Belum dirilis

- Firmware membekukan `meta.rssi` di record buffer (36 menjadi 40 byte) supaya retry setelah balasan hilang mendapat `duplicate: true`, bukan 409. Sampel yang direkam saat Wi-Fi putus dikirim tanpa `rssi`. Tes A2 kini mencakup retry sampel online dan sampel buffer offline.
- Menambahkan migrasi PostgreSQL bernomor dan backfill tipe sensor, tipe perangkat, serta tiga device legacy. Batas fisik TDS 5000 ppm masih sementara, menunggu spesifikasi modul sebenarnya.
- Pratinjau QR publik dibatasi ke ringkasan device tanpa area, readings, akun, credential, atau kode aktivasi. Label QR dibuat melalui POST dengan kode aktivasi di body supaya secret tidak masuk URL.
- Gate Minggu 1 mencakup V1-28 dan V1-29 sesuai cakupan pemilik.
- Payload idempoten membandingkan versi, model/tipe, waktu ukur, readings, dan `meta`; perubahan metadata pada `messageId` yang sama mendapat 409 `CONFLICT`.
- Tabel `readings` menyimpan metadata ingest untuk membedakan retry v1 dan v2, termasuk nilai `meta`.
- Draft awal kontrak `/api/v1` dan ingest v2. Lihat [API Contract](03-api-contract.md).
- Tes integrasi memverifikasi bentuk payload ingest v2 dari keempat varian firmware, retry idempoten, dan `measuredAt` historis 30 menit dari sampel buffer.
