# ADR-0005: Dokumentasi API di-generate dari schema Fastify

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Route pilot sudah memakai JSON Schema Fastify untuk validasi (`object(...)`, `uuid`, `token`, dst.). Dokumentasi yang ditulis terpisah gampang ketinggalan dari kode.

## Keputusan

Pasang `@fastify/swagger` dari minggu 1, supaya setiap route baru langsung punya schema untuk request dan response. Spec OpenAPI 3.1 ditampilkan di `/docs` memakai Scalar, yang sekaligus jadi playground sandbox lewat fitur "try it". Panduan naratif (quickstart, kontrak ingest, wiring) tetap ditulis manual di `docs/iot/`.

## Konsekuensi

- Referensi API selalu sama dengan endpoint yang berjalan.
- Schema response wajib ditulis, jadi menambah sedikit kerja per route. Sebagai gantinya, Fastify juga memakai schema itu untuk serialisasi yang lebih cepat dan untuk mencegah field rahasia ikut terkirim.
- Panduan manual tetap bisa ketinggalan, jadi setiap PR yang mengubah kontrak wajib menyentuh `docs/iot/`.

## Alternatif yang ditolak

- **Menulis `openapi.yaml` manual:** dua sumber kebenaran.
- **Membangun playground sendiri di portal:** menghabiskan waktu yang tidak ada.
