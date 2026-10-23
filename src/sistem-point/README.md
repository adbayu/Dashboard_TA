# Sistem Point

Folder ini berisi source code untuk output **Sistem Point**. Route: `/admin/point`.

## File fitur

- [pages/AdminPoints.jsx](pages/AdminPoints.jsx)

## Kode yang digunakan bersama

Aturan poin, badge, dan misi dibaca bersama Gamifikasi. Data awal bersama tersebut ada di [data gamifikasi](../gamifikasi/data/seed.js); perubahan saldo dan aksi ada di SmartStore.jsx.

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
