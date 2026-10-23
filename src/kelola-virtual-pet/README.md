# Kelola Virtual Pet

Folder ini berisi source code untuk output **Kelola Virtual Pet**. Route: `/admin/v-pet`.

## File fitur

- [pages/AdminVPet.jsx](pages/AdminVPet.jsx)

## Kode yang digunakan bersama

Halaman pengelola memakai [komponen karakter](../v-pet/components/PetKarakter.jsx), [aturan kondisi](../v-pet/model/reaksiPet.js), dan [aset GIF](../v-pet/assets/README.md) dari V-Pet agar perilaku kedua halaman konsisten.

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
