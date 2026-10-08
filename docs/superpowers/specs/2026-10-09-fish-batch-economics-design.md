# Desain Batch Bibit, Pertumbuhan, dan Ekonomi Ikan

Status: desain disetujui pengguna pada 2026-10-09; menunggu tinjauan dokumen tertulis sebelum rencana implementasi.

## Tujuan

Tambahkan pencatatan batch ikan dan perhitungan nilai ekonomi yang dapat ditelusuri ke PostgreSQL: saat kolam ikan aktif dibuat, pengelola mencatat jenis, tanggal tebar, jumlah bibit, dan harga per ekor; pengelola mengelola harga acuan per kg per jenis; pengguna mencatat sampel bobot, mortalitas, dan panen serta melihat lama pembesaran dan hasil ekonomi.

Catatan berlaku per batch/cohort, bukan identitas ikan individual. Tanpa penandaan/tag setiap ikan, sistem tidak dapat menyatakan riwayat seekor ikan tertentu.

## Konteks yang diverifikasi

- `src/pages/admin/AdminAreas.jsx` membuat/mengubah kolam dengan komoditas, populasi, status, dan HPP; belum ada entitas batch.
- `src/pages/AreaDetail.jsx` menerima mortalitas harian per area, item HPP area, dan panen dengan jumlah/satuan/nilai jual manual.
- `src/store/SmartStore.jsx` menerapkan perubahan mortalitas ke populasi memakai delta agar koreksi catatan harian tidak mengurangi populasi dua kali.
- Seed area saat ini memiliki item HPP bibit, misalnya “Benih nila gesit” dan “Benih lele sangkuriang”. Biaya bibit tidak boleh dihitung lagi sebagai HPP setelah dibuat sebagai biaya batch.
- Domain SmartDashboard masih lokal; migrasi PostgreSQL 003 belum diterapkan ke database aktif. Migrasi aktif terakhir yang diverifikasi adalah versi 1.

## Pendekatan yang dipilih

### Batch/cohort per area dan tanggal tebar

Setiap penebaran menjadi batch terpisah dengan area, spesies, tanggal tebar, jumlah awal, dan harga bibit per ekor. Batch memungkinkan dua jenis ikan atau dua tanggal tebar dalam satu area tanpa menyatukan biaya dan waktu pembesaran.

Pendekatan total-area saja lebih sederhana, tetapi tidak dapat membedakan restock, umur, atau mortalitas beberapa batch. Kurva pertumbuhan standar mengurangi input, tetapi memberi nilai bobot dan uang dari asumsi spesies/umur yang belum disepakati. Karena itu sistem meminta sampel bobot aktual dan tidak membuat estimasi biologis dari umur saja.

## Alur pengguna dan aturan domain

### Pembuatan kolam dan penebaran

- Kolam baru berstatus aktif memerlukan batch awal: spesies, tanggal tebar, jumlah bibit (bilangan bulat), dan harga bibit per ekor (rupiah). Form menampilkan biaya bibit total sebagai `jumlah bibit × harga per ekor`.
- Kolam berstatus istirahat boleh dibuat tanpa batch. Penebaran pertama atau restock setelahnya membuat batch baru; batch lama tidak ditimpa.
- Spesies dipilih dari katalog spesies yang sudah dipakai dan dapat ditambahkan sebagai nama spesies baru oleh pengelola. Area tetap dapat menampung beberapa spesies melalui batch berbeda.
- Populasi operasional adalah jumlah ikan hidup pada batch. Penambahan ikan setelah tebar awal selalu membuat batch baru dengan tanggal/jumlah/biaya sendiri. Pengurangan populasi yang tidak dapat dicatat sebagai mortalitas atau panen dibuat sebagai penyesuaian negatif bertanggal dengan alasan oleh pengelola; penyesuaian tidak boleh membuat jumlah hidup negatif.

### Harga spesies

- Pengelola dapat menetapkan harga acuan jual per kg untuk setiap spesies yang dipelihara.
- Perubahan harga membuat baris riwayat dengan tanggal efektif; perubahan baru tidak menulis ulang harga terdahulu. Bila catatan harga yang sudah dipakai perlu dikoreksi, koreksi harus meninggalkan audit dan tidak mengubah snapshot ekonomi yang tersimpan.
- Nilai stok hidup menggunakan harga efektif terbaru. Panen menyimpan snapshot harga aktual per kg dan nilai transaksi; formulir memuat harga acuan yang berlaku sebagai nilai awal, tetapi pengguna dapat memasukkan harga jual nyata bila berbeda.
- Estimasi nilai jual yang tidak jadi diperoleh saat mortalitas menyimpan snapshot bobot sampel dan harga yang dipakai saat catatan dibuat. Perubahan bobot/harga setelahnya tidak mengubah histori estimasi tersebut.
- Harga nol diperbolehkan sebagai nilai nyata; bila harga belum pernah diatur, sistem tidak mengarang nilai uang dan menampilkan bahwa harga belum tersedia.

### Pertumbuhan

- Pengguna yang mendapat akses ke area mencatat tanggal pengukuran, jumlah sampel, dan rata-rata bobot per ikan dalam gram.
- Satu batch hanya memiliki satu sampel per tanggal; koreksi tanggal tersebut memperbarui catatan sampel, bukan menggandakannya.
- Umur pembesaran adalah jumlah hari dari tanggal tebar sampai tanggal sampel, kematian, atau panen.
- Laju pertumbuhan rata-rata antar dua sampel berurutan adalah `(bobot rata-rata baru − bobot rata-rata sebelumnya) / selisih hari`, dalam gram per hari. Nilai negatif dipertahankan sebagai penurunan bobot. Dengan kurang dari dua sampel, laju pertumbuhan tidak ditampilkan.

### Mortalitas dan panen

- Catatan mortalitas baru mengacu ke satu batch dan tanggal; pengguna memilih batch bila ada lebih dari satu batch aktif. Penggantian angka pada tanggal yang sama menerapkan hanya delta terhadap jumlah sebelumnya.
- Jumlah ikan mati tidak boleh melebihi populasi tersisa batch. Panen juga mengurangi jumlah tersisa; koreksi atau retry tidak boleh mengurangi populasi dua kali.
- Panen ikan mencatat jumlah ekor dan berat total aktual dalam kg. Pendapatan aktual adalah `berat kg × harga aktual per kg` yang disimpan sebagai snapshot.
- Catatan mortalitas lama yang hanya memiliki area/tanggal tidak otomatis dibagikan ke batch. Catatan itu tetap menjadi histori area tanpa batch sampai pemetaan eksplisit dilakukan.

## Perhitungan ekonomi

Semua nilai yang belum direalisasi diberi label estimasi. Pendapatan panen yang sudah tercatat adalah aktual.

- Biaya bibit batch: `jumlah awal × harga bibit per ekor`.
- Biaya produksi batch: biaya bibit ditambah item HPP yang secara eksplisit ditautkan ke batch. HPP umum area tetap terlihat di HPP area dan tidak dibagi otomatis ke batch.
- Kerugian langsung kematian: `jumlah mati × harga bibit per ekor`.
- Bila terdapat sampel bobot pada atau sebelum tanggal kematian dan ada harga spesies yang berlaku pada tanggal itu, sistem juga menampilkan estimasi nilai jual bruto yang tidak jadi diperoleh: `jumlah mati × bobot rata-rata gram / 1.000 × harga/kg`. Nilai ini terpisah dari kerugian langsung dan tidak ditambahkan lagi ke perhitungan laba/rugi batch.
- Nilai bruto stok hidup terestimasi: `jumlah hidup × bobot rata-rata sampel terakhir / 1.000 × harga/kg terbaru`. Tanpa sampel atau harga, nilai tidak dihitung.
- Margin sementara batch aktif: pendapatan aktual panen sampai saat ini ditambah estimasi nilai stok hidup, dikurangi biaya bibit dan HPP yang sudah ditautkan. Angka diberi label “estimasi, belum direalisasikan”.
- Laba/rugi aktual setelah jumlah batch tersisa nol dan batch ditutup: total pendapatan panen aktual dikurangi seluruh biaya bibit dan seluruh HPP yang ditautkan ke batch. Bila ikan yang tersisa tidak dipanen, pengelola mencatat pengurangan jumlah bertanggal dan beralasan sebelum menutup batch; penyesuaian ini tetap bukan pendapatan panen. Estimasi nilai ikan hidup dan estimasi nilai kematian tidak dicampur ke hasil aktual.
- Estimasi nilai jual yang tidak jadi diperoleh akibat kematian adalah informasi pembanding, bukan kerugian tunai tambahan; dengan demikian tidak ada penghitungan ganda pada margin batch.

## PostgreSQL dan API

Fitur masuk ke migrasi SmartDashboard 003 yang direncanakan, tanpa mengubah migrasi Pilot 001 atau kontrak IoT 002. Model domain mencakup katalog spesies dan riwayat harga, batch tebar, sampel bobot, mortalitas per batch, panen batch, penyesuaian populasi, serta relasi opsional item HPP ke batch. Semua nilai rupiah disimpan dengan tipe desimal PostgreSQL yang tepat, jumlah ekor sebagai bilangan bulat, dan bobot sebagai nilai desimal gram.

Mutasi batch, mortalitas, panen, dan perubahan populasi dilakukan dalam transaksi. API memperoleh identitas dan role dari sesi; server memeriksa role pengelola atau penugasan area pengguna, validasi batas tanggal/jumlah, dan populasi tersisa. Klien tidak dapat menetapkan aktor, jumlah saldo, atau nilai ekonomi hasil hitung. Pembacaan bootstrap hanya mengirim batch dan harga untuk area yang boleh dilihat aktor.

Endpoint detail dan nama tabel final ditetapkan pada rencana implementasi agar tetap konsisten dengan tabel domain 003 lainnya; kontrak perilaku dan rumus dalam dokumen ini adalah sumber kebenaran.

## Data lama dan pencegahan duplikasi

- Impor localStorage tetap opt-in, memakai preview dan konfirmasi sebagaimana desain PostgreSQL utama.
- Populasi lama tidak menyediakan tanggal tebar, jumlah awal, atau bobot historis yang dapat dipercaya. Sistem tidak merekonstruksi tanggal/pertumbuhan lama dari jumlah populasi saat ini.
- Kolam lama tanpa batch tetap mempertahankan populasi dan histori area. Pengelola dapat memulai batch baseline secara eksplisit dengan tanggal, jumlah, dan harga yang diketahui; catatan mortalitas lama tetap tak tertaut kecuali dipetakan secara sadar.
- HPP lama bertuliskan benih tidak otomatis diduplikasi sebagai biaya bibit batch. Preview impor menampilkan biaya yang perlu dipetakan; biaya tetap tidak tertaut sampai pengelola memilih tindakan eksplisit.
- Tidak ada localStorage yang dihapus otomatis dan tidak ada data Pilot yang direset.

## Antarmuka per role

Pengelola:

- Form tambah kolam aktif memuat spesies, tanggal tebar, jumlah bibit, harga per ekor, dan biaya total otomatis.
- Tampilan area menyediakan riwayat harga/kg per spesies dan form pembaruan dengan tanggal efektif.
- Pengelola dapat menautkan item HPP ke batch atau membiarkannya sebagai biaya umum area, serta mencatat penyesuaian jumlah dengan alasan.

Pengguna:

- Pada area yang ditugaskan, pengguna melihat batch, jumlah hidup, umur, sampel bobot, laju pertumbuhan, mortalitas, estimasi nilai stok hidup, dan hasil panen aktual.
- Pengguna dapat menambah sampel bobot, catatan mortalitas batch, dan panen. Sistem membedakan estimasi dari aktual di label dan angka.
- Bila area mempunyai beberapa batch aktif, tindakan mortalitas/panen/sampel memerlukan pemilihan batch yang sesuai.

Antarmuka memakai komponen dan gaya proyek yang ada; kontrol jumlah, harga, berat, dan waktu tetap dapat diketik manual. Mode audit UI yang dipilih pengguna adalah AFTER: setelah fungsi selesai, temuan antislop dilaporkan sebagai daftar bernomor dan perubahan polish di luar fungsi menunggu persetujuan pengguna.

## Validasi dan kasus tepi

- Tanggal tebar tidak boleh setelah hari ini. Sampel, mortalitas, dan panen harus pada/ setelah tanggal tebar dan tidak boleh berada di masa depan.
- Jumlah awal dan sampel harus bilangan bulat positif; jumlah mati/panen/penyesuaian harus tervalidasi terhadap jumlah hidup. Harga dan bobot harus nonnegatif; rata-rata bobot sampel dan berat panen harus positif.
- Retry request mutasi harus idempotent. Koreksi mortalitas harian menghitung delta; kegagalan transaksi tidak boleh meninggalkan jumlah area dan batch berbeda.
- Harga efektif bertanggal sama per spesies diperbarui, bukan ditumpuk menjadi dua harga yang ambigu.
- Data tanpa harga atau sampel tidak menghasilkan angka uang/nilai biomassa palsu.

## Kriteria penerimaan

1. Kolam aktif baru menyimpan batch awal dan biaya bibit tepat satu kali; kolam istirahat dapat tetap kosong.
2. Restock membuat batch terpisah; lebih dari satu spesies/batch dalam satu area dapat dibedakan.
3. Harga spesies mempunyai histori efektif; update harga tidak mengubah snapshot transaksi panen terdahulu.
4. Dua sampel menghitung laju gram/hari dan umur secara benar; satu sampel tidak menampilkan laju.
5. Mortalitas menerapkan delta sekali, tidak dapat melebihi jumlah hidup, dan menampilkan umur serta kerugian bibit langsung. Nilai bruto kematian hanya tampil bila bobot dan harga historis tersedia serta selalu berlabel estimasi.
6. Panen menyimpan jumlah ekor, berat aktual, harga jual snapshot, dan pendapatan aktual.
7. Margin sementara batch diberi label estimasi; laba/rugi aktual hanya dihitung dari transaksi panen dan biaya batch setelah penutupan, tanpa menghitung ulang estimasi kematian.
8. HPP batch-linked ikut perhitungan; HPP umum area tidak dialokasikan. HPP bibit lama tidak diduplikasi.
9. Pengguna tidak dapat membaca atau menulis batch di luar area tugas; pengelola dapat mengelola harga dan batch sesuai izin.
10. Tes migrasi berjalan di schema terisolasi; database aktif tidak dimigrasikan dalam tahap desain/rencana ini.
11. Build, typecheck, tes API/domain, dan uji alur kedua role lulus. UI diaudit setelah fitur berfungsi; temuan polish tidak diperbaiki tanpa persetujuan.

## Di luar cakupan

- Identitas atau pelacakan individual per ikan.
- Prediksi bobot otomatis dari tabel pertumbuhan standar atau data eksternal pasar.
- Pembagian otomatis HPP umum area ke batch.
- Perubahan kontrak Pilot/IoT atau merge branch `origin/feat/iot-system`.
- Migrasi produksi/live database, penghapusan volume, atau push remote tanpa instruksi terpisah.
