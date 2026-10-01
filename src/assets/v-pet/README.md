# Aset Virtual Pet (2D)

Seluruh gambar karakter virtual pet ada di folder ini. Gambar-gambarnya
**terpisah per bagian**, jadi Anda bisa mengganti satu potongan tanpa menyentuh
yang lain dan tanpa mengubah kode.

## Cara kerja singkat

Kode menyusun karakter dari lapisan berurutan:

    latar  ->  karakter (badan)  ->  ekspresi (mata & mulut)  ->  aksesori  +  gelembung bicara

Nama berkas = nama yang dipakai di data. Kode mendaftarkan seluruh isi folder
secara otomatis (`import.meta.glob` di `src/components/PetKarakter.jsx`), jadi
begitu Anda menaruh berkas baru di folder yang benar, berkas itu langsung bisa
dipakai tanpa mengedit kode.

## Folder

| Folder | Isi | Dipakai oleh |
| --- | --- | --- |
| `karakter/` | Badan hewan tanpa mata/mulut | `species` pet (dari Kelola Virtual Pet) |
| `ekspresi/` | Mata + mulut saja, transparan | reaksi terhadap kondisi air |
| `aksesori/` | Hiasan kepala | naik otomatis mengikuti level pet |
| `gelembung/` | Kerangka gelembung bicara | jenis reaksi (biasa / mendesak / pikiran) |
| `latar/` | Latar kolam | kondisi air (jernih, keruh, dingin, panas) |
| `ikon-sensor/` | Ikon kecil | kartu kondisi air dan tanda status |

## Ukuran kanvas (jangan diubah sembarangan)

- `karakter/*.svg` : **240 x 160**
- `ekspresi/*.svg`, `aksesori/*.svg` : **60 x 60** (kotak wajah)
- `gelembung/*.svg` : **200 x 110** (teks ditulis React, bukan di dalam SVG)
- `latar/*.svg` : **480 x 260**, memakai `preserveAspectRatio="none"`
- `ikon-sensor/*.svg` : **24 x 24**

## Menambah atau mengganti

1. **Ganti ekspresi.** Taruh berkas baru, mis. `ekspresi/lelah.svg`, lalu pakai
   namanya di `src/data/reaksiPet.js`. Tidak ada langkah lain.
2. **Ganti karakter.** Taruh `karakter/koi.svg`, lalu tambahkan satu baris di
   peta `KARAKTER` dalam `src/components/PetKarakter.jsx`:
   `'ikan koi': 'koi'`. Setelah itu pilih "Ikan Koi" di Kelola Virtual Pet.
3. **Ganti warna badan.** Buka berkas di `karakter/`, ubah dua nilai
   `stop-color` pada gradien bernama `b`. Tidak perlu menggambar ulang bentuknya.
4. **Ganti bentuk wajah/aksesori.** Ganti isi berkas SVG-nya, pertahankan
   `viewBox` supaya skalanya tetap cocok.

## Titik tempel wajah (kalau menggambar karakter baru)

Ekspresi dan aksesori ditempel sebagai kotak 60x60 pada posisi yang dihitung
dari dua angka per karakter di `src/components/PetKarakter.jsx`:

    JANGKAR = { namaKarakter: { mata: [x, y], kepala: [x, y] } }

- `mata` = titik tengah baris mata pada kanvas badan, ditulis sebagai pecahan
  (contoh `133/240` dan `41/160`).
- `kepala` = bagian atas kepala, tempat aksesori diletakkan.

Setiap berkas di `karakter/` menuliskan nilai jangkarnya di komentar paling atas,
jadi saat menggambar karakter baru: ukur posisinya, tulis di komentar berkas,
lalu salin angkanya ke `JANGKAR`.

## Aturan reaksi (bukan gambar, tapi terkait)

Aturan "sensor mana memicu ekspresi mana" ada di `src/data/reaksiPet.js`.
Ambangnya TIDAK ditulis di sana: ambang diambil dari pengaturan area dan kategori
device (Kelola Area / Kelola Kategori). Jadi mengubah ambang di halaman
pengelola langsung mengubah reaksi pet, tanpa menyentuh gambar atau kode.

Ringkasnya, urutan prioritas reaksi:

1. parameter air yang paling jauh dari ambang, lalu
2. kalau air aman: kondisi pet sendiri (lapar / kotor / sakit), lalu
3. kalau semuanya aman: ekspresi senang.

Semua berkas di sini dibuat sebagai SVG biasa (bukan hasil ekspor alat desain),
sehingga bisa disunting dengan editor teks maupun Inkscape/Figma.

## Penting: SVG wajib punya penutup `</svg>`

Semua berkas di sini pernah terkirim TANPA penutup `</svg>`, sehingga XML-nya
rusak dan browser tidak menggambar apa pun. Gejalanya menipu: build tetap hijau,
elemen tetap ada, `background-image` tetap terisi, dan tidak ada galat di console,
tapi panggungnya kosong.

Sebelum menyerahkan hasil, jalankan:

    npm run cek:aset

Skrip itu memeriksa setiap berkas: XML sehat, ada `viewBox`, ukuran kanvas sesuai
folder, dan berkas wajib tersedia. Keluar dengan kode 1 kalau ada yang salah.

## Titik tempel wajah & aksesori (angka terukur)

Nilai di `JANGKAR` (berkas `src/components/PetKarakter.jsx`) tidak ditebak.
Cara mengukurnya:

1. Gambar badan dan wajah ke satu kanvas pada skala yang sama.
2. Geser kotak wajah dan hitung berapa persen piksel wajah yang jatuh di atas
   piksel badan. Cari posisi paling kanan (dekat kepala) yang capaiannya 100%.
3. Kalau bentuk badannya tipis sehingga tidak ada posisi yang mencapai 100%,
   kecilkan `wajahSkala` (mis. udang 0,85) lalu ukur ulang.

Hasil pengukuran terakhir (semuanya 100% di atas badan):

| Karakter | mata (kanvas 240x160) | kepala | wajahSkala |
| --- | --- | --- | --- |
| nila | 168, 70 | 0.62, 40 | 1 |
| lele | 168, 77 | 0.62, 52 | 1 |
| gurame | 161, 62 | 0.62, 31 | 1 |
| mas | 166, 70 | 0.62, 40 | 1 |
| udang | 150, 72 | 0.62, 44 | 0,85 |

`kepala` adalah titik tempat TINTA TERBAWAH aksesori diletakkan (bukan dasar
kotaknya), karena sebagian gambar berhenti sebelum dasar kotak: pita 72%, daun
77%, medali 85%, mahkota 71% tinggi kotak. Angka itu disimpan di
`AKSESORI_TINTA_BAWAH`; setelah mengganti gambar aksesori, ukur ulang nilai
tersebut atau hiasannya akan tampak melayang.

Cara cepat memeriksa setelah mengubah gambar: buka `/admin/v-pet`, lihat
pratinjau 13 ekspresi, dan pastikan mata/mulut setiap ekspresi berada di dalam
badan ikan (bukan di air).
