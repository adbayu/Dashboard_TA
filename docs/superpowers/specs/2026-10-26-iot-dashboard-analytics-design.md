# Desain Dashboard Analitik IoT

Status: disetujui untuk implementasi dengan data simulasi sementara

## Tujuan

Tambahkan visualisasi riwayat harian sensor pada Dashboard utama JagoFarm, sambil mempertahankan tabel angka dan menyelaraskan gaya grafik dengan identitas visual yang sudah digunakan web.

Design Read: dashboard pemantauan aquaponik untuk operator farm, memakai sistem visual Lumina Aqua yang sudah ada, ENERGY 1 / RHYTHM 2 / MOTION 1.

## Konteks data

- Dashboard utama berada pada route `/`. `/pilot` adalah aplikasi terpisah di repo yang menggunakan API PostgreSQL.
- SmartDashboard menyimpan `readings` sebagai riwayat per area, bukan per-ID perangkat. Data demo disiapkan untuk 14 hari dengan interval 30 menit, lalu nilai hari ini bergerak dari simulator.
- Tiga sensor saat ini berada di Kolam Nila A: pH, suhu air, dan TDS. Masing-masing parameter saat ini memiliki satu perangkat.
- Histori SmartDashboard bukan bukti pengukuran hardware. Grafik harus menandai data sebagai simulasi sampai perangkat fisik terhubung.
- Jika beberapa perangkat dengan parameter yang sama ditempatkan di satu area, model histori sekarang tidak dapat memisahkan sumber tiap perangkat. Fase ini menampilkan histori per area dan parameter, tanpa mengklaim rekaman per-ID perangkat.

## Rancangan

### Dashboard utama `/`

- Letakkan kartu `Riwayat Sensor` sebagai konten pertama Dashboard `/`, sebelum ringkasan hari ini, agar grafik menjadi fokus utama saat halaman dibuka.
- Pertahankan kartu telemetri saat ini dan bagian `Histori Harian`.
- Tambahkan kontrol `Grafik` dan `Tabel` di dalam bagian histori. `Grafik` menjadi tampilan awal; `Tabel` tetap menyajikan ringkasan tanggal, rata-rata, minimum, maksimum, status ambang, dan kematian ikan yang sudah ada.
- Jika pengguna memiliki lebih dari satu area dengan sensor, sediakan filter area yang hanya memuat area dalam `areasSaya`. Jika hanya satu area, tampilkan namanya tanpa dropdown yang tidak berguna.
- Untuk area terpilih, tampilkan tiga grafik garis kecil yang terpisah: pH, suhu air, dan TDS. Ketiganya memakai sumbu dan satuan masing-masing agar besaran yang berbeda tidak dibandingkan secara menyesatkan.
- Rentang awal adalah 14 hari yang tersedia. Tooltip menunjukkan tanggal, waktu lokal, nilai, satuan, dan status terhadap ambang aktif area. Garis batas ambang memakai hasil `ambangUntuk`, sama seperti kartu sensor dan statistik yang ada.
- Grafik mempertahankan celah pada data yang tidak tersedia. Nilai kosong tidak digambar sebagai nol.
- Tampilkan label yang jelas bahwa data berasal dari simulator dan belum terhubung ke hardware IoT.

### Gaya grafik

- Pada Dashboard utama `/`, gunakan token warna, permukaan, teks, dan tema terang/gelap JagoFarm. Pada `/pilot`, selaraskan warna garis, grid, tooltip, dan tipografi dengan palet JagoFarm dalam tema terang yang sudah digunakan halaman itu; tahap ini tidak menambahkan tema gelap baru ke Pilot. Warna membedakan pH, suhu, TDS, dan status ambang, tetapi label teks tetap menyebut parameter dan statusnya.
- Sumbu, grid, tooltip, legenda, dan tipografi grafik mengikuti sistem visual yang sama. Grafik garis per perangkat di `/pilot` diselaraskan secara visual tanpa mengubah sumber data, API, atau batas aksesnya.
- Grafik memakai komposisi responsif: tiga panel pada layar lebar dan tersusun vertikal di layar sempit.
- Di bawah 640px, sidebar SmartDashboard menjadi rail ikon 64px agar area konten tetap cukup lebar untuk grafik; setiap item menampilkan label ringkas dan mempertahankan nama aksesibel. Pada 640px ke atas, sidebar tetap memakai lebar penuh yang sekarang.
- Referensi gambar hanya menjadi inspirasi kepadatan dan variasi visual. Angka penjualan, nama toko, funnel, rasio konversi, atau metrik bisnis lain tidak dibawa ke JagoFarm karena tidak tersedia sebagai data sensor.

## Data dan akses

1. Baca riwayat dari `state.readings` melalui read model yang sudah digunakan Dashboard, bukan membuat salinan state baru.
2. Hitung status dan ambang melalui helper bersama seperti `statistikHarian`, `historiArea`, dan `ambangUntuk`.
3. Batasi daftar area untuk pengguna sesuai `areasSaya`; jangan menampilkan histori dari area yang tidak menjadi tanggung jawabnya.
4. Gunakan kode perangkat sebagai keterangan hanya ketika hubungan area-parameter-ke-perangkat unik. Jika ada lebih dari satu perangkat dengan parameter sama, tampilkan nama parameter/area dan jangan menyatakan titik historis berasal dari perangkat tertentu.
5. Tidak ada migrasi PostgreSQL, ekspor database, atau perubahan simulator pada fase ini.

## Keadaan UI

- Tanpa area bersensor: tampilkan empty state yang sudah ada.
- Parameter belum memiliki histori: chart tetap menampilkan label/unit dan pesan belum ada data, tanpa angka nol buatan.
- Ambang belum diatur: tampilkan nilai histori, tetapi jangan menggambar garis ambang atau memberi label aman/bahaya.
- Pengguna tanpa akses area: area dan histori tersebut tidak muncul.

## Di luar cakupan

- Riwayat historis terpisah per ID perangkat untuk beberapa perangkat dengan parameter sama.
- Pengambilan telemetri nyata dari hardware; seluruh integrasi perangkat fisik tetap di luar tahap ini.
- Funnel chart, gauge persentase, atau perbandingan komersial tanpa metrik sumber yang nyata.
- Perubahan API atau skema database PostgreSQL.
- Penambahan grafik baru pada halaman admin; cakupan utama adalah Dashboard pengguna `/` dan penyelarasan gaya grafik `/pilot` yang sudah ada.

## Verifikasi yang direncanakan

- Unit test transformasi riwayat ke titik chart, nilai kosong, ambang area, dan tanggal lokal.
- Uji izin: pengguna hanya menerima seri dari area yang ditugaskan.
- Browser test toggle Grafik/Tabel, filter area, tooltip, status ambang, dan label simulasi.
- Uji lebar 375, 768, dan 1262 px, tema terang/gelap, tanpa horizontal overflow.
- Jalankan `npm run test:vpet`, `npm run cek:aset`, `npm run build`, typecheck/lint yang berlaku, serta verifikasi route `/` di browser.
