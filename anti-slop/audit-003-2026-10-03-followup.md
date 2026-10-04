# Follow-up audit 003: perbaikan prototype desain IoT

Tanggal: 3 Oktober 2026
Yang diminta: perbaiki semua temuan (nomor 1 sampai 8).

## Perbaikan

| No | Aturan | Status | Perubahan |
| --- | --- | --- | --- |
| 1 | R-32 | Diperbaiki | Modal di Kelola IoT dan Developer sekarang memindahkan fokus ke elemen pertama saat dibuka, mengunci Tab dan Shift+Tab di dalam dialog, menutup dengan Escape, dan mengembalikan fokus ke tombol pemicu. Label select Sensor di modal Tambah tipe dipisah dengan `for`/`id`, karena sebelumnya nama aksesibelnya tercampur teks semua opsi |
| 2 | R-34 | Diperbaiki | `KlaimQR`, `SecretKey`, dan `TambahTipe` memakai token tema terang dan gelap. Halaman QR punya tombol ganti tema. Screenshot baru: `05c`, `06d`, `07i` |
| 3 | R-03 | Diperbaiki | Di lebar 720 px ke bawah, sidebar disembunyikan dan diganti tombol Menu (44 px) yang membuka sidebar. Badge state di kartu paket sekarang bisa turun baris, jadi tidak mepet ke tepi. Tidak ada scroll horizontal di 390 px (uji nomor 11) |
| 4 | R-26 | Diperbaiki | Pilihan key di panel pemakaian sekarang mengganti isi panel. "Uji mitra" menampilkan state kosong "Key ini belum pernah dipakai." |
| 5 | R-35 | Diperbaiki | Click-through otomatis dengan Playwright untuk 52 elemen di semua artboard. Hasilnya ada di bawah |
| 6 | R-29 | Diperbaiki | Grafik perbandingan dibatasi 3 device dengan warna dari `tailwind.config.js`: `primary`, `tertiary` (#134b74), `secondary` (#00696c). Di mode gelap memakai varian `-fixed-dim`. Warna #7c5800 dihapus |
| 7 | R-20 | Diperbaiki | Sidebar menerima prop `dark`. Menu aktif di mode gelap memakai `rgba(149,212,179,0.15)` dan teks `#b1f0ce`, sama dengan kode aplikasi |
| 8 | R-24 | Diperbaiki | Menu yang belum ada artboard-nya diredupkan, diberi `aria-disabled` dan tooltip, dan ada keterangan di kaki sidebar |

## Click-through (R-35)

Dijalankan dengan Chromium (Playwright) pada runtime canvas yang sama, viewport 1280 px, 640 px, 560 px, dan 390 px. Tidak ada `pageerror` di console selama uji.

| No | Halaman | Elemen dan aksi | Hasil |
| --- | --- | --- | --- |
| 1 | List IoT | Filter Tipe = Paket menyisakan 1 kartu | PASS |
| 2 | List IoT | Filter Area Kolam Nila A + Paket memunculkan "Tidak ada device cocok" | PASS |
| 3 | List IoT | Cari "tds" menyisakan 1 kartu | PASS |
| 4 | List IoT | Filter Status = Data tertunda | PASS |
| 5 | List IoT | Toggle tema ke gelap dan kembali | PASS |
| 6 | List IoT | Kartu device menuju DetailDevice.dc.html | PASS |
| 7 | List IoT | Tombol Scan QR alat menuju KlaimQR.dc.html | PASS |
| 8 | List IoT (error) | Coba lagi menampilkan daftar device | PASS |
| 9 | List IoT (HP 390 px) | Sidebar tersembunyi dan tombol Menu tampil | PASS |
| 10 | List IoT (HP 390 px) | Tombol Menu membuka sidebar | PASS |
| 11 | List IoT (HP 390 px) | Tidak ada scroll horizontal | PASS |
| 12 | Detail device | Tab sensor TDS mengganti grafik | PASS |
| 13 | Detail device | Rentang 7 hari mengganti grafik | PASS |
| 14 | Detail device | Lepas alat lalu Batal | PASS |
| 15 | Detail device | Lepas alat lalu konfirmasi | PASS |
| 16 | Detail device | Link Semua device dan Lihat semua | PASS |
| 17 | Monitoring | Tab Per paket menampilkan 2 kartu paket | PASS |
| 18 | Monitoring | Tab Per sensor menampilkan tabel pH 3 baris | PASS |
| 19 | Monitoring | Pilih sensor TDS | PASS |
| 20 | Monitoring | Tab Per area menampilkan 3 area | PASS |
| 21 | Monitoring | Filter log Koneksi dan Ambang | PASS |
| 22 | Kelola IoT | Cari "tandon" menyisakan 1 baris | PASS |
| 23 | Kelola IoT | Tambah device: fokus pindah ke dalam dialog | PASS |
| 24 | Kelola IoT | Shift+Tab di elemen pertama tetap di dalam dialog | PASS |
| 25 | Kelola IoT | Escape menutup dialog dan fokus kembali ke Tambah device | PASS |
| 26 | Kelola IoT | Buat device menampilkan credential sekali tampil | PASS |
| 27 | Kelola IoT | Salin memunculkan "Tersalin." | PASS |
| 28 | Kelola IoT | Lihat label QR lalu tutup | PASS |
| 29 | Kelola IoT | Tombol QR di baris membuka label kode baris itu | PASS |
| 30 | Kelola IoT | Ubah/kalibrasi/nonaktifkan memunculkan pesan prototype | PASS |
| 31 | Kelola IoT | Tab Tipe IoT 4 baris, Jenis Sensor 3 baris | PASS |
| 32 | Kelola IoT | Tab Tipe IoT: Tambah tipe menuju TambahTipe.dc.html | PASS |
| 33 | Tambah tipe | Hilangkan 2 sensor: peringatan muncul dan Simpan nonaktif | PASS |
| 34 | Tambah tipe | Pilih Satuan memunculkan pilihan satu sensor | PASS |
| 35 | Tambah tipe | Simpan tipe menampilkan konfirmasi | PASS |
| 36 | Tambah tipe | Batal dan Tutup kembali ke KelolaIoT.dc.html | PASS |
| 37 | Developer | Cabut key lalu konfirmasi | PASS |
| 38 | Developer | Buat key: fokus masuk dialog, Escape menutup, fokus kembali | PASS |
| 39 | Developer | Buat key di dialog menuju SecretKey.dc.html | PASS |
| 40 | Developer | Ganti key di panel pemakaian | PASS |
| 41 | Developer | Skenario pH turun dan Offline | PASS |
| 42 | Developer | Salin contoh curl | PASS |
| 43 | Developer | Referensi API memunculkan pesan prototype | PASS |
| 44 | Secret key | Tutup terkunci sebelum disalin | PASS |
| 45 | Secret key | Salin membuka Tutup menuju Developer.dc.html | PASS |
| 46 | Secret key | Centang "Sudah saya simpan" juga membuka Tutup | PASS |
| 47 | Halaman QR | Klaim alat ini menampilkan berhasil | PASS |
| 48 | Halaman QR | Toggle mode gelap | PASS |
| 49 | Halaman QR (belum_login) | Masuk kembali ke tombol Klaim | PASS |
| 50 | Halaman QR (tidak_dikenal) | Cari alat kembali ke tombol Klaim | PASS |
| 51 | Halaman QR (backend_mati) | Coba lagi kembali ke tombol Klaim | PASS |
| 52 | Semua artboard | Setiap href antar artboard menuju file yang ada | PASS |

## Delivery Gate

Blok 1, Hard Gate (semua harus "tidak"):

- R-02 em dash: tidak ada. Dicek dengan pencarian karakter U+2014 dan U+2013 di semua source artboard.
- R-03 mobile: lolos. Lebar 390 px tidak punya scroll horizontal (uji 11), dan tombol sentuh utama berukuran 44 sampai 52 px.
- R-17, R-18, R-36, R-38: lolos. Angka yang dikarang ditulis sebagai placeholder atau diberi label "Angka contoh", dan tidak ada testimoni.
- R-23: lolos. Logo memakai ikon yang sudah ada, avatar memakai inisial, QR memakai placeholder berlabel.
- R-24: lolos. Menu tanpa artboard tidak berupa link dan diberi tanda redup (uji 52 memeriksa semua href).
- R-25: lolos. Tone badge dan teks mengikuti token yang sudah ada. Teks menu redup dikecualikan karena berstatus `aria-disabled` (komponen nonaktif).
- R-26: lolos. Semua kontrol punya perilaku nyata atau pesan "Prototype: ..." yang terlihat (uji 30 dan 43).
- R-27: lolos. List IoT punya 4 state, Halaman QR punya 8 state, panel pemakaian punya state kosong.
- R-32: lolos (uji 23 sampai 25 dan 38).
- R-33: lolos. Tidak ada script yang menambal CSS.
- R-34: lolos. Semua artboard punya mode terang dan gelap.
- R-35: lolos. Ada 52 click-through tercatat.
- R-37: lolos. Arah desain diambil dari `DESIGN.md`.

Blok 2, Purpose-Gate: lolos. Tidak ada gradien, glow, pola latar, atau animasi baru. Bayangan dan gradien latar berasal dari `index.css` beserta alasannya.

Blok 3, Liveliness: dial ENERGY 1 / RHYTHM 2 / MOTION 1 dari `DESIGN.md` konsisten. Setiap layar punya satu titik fokus (kartu yang keluar ambang), satu aksen (garis amber untuk ambang), dan motif yang berulang (kartu sensor berisi angka, badge state, dan bar ambang).

Blok 4, Craftsmanship: lolos. Layout mengikuti isi (bukan template), radius mengikuti skala di `index.css`, CTA spesifik, tanpa buzzword, dan palet tetap 2 sampai 3 warna inti + 1 aksen.

Status: PASS.
