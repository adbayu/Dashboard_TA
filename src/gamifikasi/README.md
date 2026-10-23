# Gamifikasi

Folder ini berisi source code untuk output **Gamifikasi**. Route: `/gamifikasi`.

## File fitur

- [data/seed.js](data/seed.js)
- [model/pondActivityRewards.js](model/pondActivityRewards.js)
- [pages/Gamifikasi.jsx](pages/Gamifikasi.jsx)

Model aktivitas mencocokkan catatan kolam manual dengan aturan poin ber-ID tetap dan batas harian. Status misi diturunkan dari event yang tersimpan, bukan centang manual; EXP quest V-Pet terpisah dari poin akun.

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
