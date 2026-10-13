# Gamifikasi dan EXP V-Pet dari Aktivitas Kolam

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
- Store tetap persisten di browser. Tambahkan `pondActivityEvents` dan kode aktivitas pada Aturan Poin secara aditif: defaultkan field baru untuk state lama, kaitkan R-2/R-4/R-6 ke kode stabil lewat ID rule, dan tambahkan R-7 hanya jika belum ada. Pertahankan nilai poin, batas harian, status aktif, saldo, pet, dan riwayat yang telah disimpan; jangan mereset atau memberi reward retroaktif.
- Tidak ada perubahan database/server yang diperlukan atau termasuk dalam desain ini.

## Rancangan yang disetujui

### Aktivitas yang memenuhi syarat

Reward otomatis hanya berasal dari tindakan manual berikut, bila terkait kolam yang valid:

1. Catatan pemantauan manual untuk kolam.
2. Catatan kematian ikan. Untuk satu kolam dan tanggal, catatan yang diperbarui tetap satu aktivitas; koreksi jumlah/catatan tidak memberi reward ulang.
3. Catatan panen aktual. Catatan bertanggal lampau tetap masuk riwayat, tetapi tidak memperoleh reward baru.
4. Aksi beri pakan, bersihkan, dan rawat pada V-Pet yang ditempatkan di kolam.

Kolam harus bertipe `kolam`; pengguna harus memiliki akses ke area tersebut. Pet-care yang dilakukan pada pet tanpa lokasi kolam yang valid tidak memperoleh reward. Untuk aktivitas level kolam, semua pet yang ditugaskan ke kolam itu menerima EXP. Aksi pet tertentu tetap memperbarui kondisi/log pet yang dituju.

### Aktivitas yang tidak memenuhi syarat

- Telemetri dan statistik IoT otomatis, termasuk pembaruan berkala di latar belakang.
- HPP, chatbot, perubahan perangkat, dan aksi bermain V-Pet.
- Centang misi manual dan penyesuaian saldo oleh pengelola tidak menghasilkan EXP. Penyesuaian administratif poin tetap merupakan fungsi terpisah dan tidak dihitung sebagai aktivitas kolam.
- Aktivitas pada growbed, tandon, atau area yang tidak dapat diakses pengguna.

### Reward dan progres level

- Setiap aktivitas baru yang memenuhi syarat memperoleh +10 EXP untuk setiap V-Pet yang ditugaskan ke kolam terkait.
- Poin mengikuti aturan aktif dan nilai `Maks/hari` yang sudah dikonfigurasi pada Sistem Point. Batas diterapkan per pengguna, per kode aturan reward, per tanggal lokal, melintasi seluruh kolam; aksi pakan/bersih/rawat berbagi kuota aturan “Pelihara virtual pet”. Penghitung terpisah tidak boleh bergantung pada riwayat tampilan poin yang dibatasi jumlah barisnya.
- Gunakan kode aktivitas stabil untuk memetakan tindakan ke Aturan Poin; perubahan nama aturan oleh pengelola tidak memutus pemetaan. `pemantauan_manual` memakai aturan pemantauan yang ada (R-2), `perawatan_pet` memakai R-4 untuk pakan/bersih/rawat, `panen_aktual` memakai R-6, dan `catat_kematian` memakai aturan baru R-7.
- Tambahkan aturan awal “Catat kematian ikan” sebesar 5 poin dengan batas 1 kali/hari; nilai ini dapat disesuaikan pengelola. Batas R-4 adalah satu kuota bersama untuk semua jenis perawatan pet.
- Aturan nonaktif atau batas harian yang telah tercapai berarti aktivitas tersebut tidak memberi poin maupun EXP. Catatan aktivitas yang benar-benar tersimpan tetap dapat memperbarui status misi.
- Pertahankan XP, level, tahap, dan ambang progres yang sudah tersimpan. Terapkan EXP baru melalui fungsi kenaikan level yang sama agar sisa XP, ambang berikutnya, dan tahap tetap konsisten. Aksi pakan/bersihkan/rawat tidak boleh menggandakan EXP melalui algoritme peningkatan kondisi lama.
- Saldo poin dan badge lama tidak dikurangi atau dihitung ulang. Perubahan hanya berlaku pada reward baru.

### Pencatatan idempoten

Simpan satu state `pondActivityEvents` sebagai sumber status misi dan audit reward. Setiap event berisi ID pengguna, tanggal lokal, kode aktivitas, area/kolam, ID sumber yang stabil, waktu pencatatan, aturan poin, jumlah poin/EXP yang diberikan, dan ID pet penerima EXP. Event aktivitas valid tetap disimpan meskipun batas harian tercapai atau tidak ada pet di kolam; nilai reward-nya nol bila tidak berhak.

Periksa ID sumber sebelum membuat reward. Pengiriman ulang event yang sama tidak boleh memberi reward kedua. Catatan kematian memakai kunci sumber `areaId + tanggal` agar edit catatan harian menggunakan event yang sama. Penghitung batas harian dihitung dari event/reward per aturan, bukan dari `ledger` tampilan yang dibatasi 60 baris. Aktivitas bertanggal lampau atau gagal validasi tidak menerima reward. Tidak ada pengurangan reward historis secara retroaktif.

### Misi dan tampilan

- Ganti centang manual dengan status misi harian yang diturunkan dari `pondActivityEvents`.
- Misi awal: “Cek pH, suhu & TDS pagi” selesai oleh catatan pemantauan manual dengan sedikitnya dua parameter; “Beri pakan virtual pet” selesai oleh aksi pakan; misi HPP dan chatbot dihapus sebagai misi reward dan diganti “Bersihkan/rawat pet” yang selesai oleh aksi bersih atau rawat. Catatan kematian dan panen tetap memperoleh reward saat terjadi, tetapi bukan kewajiban harian.
- Misi hanya mencerminkan aktivitas yang benar-benar disimpan; tidak memberi bonus poin kedua. Catatan event tetap dapat menyelesaikan misi sekalipun batas poin/EXP untuk hari itu telah tercapai.
- Kartu saldo, badge, dan papan peringkat tetap menggunakan saldo poin akun.
- V-Pet menampilkan EXP aktivitas di progres dan riwayat pet; pesan reward membedakan poin akun dari EXP pet.
- Perubahan UI dibatasi pada halaman Gamifikasi dan V-Pet yang diperlukan untuk memperlihatkan status baru. Tampilan statistik sensor tidak diubah.

## Alur data

Form atau aksi manual di halaman area/V-Pet memanggil satu aksi domain di `SmartStore`. Aksi tersebut memvalidasi pengguna, area kolam, dan ID sumber; mencatat aktivitas; memeriksa aturan serta batas harian; lalu, bila layak, memperbarui saldo poin dan EXP pet secara konsisten. Misi membaca aktivitas tersimpan yang sama. Pembaruan telemetri sensor tidak melewati jalur reward ini.

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

1. Catatan pemantauan manual yang valid memberi poin dan EXP sesuai aturan aktif serta batas harian.
2. Catatan kematian baru dapat memberi reward sekali; perubahan catatan pada tanggal yang sama tidak membayar ulang.
3. Panen aktual hari ini memberi reward; panen bertanggal lampau tidak.
4. Pakan, bersih, dan rawat hanya memberi reward untuk pet di kolam yang dapat diakses; pet pada kolam yang sama bertambah 10 EXP.
5. Growbed/tandon, pet tanpa kolam, HPP, chatbot, bermain, centang manual, dan telemetri otomatis tidak memberi EXP atau poin otomatis.
6. Batas harian per pengguna/aktivitas diterapkan meskipun ledger tampilan sudah dibatasi; aksi berulang dengan ID sumber yang sama tidak dihitung dua kali.
7. Level-up berulang dalam satu aksi mempertahankan sisa EXP, ambang berikutnya, dan tahap yang benar.
8. Misi menampilkan status berdasarkan catatan aktivitas, tanpa centang manual atau bonus ganda.
9. Data lama, saldo poin, level, dan XP tetap utuh setelah state dimuat ulang.
10. Tes unit/integrasi dan browser membuktikan skenario positif, batas harian, akses area, duplikasi/koreksi, tanggal lampau, serta bahwa jalur sensor tidak berubah.
