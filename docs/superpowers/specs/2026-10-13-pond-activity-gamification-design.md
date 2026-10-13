# Gamifikasi dan Quest Level V-Pet dari Aktivitas Kolam

Tanggal: 2026-10-13
Status: Menunggu review pengguna

## Tujuan

Poin, misi, dan kenaikan level V-Pet harus mengikuti tindakan nyata yang dicatat pengguna untuk kolam. Telemetri otomatis IoT tetap menjadi sumber kondisi dan statistik air, tetapi perubahan pembacaan sensor tidak pernah menghasilkan poin atau EXP. Desain ini tidak mengubah pembacaan, ambang, atau reaksi sensor yang sudah berfungsi.

## Kondisi saat ini

- `SmartStore` memberi poin secara langsung untuk catatan pemantauan dan panen, tanpa menerapkan batas harian dari Aturan Poin.
- Tombol perawatan pet memberi poin secara hard-coded; tombol bermain juga memberi poin meskipun bukan aktivitas kerja kolam.
- EXP V-Pet bertambah dari peningkatan nilai kondisi pet; catatan pemantauan, kematian, dan panen belum menaikkan EXP.
- Misi di halaman Gamifikasi dapat dicentang manual dan sebagian mencakup HPP atau chatbot.
- Screenshot halaman Gamifikasi yang disertakan pengguna memperlihatkan alur centang misi manual tersebut.
- Store tetap persisten di browser. Tambahkan `pondActivityEvents` dan `petQuestCompletions`, serta kode aktivitas pada Aturan Poin secara aditif: defaultkan field baru untuk state lama, kaitkan R-2/R-4/R-6 ke kode stabil lewat ID rule, dan tambahkan R-7 hanya jika belum ada. Pertahankan nilai poin, batas harian, status aktif, saldo, pet, dan riwayat yang telah disimpan; jangan mereset atau memberi reward/quest retroaktif.
- Tidak ada perubahan database/server yang diperlukan atau termasuk dalam desain ini.

## Rancangan yang disetujui

### Aktivitas yang memenuhi syarat

Reward otomatis hanya berasal dari tindakan manual berikut, bila terkait kolam yang valid:

1. Catatan pemantauan manual untuk kolam.
2. Catatan kematian ikan. Untuk satu kolam dan tanggal, catatan yang diperbarui tetap satu aktivitas; koreksi jumlah/catatan tidak memberi reward ulang.
3. Catatan panen aktual. Catatan bertanggal lampau tetap masuk riwayat, tetapi tidak memperoleh reward baru.
4. Aksi beri pakan, bersihkan, dan rawat pada V-Pet yang ditempatkan di kolam.

Kolam harus bertipe `kolam`; pengguna harus memiliki akses ke area tersebut. Pet-care pada pet tanpa lokasi kolam yang valid tidak memperoleh reward. Saat quest untuk kolam selesai, semua pet yang ditugaskan ke kolam tersebut menerima EXP. Aksi pet tertentu tetap memperbarui kondisi/log pet yang dituju.

### Aktivitas yang tidak memenuhi syarat

- Telemetri dan statistik IoT otomatis, termasuk pembaruan berkala di latar belakang.
- HPP, chatbot, perubahan perangkat, dan aksi bermain V-Pet.
- Centang misi manual dan penyesuaian saldo oleh pengelola tidak menghasilkan EXP. Penyesuaian administratif poin tetap merupakan fungsi terpisah dan tidak dihitung sebagai aktivitas kolam.
- Aktivitas pada growbed, tandon, atau area yang tidak dapat diakses pengguna.

### Poin akun dan EXP melalui quest V-Pet

#### Poin akun pada Gamifikasi

- Poin tetap mengikuti aturan aktif dan nilai `Maks/hari` di Sistem Point. Batas dihitung per pengguna, per kode aturan, per tanggal lokal, melintasi seluruh kolam. Aksi pakan/bersih/rawat memakai kuota bersama R-4.
- Gunakan kode aktivitas stabil: `pemantauan_manual` memakai R-2, `perawatan_pet` memakai R-4, `panen_aktual` memakai R-6, dan `catat_kematian` memakai R-7. Perubahan label aturan tidak memutus pemetaan.
- Tambahkan R-7 “Catat kematian ikan” sebesar 5 poin dengan batas 1 kali/hari; nilainya dapat diubah pengelola.
- Aturan nonaktif atau batas harian tercapai hanya menghentikan poin akun dari aktivitas terkait. Catatan valid tetap dapat menyelesaikan quest V-Pet.

#### Quest harian V-Pet

- Level V-Pet hanya memperoleh EXP dari quest yang selesai, bukan langsung dari setiap event dan bukan dari perubahan nilai kondisi pet.
- Quest rutin per kolam: “Beri pakan” selesai oleh aksi pakan; “Bersihkan” oleh aksi bersih; “Rawat” oleh aksi rawat; “Cek kualitas air” oleh catatan pemantauan manual dengan sedikitnya dua parameter pH/suhu/TDS.
- Quest peristiwa “Catat kematian ikan” dan “Catat panen” hanya selesai saat catatan nyata dibuat. Keduanya bukan kewajiban harian dan tidak meminta pengguna membuat catatan bila peristiwa tidak terjadi.
- Setiap quest selesai memberi +10 EXP kepada semua V-Pet yang ditugaskan ke kolam tersebut saat quest selesai. Quest diselesaikan paling banyak sekali per `questId + areaId + tanggal lokal`; kolam lain memiliki progres quest masing-masing.
- Aksi ulang pada quest yang sudah selesai tetap boleh memperbarui kondisi pet atau membuat catatan yang sah, tetapi tidak memberi EXP quest kedua pada tanggal yang sama. Untuk catatan kematian, koreksi pada baris kolam/tanggal yang sama tidak dihitung sebagai event baru.
- Batas poin Sistem Point tidak membatasi EXP quest. Aksi yang valid dapat memberi EXP quest walaupun batas poin akun sudah tercapai atau aturan poinnya nonaktif.
- Aksi “Ajak main” tetap hanya menaikkan kebahagiaan dan tidak menyelesaikan quest EXP.
- Quest menggunakan tanggal lokal yang sama dengan `hariKey()`. Saat tanggal berganti, daftar quest harian kembali belum selesai; riwayat penyelesaian lama tetap tersimpan.
- Pertahankan XP, level, tahap, dan ambang progres yang sudah tersimpan. Jalankan EXP quest melalui fungsi kenaikan level yang sama agar sisa EXP dan tahap tetap konsisten. Perubahan kondisi dari pakan/bersih/rawat tidak boleh menambah EXP lagi di luar quest.
- Saldo poin, badge, level, dan EXP lama tidak dikurangi atau dihitung ulang. Tidak ada reward atau penyelesaian quest retroaktif dari data lama.

### Pencatatan idempoten

Simpan state aktivitas `pondActivityEvents` dan penyelesaian `petQuestCompletions` secara persisten. Event aktivitas berisi ID pengguna, tanggal lokal, kode aktivitas, area/kolam, ID sumber stabil, waktu pencatatan, aturan poin, dan poin yang diberikan. Penyelesaian quest berisi `questId`, `areaId`, tanggal lokal, ID event sumber, ID pet penerima, dan +10 EXP per pet.

Kunci unik penyelesaian adalah `questId + areaId + tanggal lokal`. Catatan aktivitas valid tetap disimpan walau batas poin tercapai atau tidak ada pet di kolam; misi poin tetap dapat membaca event, tetapi quest EXP hanya memberi hadiah bila ada pet yang ditugaskan. Periksa ID sumber sebelum mencatat reward. Koreksi catatan kematian menggunakan event sumber yang sama untuk `areaId + tanggal`; tidak membuat penyelesaian quest kedua. Batas poin dihitung dari event/reward per aturan, bukan ledger tampilan yang dipangkas. Aktivitas bertanggal lampau atau gagal validasi tidak menerima poin atau EXP quest. Jangan memberi reward atau penyelesaian quest retroaktif.

### Misi Gamifikasi dan quest V-Pet di UI

- Halaman `/gamifikasi` menampilkan status misi poin berdasarkan `pondActivityEvents`, bukan centang manual. Misi status tidak memberi bonus poin kedua; poin akun hanya berasal dari aturan aktivitas.
- Halaman `/v-pet` menampilkan daftar quest harian pada detail pet/kolam, dengan status belum selesai/selesai dan hadiah `+10 EXP`. Status selesai berasal dari aktivitas manual yang tercatat; tidak ada tombol centang untuk mengklaim EXP.
- Saat quest pertama kali selesai, UI langsung menandai quest, memperbarui EXP/bar level dan jurnal pet, lalu menampilkan pesan yang jelas, misalnya “Quest Bersihkan selesai (+10 EXP)”. Pesan poin akun ditampilkan terpisah agar tidak membingungkan.
- Jika tombol aksi ditekan lagi setelah quest yang sama selesai hari itu, quest tetap terlihat selesai, EXP tidak bertambah lagi, dan UI memberi tahu bahwa batas quest harian sudah tercapai. Perubahan kondisi pet yang sah tetap boleh terlihat.
- Quest V-Pet: “Beri pakan”, “Bersihkan”, “Rawat”, dan “Cek kualitas air” (minimal dua parameter manual). Quest kematian/panen bersifat peristiwa, hanya muncul/selesai saat catatan nyata tersedia dan bukan target rutin harian.
- Kartu saldo, badge, dan papan peringkat tetap memakai saldo poin akun. EXP quest memperbarui progres level serta riwayat V-Pet, terpisah dari poin akun.
- Screenshot aksi V-Pet menjadi acuan alur: “Beri pakan”, “Bersihkan”, dan “Rawat” dapat menyelesaikan quest masing-masing; “Ajak main” hanya menambah kebahagiaan.
- Perubahan UI dibatasi pada halaman Gamifikasi dan V-Pet yang diperlukan untuk status misi/quest. Tampilan statistik sensor tidak diubah.

## Alur data

Form atau aksi manual di halaman area/V-Pet memanggil satu aksi domain di `SmartStore`. Aksi tersebut memvalidasi pengguna, kolam, tanggal, dan ID sumber; menyimpan `pondActivityEvents`; memberi poin akun jika aturan dan kuota mengizinkan; lalu memeriksa quest harian yang relevan. Quest yang belum selesai dicatat di `petQuestCompletions` dan memberi +10 EXP kepada pet di kolam. Misi poin dan quest V-Pet membaca event yang sama tetapi memakai ledger serta aturan reward terpisah. Pembaruan telemetri sensor tidak melewati jalur quest maupun reward.

## Batasan teknis dan non-tujuan

### Struktur source code yang wajib diikuti

Ikuti peta folder fitur yang sudah ditetapkan di `docs/struktur-proyek.md` dan `src/README.md`; nama folder mengikuti output/menu aplikasi dan source diletakkan langsung di folder fiturnya:

- Aturan reward dan misi: `src/gamifikasi/` (gunakan subfolder `model/`, `data/`, atau `pages/` sesuai peran file).
- Progres/EXP, level, dan tampilan V-Pet: `src/v-pet/` (gunakan `model/`, `pages/`, `components/`, atau `data/` sesuai peran file).
- Aksi input manual kolam: `src/kelola-area/` hanya bila integrasi form memang diperlukan.
- State lintas fitur: `src/shared/store/SmartStore.jsx` sebagai orkestrasi/persistensi; aturan domain tetap di folder fitur pemiliknya. Gunakan `src/shared/` hanya untuk kode yang benar-benar dipakai beberapa fitur.
- Tes diletakkan di folder fitur yang sesuai, yaitu `tests/gamifikasi/`, `tests/v-pet/`, dan `tests/kelola-area/` bila ada perubahan integrasi area.

Jangan menaruh source baru di root `src/`, jangan membuat folder fitur duplikat atau mengganti nama folder yang sudah dirapihkan, dan jangan memindahkan file yang tidak perlu. Tambahkan subfolder hanya mengikuti konvensi proyek yang sudah ada.

- Kerjakan hanya alur gamifikasi, V-Pet, dan integrasi state minimum untuk mengaitkan reward ke kolam.
- Jangan mengubah logika sensor, nilai pH/suhu/TDS, ambang, simulator/telemetri, atau reaksi karakter terhadap sensor.
- Jangan menjalankan migrasi database, mengubah layanan backend, menghapus data lokal, atau mengubah aset karakter.
- Tidak menambahkan sinkronisasi lintas perangkat; state tetap mengikuti batas penyimpanan browser yang ada.
- Tidak mengubah HPP, ekonomi batch ikan, atau modul lain.

## Kriteria penerimaan

1. Aktivitas manual yang valid memberi poin akun mengikuti aturan aktif dan batas harian per pengguna/aturan.
2. Pakan, bersihkan, rawat, dan pemantauan manual minimal dua parameter menyelesaikan quest terkait untuk kolam yang sama.
3. Quest yang selesai memberi tepat +10 EXP kepada semua V-Pet yang ditugaskan di kolam itu; quest yang sama hanya membayar sekali per kolam/tanggal lokal.
4. Setelah klik pertama yang memenuhi syarat, status quest, EXP/bar level, dan jurnal pet langsung tampak berubah tanpa menutup detail pet; pesan membedakan EXP dari poin akun.
5. Klik ulang pada quest yang sudah selesai tetap menampilkan status selesai dan memberi keterangan bahwa reward hari ini sudah diterima, tanpa EXP tambahan.
6. Quest di kolam berbeda memiliki status/penyelesaian terpisah; tanggal lokal baru mereset status quest rutin tanpa menghapus riwayat lama.
7. Catatan kematian yang diperbarui pada kolam/tanggal sama tidak menyelesaikan quest dua kali; quest kematian/panen hanya tersedia saat catatan nyata dibuat.
8. Ajak main, HPP, chatbot, centang manual, telemetri otomatis, growbed/tandon, pet tanpa kolam, serta aktivitas tanpa hak akses tidak memberi EXP quest.
9. Batas poin harian atau aturan poin nonaktif tidak menggagalkan EXP dari quest yang valid; poin dan EXP memiliki pencatatan terpisah.
10. Perubahan kondisi pet tidak memberi EXP langsung di luar reward quest; kenaikan level menjaga sisa XP, ambang berikutnya, dan tahap yang benar.
11. Data lama, saldo poin, level, dan EXP tetap utuh setelah state dimuat ulang; tes unit/integrasi dan browser mencakup reward, visual completion, batas harian, duplikasi/koreksi, akses, reset tanggal, migrasi state, serta jalur sensor yang tidak berubah.
