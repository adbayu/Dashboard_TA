# Desain: Virtual Pet 2D bergaya arcade

## Tujuan
Memperbarui tampilan lima karakter V-Pet (nila, mas, lele, gurame, udang) menjadi ilustrasi 2D kartun arcade bawah air yang ekspresif, dengan bagian gambar tersimpan terpisah dan gerakan berenang yang terasa hidup.

## Kondisi proyek
`src/components/PetKarakter.jsx` telah menyusun badan, ekspresi, aksesori, gelembung, dan latar secara terpisah melalui `import.meta.glob`. Aset saat ini berada di `src/assets/v-pet/karakter/`, `ekspresi/`, `aksesori/`, dan kategori lain. `src/pet.css` sudah menganimasikan gerak tubuh dasar berdasarkan sikap, serta menghormati `prefers-reduced-motion`. Perubahan harus memperluas pola tersebut, bukan mengganti mekanisme yang sudah berfungsi.

## Pendekatan
Pertahankan React dan SVG tanpa dependensi gambar baru. Buat direktori aset tersendiri untuk setiap spesies di bawah `src/assets/v-pet/karakter/` dengan SVG berlapis untuk bagian tubuh (misalnya badan, ekor, sirip/kaki, mata, dan detail wajah sesuai anatomi). Ubah `PetKarakter` agar menyusun lapisan spesies terpilih dan tetap memakai ekspresi/aksesori/gelembung yang ada bila sesuai. Tambahkan gerak berenang organik: kibasan ekor/sirip berulang, gerak apung halus, serta respons pendek pada sikap gembira/resah/lemah. Gerakan harus tetap terkendali di dalam panggung.

Gaya visual mengacu secara umum pada ikan kartun arcade bawah air: siluet jelas, warna cerah, outline tegas, mata ekspresif, dan bayangan/aksen sederhana. Jangan menyalin aset atau karakter Feeding Frenzy. Pertahankan pilihan spesies, status, ekspresi, aksesori, antarmuka data, dan ukuran kanvas yang ada.

## Batasan dan aksesibilitas
- Kerjakan hanya V-Pet dan aset terkait di `Dashboard_TA`.
- Tidak mengubah alur data, ambang sensor, menu, atau halaman lain.
- Gunakan animasi CSS/SVG tanpa dependensi baru.
- `prefers-reduced-motion: reduce` menonaktifkan semua gerak non-esensial.
- Nama berkas stabil dan peta species tetap mendukung nama yang tersimpan saat ini.
- Setiap bagian SVG disimpan di folder spesies masing-masing agar dapat disunting mandiri di Antigravity.

## Verifikasi penerimaan
1. Kelima spesies tetap terpilih dan dirender melalui halaman V-Pet.
2. Setiap karakter memiliki aset bagian yang terpisah dan tampak sebagai satu ilustrasi kartun utuh.
3. Gerak berenang dan reaksi sikap terlihat tanpa meluber dari panggung.
4. Reduced-motion menghentikan animasi.
5. `npm run cek:aset`, build Vite, dan lint terkait lolos; pemeriksaan browser memastikan tidak ada error runtime dan ekspresi/aksesori tetap menempel pada karakter.
