# DESIGN.md — JagoFarm SmartDashboard (AquaSmartponik)

> Berkas ini ditulis untuk memenuhi R-37 antislop: arah desain harus tertulis,
> bukan hanya tersirat di dalam kode. Isinya **ditranskrip dari keputusan yang
> sudah ada** di proyek ini (tema, palet, tipografi, dan perilaku yang sudah
> dijalankan) supaya ada satu tempat rujukan. Tiga baris yang bertanda
> **[PERLU KONFIRMASI PEMILIK]** adalah tebakan saya dari apa yang terlihat;
> ganti dengan kalimat Anda sendiri.

## Identitas

- Produk: SmartDashboard Aquaponik untuk peternakan aquaponik skala kecil.
- Pemilik arah: JagoFarm (proyek TA). Tema yang dipakai: "Lumina Aqua".
- Sifat yang dituju: tenang, rapi, dan mudah dipindai cepat di lapangan.
  Bukan produk yang ingin terlihat "teknologi masa depan".
  **[PERLU KONFIRMASI PEMILIK]**

## Pengguna dan konteks pakai

- Dua peran: pengguna lapangan (operator kolam/growbed/tandon) dan pengelola
  (pemilik seluruh farm). Satu aplikasi, dua menu.
- Konteks: dibuka di laptop/desktop, sering di luar ruangan pada siang hari,
  layar Windows dengan skala 150% (lebar CSS efektif 841 px). Karena itu
  kontras dan ukuran target sentuh diutamakan dibanding kepadatan data.

## Palet

| Peran | Nilai | Dipakai untuk |
| --- | --- | --- |
| Utama | `#0f5238` (hijau tua) | tombol utama, aksen teks, ikon aktif |
| Utama terang | `#95d4b3`, `#b1f0ce` | aksen teks di mode gelap, indikator fokus sidebar |
| Aksen status | `#b45309` / amber | peringatan, ambang keluar, ikan mati |
| Bahaya | `#dc2626` → ditimpa di mode gelap | galat, tombol hapus |
| Netral | `#f8fafb` (permukaan), `#d9e3e9` (latar terang), `#e5e7eb` (garis) | permukaan kartu, latar, pemisah |

- Latar memakai gradien lembut dua tingkat (`#e7eef2 → #d9e3e9 → #c4d3db` di
  mode terang) dengan **satu alasan**: memisahkan bidang kartu dari latar.
  Kartu putih di atas latar lebih teduh menghasilkan pemisahan 1.21:1,
  sedangkan latar hampir putih membuat kartu menyatu (1.07:1).
- Mode gelap memakai gradien hijau-hitam (`#131715 → #191c1d → #0d1210`).
- Warna kategori perangkat berasal dari data, tetapi selalu dilewatkan kelas
  `.kat-icon` supaya kontrasnya aman di mode gelap.

## Tipografi

- Judul: **Manrope** (500-800) — dipakai untuk `h1`-`h6` dan angka besar.
- Teks: **Hanken Grotesk** (400-700) — dipakai untuk seluruh isi.
- Alasan: keduanya punya angka yang mudah dibedakan (0 vs O, 1 vs l) karena
  halaman ini penuh angka sensor dan rupiah; ini kebutuhan keterbacaan, bukan
  selera. **[PERLU KONFIRMASI PEMILIK]**
- Ikon: Material Symbols Outlined (sudah satu set, dipakai konsisten).
- Label kecil memakai huruf besar + `tracking-wider`; ini bahasa visual untuk
  "nama kolom/label", dipakai HANYA pada label dan eyebrow, tidak pada isi.

## Bentuk dan permukaan

- Skala radius (aturan di `index.css`): `lg`/`xl` untuk kontrol kecil,
  `2xl` untuk kartu, `full` untuk keping status, `3xl` hanya panel masuk/daftar.
- Skala tinggi kontrol: 24 px chip, 32 px aksi dalam tabel, 40 px bawaan
  (tombol, input, select), 44-88 px untuk kartu pilihan seperti avatar.
- Kaca (glassmorphism) dipakai sebagai aksen pada kartu dan panel
  (`.glass-card`, `.glass-panel`). Kolom isian dan top bar **tidak** memakai
  blur karena tidak ada lapisan apa pun di belakangnya.
- Bayangan menandai elevasi, bukan hiasan: skala tema `shadow-glass` /
  `shadow-glass-elevated`. Sidebar tidak memakai bayangan (sudah dipisahkan
  warnanya sendiri).

## Dial (liveliness)

- **ENERGY 1** — tenang. Aplikasi kerja yang dibuka setiap hari; tidak ada
  elemen yang "menyapa keras".
- **RHYTHM 2** — sebagian besar konsisten, dengan beberapa penekanan: satu
  kartu ringkasan di atas, lalu daftar/tabel.
- **MOTION 1** — hanya transisi hover dan satu indikator aktivitas. Tidak ada
  animasi masuk, tidak ada gerakan berulang.

## Larangan yang berlaku (dari antislop, sudah dijalankan)

- Tidak memakai em dash di teks yang dilihat pengguna.
- Tidak ada foto orang sebagai identitas akun; avatar = inisial pada warna.
- Tidak ada angka, testimoni, atau klaim keamanan yang dibuat-buat. Seluruh
  data demo ditandai jelas sebagai data contoh di halaman masuk, sidebar, dan
  footer.
- Setiap kontrol punya perilaku nyata; tidak ada tombol mati.

## Status data (penting untuk arah berikutnya)

Seluruh data disimpan di `localStorage`. Rencana penyambungan ke backend pilot
(Fastify + PostgreSQL di `server/`) sudah dicatat di `README.md`. Ketika itu
terjadi, arah desain ini yang berlaku: tetap tenang, angka dulu, status selalu
tertulis (bukan hanya warna).
