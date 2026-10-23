# Kelola IoT

Folder ini berisi source code untuk output **Kelola IoT**. Route: `/admin/iot`.

## File fitur

- [data/devices.js](data/devices.js)
- [pages/AdminIot.jsx](pages/AdminIot.jsx)

## Kode yang digunakan bersama

Data awal perangkat ada di data/devices.js. Panel bersama ada di [shared/iot](../shared/iot/components/PanelInfoAlat.jsx), sedangkan model perangkat dan simulator backend ada di server/features/kelola-iot/.

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
