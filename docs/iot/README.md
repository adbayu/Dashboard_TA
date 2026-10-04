# Dokumentasi IoT System JagoFarm

Folder ini berisi dokumen yang perlu dibaca sebelum dan selama pengembangan IoT System di branch `feat/iot-system`. Semua dokumen masih Draft v0.1 dan menunggu review tim.

## Urutan baca

| No | Dokumen | Isi | Untuk siapa |
| --- | --- | --- | --- |
| 1 | [PRD](01-prd.md) | Masalah, tujuan, fitur, user story, kriteria terima | Semua |
| 2 | [Technical Design](02-technical-design.md) | Arsitektur, autentikasi, model data, ingest, monitoring, sandbox | Developer |
| 3 | [API Contract](03-api-contract.md) | Endpoint `/api/v1`, scope, error, rate limit, kontrak ingest | Developer, modul tim, mitra |
| 4 | [Firmware & Hardware](04-firmware-hardware.md) | Wiring ESP32, varian alat, kalibrasi, buffer offline | Developer firmware |
| 5 | [UI/UX Design](05-ux-design.md) | Arsitektur informasi, alur, spesifikasi layar, teks status | Developer frontend, desainer |
| 6 | [Design System](06-design-system.md) | Token Lumina Aqua dan komponen baru untuk IoT | Developer frontend |
| 7 | [Test Plan & Acceptance](07-test-plan.md) | Uji kontrak, uji UI, uji alat, uji lapangan 48 jam, gate mingguan | Semua |
| 8 | [ADR](adr/README.md) | Catatan keputusan teknis | Developer |
| 9 | [Changelog API](changelog.md) | Riwayat perubahan kontrak API | Modul tim, mitra |
| 10 | [Desain halaman](design/README.md) | Screenshot prototype tiap halaman dan state-nya | Developer frontend |

Versi bersama (Claude Docs) untuk dibagikan ke tim:

- [Spesifikasi & Rencana Pengembangan IoT System JagoFarm](https://claude.ai/code/artifact/d6cd1b57-aac8-418a-9cf2-31e6401cd5d5)
- [PRD IoT System JagoFarm](https://claude.ai/code/artifact/64a83b2c-2412-4728-aec1-72b2fd495bac)
- [UI/UX Design IoT System JagoFarm](https://claude.ai/code/artifact/7b8c1ab6-f7fc-460f-a7a7-0ee88279fd67)

Kalau isinya berbeda, file di folder ini yang jadi acuan.

## Aturan perubahan

- PR yang mengubah kontrak API, skema database, atau payload ingest wajib ikut memperbarui dokumen di folder ini dan `changelog.md`.
- Keputusan teknis yang sulit dibalik dicatat sebagai ADR baru.
- Teks di dokumen dan UI tidak memakai em dash, sesuai `DESIGN.md`.

## Hal yang masih menunggu jawaban

Daftar lengkapnya ada di [PRD bagian 11](01-prd.md#11-pertanyaan-terbuka). Yang paling mendesak sebelum minggu 1: model alat yang sudah dirakit (Q6) dan tempat hosting (Q7).
