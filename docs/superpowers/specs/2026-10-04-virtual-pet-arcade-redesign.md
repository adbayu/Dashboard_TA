# Desain Ulang Karakter V-Pet Arcade

## Masalah yang terlihat
Screenshot V-Pet memperlihatkan badan ikan terlalu besar hingga terpotong di bagian bawah panggung. Mata/pipi/aksesori terasa terpisah dari badan. Siluet menggunakan bentuk oval sederhana dengan beberapa garis, sehingga tampak belum seperti karakter game yang selesai. Gerakan kecil pada ekor/sirip tidak cukup terbaca sebagai berenang.

## Tujuan
Membuat ulang kelima karakter V-Pet (nila, mas, lele, gurame, udang) sebagai karakter 2D kartun arcade bawah air yang ekspresif dan orisinal. Referensi Feeding Frenzy dipakai untuk kualitas siluet, warna cerah, ekspresi, dan rasa gerak arcade, bukan untuk menyalin karakter/aset game tersebut.

## Struktur aset
Simpan seluruh aset baru di `src/assets/v-pet/karakter-arcade/`, terpisah dari `src/assets/v-pet/karakter/` dan aset lama. Tiap hewan mendapat subfolder sendiri. Aset SVG badan, ekor, sirip/kaki, detail anatomi, serta mata/ekspresi yang diperlukan disimpan terpisah agar bisa dibuka dan disunting langsung di Antigravity. Gunakan koordinat kanvas bersama per karakter agar lapisan saling pas. Folder baru menjadi sumber karakter aktif; aset lama tidak dihapus selama desain baru belum terverifikasi.

## Komposisi dan gerak
Karakter harus muat seluruhnya di dalam panggung pada ukuran desktop maupun viewport sempit. Jangan mengunci karakter besar ke pojok bawah; jadikan panggung sebagai kolam dengan ruang berenang horizontal. Karakter berenang dari satu sisi ke sisi lain lalu berbalik, dengan kibasan ekor/sirip yang jelas, apung badan ringan, dan kedipan berkala. Gerakan status (senang/resah/lemah) tetap memengaruhi gerak kecil tanpa menggantikan lintasan berenang. Gunakan pembungkus animasi terpisah untuk lintasan dan pose supaya transform CSS tidak saling menimpa. Hormati `prefers-reduced-motion` dengan menghentikan lintasan, kibasan, dan kedipan; user yang memilih reduced motion tetap dapat melihat karakter diam utuh.

## Integrasi dan batasan
Pertahankan data spesies, kondisi sensor, perawatan, tingkat/level, ekspresi dinamis, dan aksesori yang sudah ada. Sesuaikan jangkar ekspresi/aksesori terhadap gambar baru; jangan tempel mata lama di luar tubuh. Tidak mengubah halaman lain, alur dashboard, atau skema data. Tanpa dependensi baru. Aset lama tetap ada untuk rollback sampai semua lima karakter lolos pemeriksaan.

## Penerimaan
- Seluruh lima spesies memakai aset baru dari folder `karakter-arcade/`.
- Tiap spesies memiliki komponen gambar terpisah di foldernya; nama/struktur terdokumentasi dan mudah diedit di Antigravity.
- Pada panggung V-Pet, seluruh tubuh dan fitur wajah terlihat, tidak terpotong atau melayang.
- Gerak horizontal melintasi kolam dan berbalik tampak nyata bersama kibasan ekor/sirip dan kedipan pada mode normal.
- `prefers-reduced-motion` mematikan semua animasi tanpa menyembunyikan karakter.
- Pemeriksaan browser mencakup kelima spesies, tidak ada gambar gagal atau galat runtime, serta ukuran desktop dan mobile.
- Validasi aset, build, dan lint terkait lolos. Tidak melakukan push tanpa instruksi.
