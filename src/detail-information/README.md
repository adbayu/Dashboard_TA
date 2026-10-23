# Detail Information

Folder ini berisi source code untuk output **Detail Information**. Route: `/detail-informasi dan /admin/detail-informasi`.

## File fitur

- [components/QrScanner.jsx](components/QrScanner.jsx)
- [pages/AdminDetailInformation.jsx](pages/AdminDetailInformation.jsx)
- [pages/DetailInformation.jsx](pages/DetailInformation.jsx)
- [services/iotInfo.js](services/iotInfo.js)

## Kode yang digunakan bersama

Panel penjelasan alat yang juga dipakai List IoT dan Kelola IoT ada di [shared/iot](../shared/iot/components/PanelInfoAlat.jsx). Komponen gambar dan aksi QR ada di [shared/qr](../shared/qr/components/QrCode.jsx).

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
