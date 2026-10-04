# ADR-0001: Ingest lewat HTTPS, MQTT ditunda

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Backend pilot sudah punya `POST /api/ingest` yang lengkap: autentikasi per device, idempotensi `messageId`, validasi rentang, dan tidak menimpa nilai terbaru dengan data lama. Simulator juga sudah memakai jalur ini. Waktu pengerjaan kurang dari sebulan, dan interval kirim 30 detik tidak butuh latensi rendah.

## Keputusan

Alat mengirim lewat HTTPS ke endpoint ingest yang sudah ada, dengan payload v2. MQTT tidak dikerjakan di rilis ini.

## Konsekuensi

- Tidak perlu broker MQTT di hosting, jadi infrastruktur lebih sederhana.
- Server tidak bisa mengirim perintah ke alat (misalnya ubah interval). Kalau nanti dibutuhkan, alat bisa membaca konfigurasi dari response ingest, atau MQTT ditambahkan sebagai ADR baru.
- Setiap kiriman membuka koneksi TLS baru. Untuk 1 pesan per 30 detik, ini masih wajar.

## Alternatif yang ditolak

- **MQTT dengan broker (Mosquitto/EMQX):** cocok untuk banyak alat dan perintah dua arah, tapi menambah satu layanan yang harus dirawat, plus jalur autentikasi dan idempotensi kedua.
