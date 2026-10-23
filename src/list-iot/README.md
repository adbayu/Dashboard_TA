# List IoT

Folder ini berisi source code untuk output **List IoT**. Route: `/iot dan /iot/:id`.

## File fitur

- [pages/ListIot.jsx](pages/ListIot.jsx)

## Kode yang digunakan bersama

File ListIot.jsx juga mengekspor DeviceDetail untuk detail perangkat. Panel informasi yang dipakai beberapa halaman ada di [shared/iot](../shared/iot/components/PanelInfoAlat.jsx).

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
