# Kelola Area

Folder ini berisi source code untuk output **Kelola Area**. Route: `/area, /area/:id dan /admin/area`.

## File fitur

- [data/seed.js](data/seed.js)
- [model/fishPopulation.js](model/fishPopulation.js)
- [pages/AdminAreas.jsx](pages/AdminAreas.jsx)
- [pages/AreaDetail.jsx](pages/AreaDetail.jsx)
- [pages/KelolaArea.jsx](pages/KelolaArea.jsx)

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). AreaDetail menyediakan catatan pembersihan fisik untuk quest bulanan; event tersimpan bersama aktivitas kolam dan menyelesaikan quest bila belum diklaim dari checklist. Klaim checkbox tidak membuat event aktivitas. Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
