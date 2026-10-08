# Desain PostgreSQL untuk SmartDashboard JagoFarm

Status: disetujui pengguna pada 2026-10-08; implementasi berjalan berdasarkan rencana bertahap.

## Tujuan

Menjadikan PostgreSQL satu sumber data bersama untuk fitur SmartDashboard pengguna dan pengelola, sambil mempertahankan kontrak Pilot/IoT yang sedang ada, menyelaraskan pola migrasi dengan branch rekan `origin/feat/iot-system`, dan menjaga seluruh data yang sudah tersimpan.

## Kondisi yang telah diverifikasi

- SmartDashboard berada di `src/SmartApp.jsx` dan memakai `src/store/SmartStore.jsx` sebagai sumber state. Seluruh state utamanya disimpan sebagai satu objek localStorage dengan key `aquasmart_smart_v1`.
- Halaman SmartDashboard belum menggunakan autentikasi/API Pilot untuk operasi domain. Role dan batas area saat ini terutama diterapkan di sisi klien.
- Backend aktif pada branch `dev/antigravity` memiliki skema Pilot versi 1: `users`, `sessions`, `devices`, `ownerships`, `readings`, dan `schema_migrations`.
- Database lokal yang diperiksa mencatat versi migrasi 1 serta 4 user, 4 device, 4 ownership, dan 2.086 reading. Angka dan baris yang ada harus tetap ada setelah migrasi.
- Branch rekan `origin/feat/iot-system` memiliki migrasi SQL bernomor 001/002. Migrasi 002 menambah katalog tipe device/sensor, ambang area, event device, API key/usage, dan metadata ingestion. Branch tersebut dibaca saja dan tidak akan di-merge atau di-checkout sebagai bagian pekerjaan ini.
- Worktree berisi perubahan lokal lain. Setiap commit rancangan atau kode harus hanya menyertakan file tugas yang bersangkutan.

## Cakupan persistensi

Data yang menjadi sumber kebenaran PostgreSQL:

1. Akun, profil, status akun, role SmartDashboard, sesi, serta penugasan pengguna ke area.
2. Area, tipe/kategori perangkat, device, penempatan device, kalibrasi, dan ambang sensor.
3. Telemetri perangkat beserta asal datanya. Data simulasi harus diberi penanda berbeda dari telemetri perangkat nyata.
4. Catatan pemantauan manual, mortalitas per area/tanggal, dan populasi area.
5. Item HPP dan catatan panen/pendapatan.
6. Konfigurasi dan kondisi V-Pet, progres EXP/level, serta catatan perawatan.
7. Aturan poin, misi, badge, progres pengguna, klaim, dan ledger poin.

Data berikut tidak memerlukan tabel permanen pada tahap ini:

- Agregat dashboard yang dapat dihitung dari data sumber.
- Filter, pilihan tab, status modal/form, konteks QR, dan status kamera.
- Aset gambar, ikon, label sensor, serta basis pengetahuan chatbot yang statis di repository.
- Riwayat chatbot tetap lokal secara default. Persistensi percakapan lintas perangkat memerlukan keputusan privasi/retensi terpisah.

## Matriks fitur per role

Pengguna:

- Dashboard dan statistik: query/agregasi atas area, device, readings, mortalitas, HPP, panen, pet, dan poin; tidak menyimpan ringkasan duplikat.
- Daftar IoT, detail device, dan informasi/QR: membaca device, kategori, ambang, dan telemetri dari sumber PostgreSQL; filter dan status scan bersifat sementara.
- Kelola Area/detail: membaca area yang ditugaskan dan menulis pemantauan, mortalitas, item HPP, serta panen.
- V-Pet: membaca pet yang dimiliki/dibagikan dan menulis aksi perawatan/progres yang diizinkan.
- Gamifikasi: membaca saldo/ledger, misi, badge, dan progres; klaim/poin ditulis lewat operasi server yang atomik.
- Chatbot: basis pengetahuan tetap di repository; percakapan lokal secara default.
- Profil/login/daftar: membaca/mengubah profil sendiri, autentikasi server, pendaftaran, status, dan sesi.

Pengelola:

- Dashboard/detail informasi: baca data sumber; tidak ada tabel ringkasan khusus.
- Kelola pengguna: membuat/memperbarui profil, menyetujui pengelola, menonaktifkan akun, menetapkan area, dan mencatat koreksi poin.
- Kelola IoT/kategori: menambah/mengubah perangkat, jenis sensor, kategori, ambang, penempatan, dan konfigurasi kalibrasi.
- Kelola area: mengelola area dan relasi pengguna/perangkat; perubahan populasi dan mortalitas tetap melalui transaksi yang sama dengan tampilan pengguna.
- Kelola V-Pet: mengelola identitas/pengaturan pet serta tindakan admin yang tercatat.
- Kelola poin: mengubah aturan/misi/badge melalui konfigurasi, sedangkan pemberian/koreksi poin masuk ledger.

Semua mutasi pengguna dan pengelola mengarah ke record domain yang sama. Hak akses diuji di API berdasarkan sesi, role, status akun, dan penugasan area.

## Arsitektur yang dipilih

### Identitas dan izin

Gunakan identitas dan sesi server yang ada bila kontraknya cocok, tanpa memindahkan password mentah dari localStorage. Pertahankan arti kolom role Pilot `admin/user` agar API Pilot lama tidak rusak. Simpan role dan status khusus SmartDashboard (`pengelola/pengguna`, `aktif/menunggu`) sebagai profil domain terhubung ke `users`. Akun pengelola yang mendaftar tetap menunggu persetujuan; penentuan role/status tidak boleh dipercaya dari payload klien.

Relasi area pengguna disimpan sebagai relasi many-to-many dengan ID area. Setiap API memeriksa izin pada server: pengelola mengelola lingkup farm sesuai role; pengguna hanya dapat membaca atau mengubah data area yang ditugaskan. UI menyembunyikan data di luar izin, tetapi bukan menjadi kontrol keamanan utama.

### Model data

Pertahankan tabel Pilot dan gunakan kontrak IoT branch rekan sebagai dasar kompatibilitas untuk tipe sensor/perangkat, ambang, event, dan metadata ingestion. Tambahkan migrasi SmartDashboard aditif yang menyediakan entitas berikut:

- Profil SmartDashboard dan penugasan pengguna-area.
- Area produksi.
- Catatan pemantauan, mortalitas harian, item HPP, dan panen.
- Pet serta peristiwa/catatan perawatannya.
- Aturan poin, misi, badge, progres/klaim pengguna, dan ledger poin.
- Batch/riwayat impor localStorage untuk idempotensi dan audit.

Gunakan FK, unique constraint, CHECK, dan indeks untuk integritas referensi, nilai populasi nonnegatif, kode/identitas unik yang relevan, dan pencarian berdasarkan area/waktu. Baca dashboard dan leaderboard dari tabel sumber atau query agregat, bukan salinan state kedua. Ledger poin bersifat append-only; saldo tidak dapat dimanipulasi langsung dari klien.

Untuk koreksi mortalitas di hari yang sama, tetapkan satu catatan unik per area/tanggal. Perubahan jumlah memperbarui populasi dengan delta `jumlah_baru - jumlah_lama` dalam transaksi, agar koreksi tidak mengurangi populasi dua kali.

### Migrasi schema

Pindah dari `server/schema.sql` monolitik ke runner migrasi bernomor yang kompatibel dengan konvensi branch rekan. Sebelum perubahan apa pun:

1. Ambil backup logis dan catat versi/schema aktual.
2. Bandingkan database versi 1 yang sudah ada dengan baseline migrasi 001. Jangan menjalankan ulang 001 terhadap schema yang sudah tercatat.
3. Uji jalur upgrade dari database kosong dan dari salinan database versi 1.
4. Terapkan perubahan secara aditif. Tidak ada `DROP TABLE`, reset database, penghapusan volume, atau penggantian data Pilot.
5. Terapkan kontrak migrasi IoT 002 setelah preflight lulus, lalu migrasi dashboard berikutnya. Jika bentuk aktual tidak cocok, buat langkah rekonsiliasi yang tidak destruktif dan minta persetujuan sebelum menyentuh data.

Tidak ada perubahan pada branch `origin/feat/iot-system`; pola dan schema-nya diselaraskan secara terkontrol di branch kerja saat ini. API Pilot yang ada tetap berfungsi. API SmartDashboard baru mengikuti pola autentikasi, validasi, error, dan versi yang konsisten dengan backend/kontrak IoT.

### Impor localStorage

Impor lama bersifat opt-in per browser dan hanya setelah pengguna terautentikasi. Browser menampilkan ringkasan data yang akan dikirim dan meminta konfirmasi. Server memvalidasi role, referensi, kepemilikan area, dan bentuk data; ID lama dipetakan secara deterministik; batch impor dibuat idempotent. Identitas akun lama tidak membuat akun atau hak baru: profil hanya dipetakan melalui sesi server yang telah diverifikasi, sedangkan role, status, persetujuan, dan penugasan area ditentukan dari data server. Konflik dengan data server tidak menimpa diam-diam: impor ditolak atau ditandai untuk penyelesaian eksplisit.

localStorage sumber tidak dihapus saat mengirim. Penghapusan hanya dapat dipertimbangkan setelah pembacaan ulang dari server cocok dan pengguna menyetujui. Password, session ID lama, serta material autentikasi tidak pernah ikut diimpor. Data simulasi diberi label agar tidak tercampur dengan pembacaan IoT nyata.

### Keamanan dan operasi

Database hanya dapat diakses backend pada jaringan internal Compose. Jangan membuka port database ke LAN. Sebelum mengirim password atau data personal melalui UI LAN, gunakan HTTPS atau batasi aplikasi ke localhost/jaringan privat tepercaya; URL HTTP LAN saat ini bukan kanal yang aman untuk kredensial nyata. CORS/origin, cookie sesi, validasi payload, dan otorisasi area harus diverifikasi sebelum mengaktifkan login server-side untuk penggunaan nyata.

Jangan menjalankan migrasi terhadap volume aktif sebelum backup berhasil, schema preflight lulus, dan uji upgrade pada salinan data berhasil. Tidak ada push remote dalam lingkup pekerjaan tanpa instruksi terpisah.

## Alternatif yang dipertimbangkan

1. Mempertahankan `schema.sql` monolitik lalu menambah tabel. Lebih cepat untuk perubahan awal, tetapi menyimpang dari pola migrasi bernomor dan model IoT rekan.
2. Menyelaraskan runner/migrasi bernomor, mempertahankan data Pilot, lalu menambah migrasi SmartDashboard. Dipilih karena memakai satu database dan menghindari duplikasi identitas/perangkat, dengan syarat rekonsiliasi schema dan backup sebelum migrasi.
3. Membuat database/schema terpisah. Isolasi lebih mudah, tetapi menimbulkan dua sumber user/device dan memerlukan sinkronisasi lintas sistem.

## Kriteria penerimaan

- Upgrade mempertahankan seluruh user, device, ownership, reading, sesi, dan identifier Pilot yang sudah ada.
- Migrasi lulus pada database kosong serta salinan database versi 1; dapat dijalankan ulang tanpa menggandakan data.
- API menolak pengguna tanpa sesi, role salah, pengguna menunggu, dan akses ke area yang tidak ditugaskan; pengelola dapat melakukan operasi yang diizinkan.
- Perubahan pengelola pada area/device/pet/aturan yang sama terlihat oleh pengguna yang ditugaskan setelah login ulang atau refresh.
- Koreksi mortalitas, HPP/panen, kondisi pet, dan ledger poin bersifat atomik serta persisten.
- Impor localStorage memerlukan persetujuan, dapat diulang tanpa duplikasi, dan sumber lokal tetap utuh sampai hasil baca ulang diverifikasi.
- Data simulasi dapat dibedakan dari telemetry perangkat nyata.
- Build, tes unit/integrasi, pemeriksaan migrasi, serta alur browser utama untuk kedua role lulus.
- Tidak ada kredensial nyata dikirim melalui HTTP LAN atau disimpan dalam plaintext.

## Batas pekerjaan

Implementasi dilakukan bertahap setelah dokumen ini ditinjau. Tidak termasuk: merge branch rekan, push remote, penghapusan volume/data, migrasi password lama, penyimpanan riwayat chatbot secara default, perubahan desain UI, atau penggantian endpoint Pilot yang ada.
