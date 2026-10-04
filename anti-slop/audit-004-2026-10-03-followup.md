# Follow-up audit 004: perbaikan PRD, UI/UX, dan prototype

Tanggal: 3 Oktober 2026
Keputusan pemilik untuk nomor 1: opsi (b), kode aktivasi tetap 24 jam dan label QR dicetak saat alat siap dipasang.
Semua 15 temuan diperbaiki di versi Markdown, versi Claude Docs, dan prototype.

| No | Status | Perubahan |
| --- | --- | --- |
| 1 | Diperbaiki | Keputusan dicatat sebagai [ADR-0009](../docs/iot/adr/0009-qr-dicetak-saat-pemasangan.md). PRD US-02 dan US-03, UI/UX alur 4.1, API Contract 6.3, dan Test Plan (V1-28) diperbarui. Di prototype Kelola IoT ditambah tombol "Buat ulang kode aktivasi" per device dan peringatan "berlaku 24 jam" di label QR |
| 2 | Diperbaiki | G1 dan bagian 9 PRD sekarang merujuk ke kriteria Test Plan bagian 6: tanpa kehilangan data selama putus koneksi masih di dalam kapasitas buffer 48 jam, dan celah lain harus bisa dijelaskan |
| 3 | Diperbaiki | Pohon menu UI/UX Markdown ditulis ulang: Developer hanya di Pengelola, sama dengan versi Claude Docs dan prototype |
| 4 | Diperbaiki | Spek Monitoring per sensor disamakan dengan prototype: maksimal 3 device dengan warna dari palet, yang keluar ambang diurutkan di atas, tabel memakai kotak scroll |
| 5 | Diperbaiki | Alur Developer memakai "panel Sandbox" dan tombol "Referensi API", sesuai prototype |
| 6 | Diperbaiki | Prototype ditambah aksi "Buat ulang kode aktivasi" per device dan "Nonaktifkan/Aktifkan" per tipe IoT. Dokumen menyebut kedua aksi itu |
| 7 | Diperbaiki | Prototype Detail device ditambah bagian "Fungsi alat". Dokumen sekarang menyebut 5 kejadian terakhir dan menjelaskan bahwa tombol QR hanya untuk pengelola |
| 8 | Diperbaiki | Sidebar prototype menampilkan badge jumlah kejadian di menu Monitoring, dengan label pembaca layar "1 kejadian perlu perhatian" |
| 9 | Diperbaiki | UI/UX bagian 6 dan 7 (dua versi) ditambah status "Menunggu klaim", tombol Menu di 720 px ke bawah, pola fokus modal, nama aksesibel tombol berulang, dan label select dengan for/id |
| 10 | Diperbaiki | Wireframe ASCII di 5.5 dan 5.6 diganti screenshot prototype |
| 11 | Diperbaiki | Penanda tebal di dalam blok kode diganti tanda (baru) dan (diubah) |
| 12 | Diperbaiki | Nomor urut kode alat ditetapkan per prefix, melanjutkan nomor tertinggi yang sudah ada (device pH berikutnya `AQ-PH-002`). Prototype disesuaikan, dan Test Plan ditambah V1-29 |
| 13 | Diperbaiki | PRD bagian 8 ditambah retensi data (readings minimal 1 tahun, usulan) dan kapasitas target (57.600 baris per hari untuk 20 device). Technical Design ditambah variabel `READINGS_RETENTION_DAYS` |
| 14 | Diperbaiki | PRD dan setiap subbagian spesifikasi layar menautkan gambar di `docs/iot/design/` |
| 15 | Diperbaiki | Lebar 360 px diuji di 6 halaman prototype (uji nomor 56 sampai 61), dan dokumen mencatat hasilnya |

Temuan tambahan selama perbaikan, langsung diperbaiki: empat tombol "Nonaktifkan" di tabel tipe punya nama aksesibel yang sama. Sekarang setiap tombol menyebut kode tipenya ("Nonaktifkan AQ-TMP").

## Click-through prototype (R-35)

Sebanyak 62 uji, semuanya PASS, tanpa `pageerror` di console.

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
| 52 | Kelola IoT | Buat ulang kode aktivasi membuka label QR dengan pesan kode baru | PASS |
| 53 | Kelola IoT | Nonaktifkan dan aktifkan lagi tipe IoT | PASS |
| 54 | Sidebar | Badge kejadian di menu Monitoring terbaca | PASS |
| 55 | Detail device | Bagian Fungsi alat tampil | PASS |
| 56 | Lebar 360 px | Main.dc.html tanpa scroll horizontal | PASS |
| 57 | Lebar 360 px | DetailDevice.dc.html tanpa scroll horizontal | PASS |
| 58 | Lebar 360 px | Monitoring.dc.html tanpa scroll horizontal | PASS |
| 59 | Lebar 360 px | KelolaIoT.dc.html tanpa scroll horizontal | PASS |
| 60 | Lebar 360 px | Developer.dc.html tanpa scroll horizontal | PASS |
| 61 | Lebar 360 px | KlaimQR.dc.html tanpa scroll horizontal | PASS |
| 62 | Semua artboard | Setiap href antar artboard menuju file yang ada | PASS |

## Pengecekan dokumen

- Pencarian em dash dan en dash di semua file `docs/iot/**/*.md` dan kedua Claude Docs: tidak ada.
- Semua link relatif di `docs/iot/` menuju file yang ada.
- Istilah lama yang sudah dihapus (`tebal`, `Kolam Nila B`, `5 device`, `Coba di /docs`, `tab Sandbox`, `tanpa data hilang`) tidak ditemukan lagi.

Status: PASS.
