# ADR-0007: Data IoT dipindah dari SmartStore secara bertahap

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

`SmartStore.jsx` (1072 baris) menyimpan semua data SmartDashboard di `localStorage`, termasuk data yang dipakai `VPet.jsx`, `Gamifikasi.jsx`, dan `Chatbot.jsx`. Modul-modul itu tidak termasuk cakupan IoT System.

## Keputusan

Yang dipindah ke API hanya data IoT: device, tipe, sensor, readings, ambang, dan kejadian. Adapter di `src/services/iotApi.js` memetakan response API ke bentuk data yang sekarang dipakai halaman. `SmartStore` tetap menyediakan data non-IoT. Selama transisi, `VITE_IOT_SOURCE=local` bisa dipakai untuk demo tanpa backend, dengan label "Data contoh" yang wajib tampil.

## Konsekuensi

- Modul tim lain tidak rusak saat halaman IoT pindah sumber data.
- Untuk sementara ada dua sumber data di frontend. Batasnya harus jelas di kode: data IoT tidak boleh lagi ditulis ke `localStorage`.
- Modul yang butuh data IoT (misalnya V-Pet yang bereaksi ke sensor) perlu membaca lewat adapter, bukan langsung dari `SmartStore`.

## Alternatif yang ditolak

- **Mengganti `SmartStore` sekaligus:** cakupannya jauh melebihi IoT System dan berisiko merusak modul orang lain.
