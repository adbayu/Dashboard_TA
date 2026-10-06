# ADR-0013: Status ambang dan koneksi dipulihkan dari database

Status: Usulan · Tanggal: 5 Oktober 2026

## Konteks

Proses ingest dan job offline dapat berjalan bersamaan untuk device yang sama. Jika status terakhir hanya disimpan dalam memori, restart atau instance lain akan kehilangan state dan dapat menulis event transisi berulang. Retensi telemetry juga tidak boleh menghapus satu-satunya bukti state terakhir yang dipakai untuk menentukan transisi berikutnya.

## Keputusan

Gunakan event terbaru di `device_events` sebagai sumber state ambang per `(device, sensor)` dan state koneksi per device. Ingest, deteksi offline, dan cleanup retensi mengunci baris `devices` di transaksi yang sama; publish hanya setelah commit. Retensi mempertahankan event state terakhir sebagai anchor walau lebih tua dari masa retensi.

## Konsekuensi

- State tetap tersedia setelah restart dan dapat dipakai semua operasi yang berbagi PostgreSQL.
- Row lock menserialisasi perubahan untuk satu device; ingest berbeda device tetap berjalan paralel.
- Satu event ambang terakhir per sensor dan satu event koneksi terakhir per device dapat bertahan melewati masa retensi.

## Alternatif yang ditolak

- **State in-memory:** hilang saat restart dan tidak konsisten lintas instance.
- **Lock terpisah tanpa row lock device:** ingest dan job offline tetap dapat membuat transisi ganda karena keduanya mengubah state device yang sama.
