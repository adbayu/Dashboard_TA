# V-Pet

Folder ini berisi source code untuk output **V-Pet**. Route: `/v-pet`.

## File fitur

- [components/PetKarakter.jsx](components/PetKarakter.jsx)
- [data/seed.js](data/seed.js)
- [model/petCharacterLevels.js](model/petCharacterLevels.js)
- [model/petModel.js](model/petModel.js)
- [model/petProgress.js](model/petProgress.js)
- [model/petQuests.js](model/petQuests.js)
- [model/reaksiPet.js](model/reaksiPet.js)
- [pages/VPet.jsx](pages/VPet.jsx)
- [styles/pet.css](styles/pet.css)

## Kode yang digunakan bersama

Quest harian otomatis kembali tersedia pada tengah malam lokal walau halaman V-Pet tetap terbuka; riwayat completion tersimpan, sedangkan EXP/level terus terakumulasi. Quest harian dan bulanan V-Pet didefinisikan di [model/petQuests.js](model/petQuests.js). Checkbox yang belum selesai dapat diklik untuk klaim +10 EXP per pet di kolam, sekali per quest/periode; klaim tidak menambah poin akun atau mencatat aktivitas palsu. Aktivitas kolam yang benar-benar dicatat tetap dapat menyelesaikan quest otomatis tanpa reward ganda. Kenaikan EXP dan kurva level ada di [model/petProgress.js](model/petProgress.js); perubahan kondisi perawatan tidak memberi EXP langsung. Catatan pembersihan fisik disimpan terpisah di Kelola Area. Karakter V-Pet yang didukung hanya Ikan Nila dan Ikan Gurame. GIF kondisi Nila tersedia di [assets/karakter-level/](assets/karakter-level/README.md); Gurame memakai placeholder sampai pengguna menyediakan gambar. Halaman pengelola dipisahkan ke [Kelola Virtual Pet](../kelola-virtual-pet/pages/AdminVPet.jsx).

State dan aksi lintas fitur ada di [SmartStore.jsx](../shared/store/SmartStore.jsx). Router ada di [SmartApp.jsx](../app/SmartApp.jsx).

Kembali ke [daftar source per fitur](../README.md).
