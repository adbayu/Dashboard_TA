# ADR-0006: Override ambang per area

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

`SmartStore.jsx` sudah punya satu sumber ambang dengan urutan: ambang khusus area (`area.targets`), lalu ambang kategori device. Kolam Nila A di seed punya target sendiri (pH 6,5 sampai 7,5) yang berbeda dari ambang kategori (6,2 sampai 7,6).

## Keputusan

Backend memakai urutan yang sama: `area_thresholds` lebih dulu, lalu `sensor_types.warn_low`/`warn_high`. Tidak ada override per device.

## Konsekuensi

- Perilaku UI tidak berubah saat sumber data pindah ke API.
- Dua device di area yang sama selalu memakai ambang yang sama, sesuai kenyataan bahwa keduanya mengukur air yang sama.
- Area direferensikan lewat `area_ref` (teks), karena kepemilikan data area belum diputuskan (PRD Q4).

## Alternatif yang ditolak

- **Override per device:** bertentangan dengan logika yang sudah ada, dan membuat dua sensor di satu kolam bisa punya ambang berbeda.
