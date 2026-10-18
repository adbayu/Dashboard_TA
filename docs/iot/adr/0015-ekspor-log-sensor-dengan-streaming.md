# ADR-0015: Ekspor log sensor memakai streaming XLSX di server

Status: Usulan · Tanggal: 15 Oktober 2026

## Konteks

Log raw dapat berisi jauh lebih banyak baris daripada yang layak dimuat sekaligus ke DOM atau memori browser. Pengguna tetap membutuhkan berkas Excel yang bisa dibuka dan diringkas, dengan isi konsisten terhadap total dan statistik yang dihitung server. Ekspor juga harus mengikuti batas ownership dan environment yang berlaku untuk riwayat sensor.

## Keputusan

Sediakan `GET /api/v1/devices/:id/readings/export` dengan scope `readings:read`. Server membentuk workbook dengan `ExcelJS.stream.xlsx.WorkbookWriter`, memeriksa jumlah baris dan menyiapkan ringkasan SQL sebelum byte pertama dikirim, lalu membaca log dari snapshot `REPEATABLE READ READ ONLY` dalam batch keyset sekitar 2000 baris. Workbook memiliki sheet `Log sensor` dan `Ringkasan`; status memakai ambang efektif pada waktu ekspor. Batas jumlah baris, request per actor, dan ekspor aktif mencegah ekspor tidak terkendali.

## Konsekuensi

- Ukuran workbook tidak mengharuskan seluruh data readings atau semua baris Excel berada di memori sekaligus.
- Pengguna mendapat workbook yang berisi log rinci dan ringkasan SQL dari snapshot data yang sama.
- Ekspor memiliki batas jumlah baris, rate, dan concurrency; klien yang terputus membatalkan query bila memungkinkan dan melepaskan koneksi pool.
- Kegagalan sebelum streaming dapat menjadi response API terstruktur. Kegagalan setelah byte XLSX terkirim mengharuskan koneksi dihentikan.
- Nilai status merepresentasikan ambang yang berlaku saat ekspor, bukan perubahan ambang historis.

## Alternatif yang ditolak

- **Membuat workbook di browser dari seluruh baris raw:** membutuhkan pemuatan seluruh data ke klien, menambah penggunaan memori, memperlambat halaman, dan tidak memberi kontrol server yang cukup atas snapshot serta batas ekspor.
