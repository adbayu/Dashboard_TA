# ADR-0002: IoT satuan dan paket memakai satu model

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Perangkat ditawarkan dalam dua opsi: satuan (1 sensor per ESP32) dan paket (beberapa sensor dalam satu ESP32). Data lama di `seed.js` berbentuk satuan (`IOT-001` pH, `IOT-002` suhu, `IOT-003` TDS), sedangkan model pilot (`water-v1`) berbentuk paket.

## Keputusan

Kedua opsi memakai tabel yang sama: `device_types` dengan kolom `kind` (`satuan` atau `paket`) dan `device_type_sensors`. IoT satuan dianggap tipe yang isinya tepat 1 sensor. Ingest, monitoring, dan API tidak membedakan keduanya, kecuali untuk validasi jumlah sensor dan tampilan.

## Konsekuensi

- Satu jalur kode untuk ingest dan monitoring.
- Tampilan "per sensor" bisa langsung menggabungkan sensor dari device satuan maupun paket.
- Aturan jumlah sensor (satuan = 1, paket ≥ 2) harus dijaga di aplikasi, karena tidak bisa ditulis sebagai `CHECK` di PostgreSQL.

## Alternatif yang ditolak

- **Tabel terpisah untuk satuan dan paket:** setiap query monitoring harus `UNION`, dan API punya dua bentuk device.
- **Paket sebagai kumpulan device satuan:** satu ESP32 akan punya beberapa credential dan beberapa `deviceId`, padahal secara fisik hanya satu alat yang mengirim.
