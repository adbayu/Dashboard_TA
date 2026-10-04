# ADR-0008: Migration SQL bernomor

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

`migrate()` di `server/db.ts` menjalankan seluruh `schema.sql` setiap kali, dengan pola `CREATE TABLE IF NOT EXISTS`. Pola ini tidak bisa menangani `ALTER TABLE` di database yang sudah berisi data.

## Keputusan

Pindahkan `schema.sql` menjadi `server/migrations/001_pilot.sql`. File berikutnya diberi nomor urut. `migrate()` membaca folder ini, melewati versi yang sudah ada di `schema_migrations`, lalu menjalankan sisanya satu per satu dalam transaksi dengan advisory lock yang sama.

## Konsekuensi

- Perubahan skema bisa dijalankan aman di database pilot yang sudah berisi data.
- File migration yang sudah di-merge tidak boleh diubah lagi. Koreksi dibuat sebagai file baru.

## Alternatif yang ditolak

- **Library migration (node-pg-migrate, Knex):** menambah dependency untuk kebutuhan yang cukup dipenuhi sekitar 20 baris kode.
