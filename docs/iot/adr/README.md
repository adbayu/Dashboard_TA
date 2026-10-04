# Architecture Decision Records

Setiap keputusan teknis yang sulit dibalik dicatat di sini dengan format: konteks, keputusan, konsekuensi, dan alternatif yang ditolak. Status bisa berupa Usulan, Diterima, atau Digantikan oleh ADR lain.

| No | Keputusan | Status |
| --- | --- | --- |
| [0001](0001-http-ingest-bukan-mqtt.md) | Ingest lewat HTTPS, MQTT ditunda | Usulan |
| [0002](0002-satuan-dan-paket-satu-model.md) | IoT satuan dan paket memakai satu model `device_types` | Usulan |
| [0003](0003-sse-untuk-live-update.md) | Update live memakai SSE | Usulan |
| [0004](0004-api-key-prefix-hash-scope.md) | API key ber-prefix, disimpan sebagai hash, dengan scope | Usulan |
| [0005](0005-openapi-dari-schema-fastify.md) | Dokumentasi API di-generate dari schema Fastify + Scalar | Usulan |
| [0006](0006-ambang-per-area.md) | Override ambang per area, bukan per device | Usulan |
| [0007](0007-migrasi-smartstore-bertahap.md) | Data IoT dipindah dari `SmartStore` lewat adapter, bertahap | Usulan |
| [0008](0008-migration-sql-bernomor.md) | Migration SQL bernomor menggantikan satu `schema.sql` | Usulan |
| [0009](0009-qr-dicetak-saat-pemasangan.md) | Label QR dicetak saat alat siap dipasang, kode aktivasi tetap 24 jam | Diterima |
| [0010](0010-pratinjau-qr-publik-terbatas.md) | Pratinjau QR publik hanya menampilkan ringkasan device yang aman | Usulan |
| [0011](0011-qr-dibuat-dengan-kode-aktivasi-di-body.md) | Pembuatan gambar QR menerima kode aktivasi melalui body POST | Usulan |
| [0012](0012-idempotensi-ingest-mencakup-metadata.md) | Idempotensi ingest membandingkan metadata bersama payload | Usulan |

Semua masih berstatus Usulan sampai direview tim. Untuk menambah ADR baru, salin salah satu file, beri nomor berikutnya, lalu tambahkan barisnya di tabel ini.
