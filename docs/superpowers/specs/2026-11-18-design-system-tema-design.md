# Design System JagoFarm: lima tema dan fitur ganti tema

| Atribut | Isi |
| --- | --- |
| Status | Disetujui arahnya oleh pemilik (2026-11-18), siap dirakit di Claude Design |
| Menggantikan | `DESIGN.md` (Lumina Aqua) dan `docs/iot/06-design-system.md` bagian token |
| Sumber token | `tokens.json` di artifact Claude Design "JagoFarm Design System" (dibuat dari skrip, 39 token warna × 10 palet) |
| Mockup acuan | `C:\TA\mockup-arah-visual\*.png` (A asli = `A-catatan-lapangan.png`, D revisi = `D-gabungan-b-c-v2-berwarna.png`) |

## 1. Latar dan tujuan

Tampilan sekarang meniru project lain yang seluruhnya dibuat Gemini (Google AI Studio) tanpa design system. Akibatnya: 288 kelas warna Tailwind mentah, 15 ukuran huruf arbitrer, 30 banner peringatan ditulis ulang per halaman, tiga sistem gaya yang tidak saling kenal (Tailwind, kelas `.glass-*`, `pilot.css`), dan kesan "template AI" (kaca, gradien, glow, label kapital di mana-mana, 4 kartu statistik di tiap halaman).

Tujuan:

1. Satu design system yang jadi sumber kebenaran tunggal untuk seluruh halaman.
2. Pengguna bisa memilih sendiri satu dari lima tema, masing-masing dengan mode terang dan gelap.
3. Tampilan profesional bertema alam (akuaponik: ikan + sayur dalam satu siklus air), tanpa ciri desain buatan AI, kecuali pada tema Lumina yang memang sengaja mempertahankan gaya itu sebagai pembanding.

Non-tujuan: mengubah alur bisnis, API, atau data; merombak karakter GIF V-Pet; membuat tata letak berbeda per tema; menyentuh UI `/pilot` (dibahas terpisah setelah aplikasi utama selesai).

Anti-tujuan (gagal walau secara teknis jalan): angka tanpa sumber data, status yang hanya dibedakan warna, tema yang membuat teks tidak terbaca, kilatan tema salah saat halaman dimuat.

## 2. Keputusan yang sudah diambil pemilik

| Keputusan | Pilihan |
| --- | --- |
| Tata letak antar tema | **Sama untuk semua tema.** Tema hanya mengganti token (warna, huruf, radius) dan perlakuan permukaan. Tanah & Lumut memakai sidebar, bukan navigasi atas seperti di mockup. |
| Tema E | Ikut sebagai tema **Lumina**, **visual saja**: gradien, kaca, glow, sudut bulat. Tanpa angka karangan, tanpa emoji, tanpa label kapital di atas judul, tanpa deskripsi di bawah menu. |
| Mode gelap | **Setiap tema** punya terang dan gelap (10 palet). Mode dipilih terpisah dari tema. |
| Cakupan desain halaman | **24 halaman × 5 tema** di Claude Design. |
| Catatan Lapangan | Memakai desain **asli** (belum direvisi): sidebar sewarna kertas, area tanpa warna. |
| Kebun Air | Memakai desain **revisi berwarna**: kepala kartu berwarna per area. Ini tema bawaan. |

## 3. Pendekatan yang dipertimbangkan

| Pendekatan | Untung | Rugi | Status |
| --- | --- | --- | --- |
| **Tema = token + perlakuan permukaan, tata letak tetap** | Satu set komponen dan halaman; ganti tema hanya mengganti atribut di `<html>`; mudah diuji | Kekhasan tema terbatas pada warna, huruf, radius, permukaan, varian SensorReading | **Dipilih** |
| Tata letak ikut tema (C navigasi atas, A daftar baris penuh) | Tiap tema lebih khas | Setiap halaman 2-3 versi; menu pengelola (8+) tidak muat di navigasi atas | Ditolak |
| Satu tema saja, tanpa fitur ganti tema | Paling sederhana | Bertentangan dengan permintaan pemilik | Ditolak |

## 4. Arsitektur tema (untuk implementasi)

- `<html data-theme="kebun-air" data-mode="light">`. Lima nilai tema: `kebun-air`, `catatan-lapangan`, `panel-instrumen`, `tanah-lumut`, `lumina`. Mode: `light` atau `dark`, dihitung dari pilihan pengguna `terang | gelap | sistem`.
- Setiap token warna jadi CSS variable triplet RGB (`--c-surface: 255 253 248`) supaya modifier opacity Tailwind tetap jalan. Nilai dari `tokens.json`, dihasilkan ke `src/app/styles/themes.css` oleh skrip (bukan ditulis tangan).
- Token non-warna per tema: `--font-head`, `--font-body`, `--font-num`, `--radius-card`, `--radius-control`, `--radius-pill`. Disetel per `[data-theme]`.
- Perlakuan permukaan khusus tema (kaca dan gradien Lumina, varian baris Catatan Lapangan, kepala kartu berwarna Kebun Air) ditulis sebagai aturan CSS di bawah `[data-theme="…"]`, bukan sebagai kelas `dark:`/kondisi di JSX.
- Tidak ada kelas warna Tailwind mentah (`text-red-600`, `bg-emerald-50`, …) di JSX. Semua lewat token semantik.
- Ikon: `lucide-react` (ISC, SVG inline, tree-shaken). Menggantikan font Material Symbols, sehingga teks nama ikon tidak bocor sebelum font dimuat.
- Huruf di-host sendiri lewat Fontsource (`@fontsource-variable/plus-jakarta-sans`, `source-sans-3`, `fraunces`, `inter`, `@fontsource/jetbrains-mono`). Hanya huruf tema aktif yang dimuat (impor dinamis per tema).

## 5. Lima tema

| | Kebun Air (bawaan) | Catatan Lapangan | Panel Instrumen | Tanah & Lumut | Lumina |
| --- | --- | --- | --- | --- | --- |
| Asal mockup | D revisi | A asli | B | C | E (visual saja) |
| Karakter | Tanah krem + hijau lumut + biru air; data jelas, hangat | Buku catatan lapangan: kertas, garis tipis, tenang | Panel instrumen: olive dingin, teknis | Krem tanah, lumut, terakota; paling hangat | Gaya "default AI": gradien, kaca, glow |
| Judul | Plus Jakarta Sans 700 | Fraunces 600 (serif, hanya judul) | Source Sans 3 700 | Plus Jakarta Sans 700 | Inter 800, teks gradien hijau ke sian |
| Isi | Plus Jakarta Sans | Source Sans 3 | Source Sans 3 | Plus Jakarta Sans | Inter |
| Angka & kode alat | JetBrains Mono | Source Sans 3 (tabular) | JetBrains Mono | Plus Jakarta Sans (tabular) | Inter (tabular) |
| Radius kartu / kontrol | 8 / 8 px | 4 / 4 px | 6 / 6 px | 10 / 10 px | 20 px / pill |
| Sidebar | Hutan pekat `side-bg` | Sewarna kertas (`side-bg` = `bg`) | Olive gelap pekat | Lumut pekat | Gradien hijau tua, mengambang, sudut 24 px |
| Bayangan | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Bayangan hijau lembut + glow tombol utama |
| SensorReading | Petak, **kepala berwarna per area** + ikon dalam chip | **Baris** daftar seperti log | Petak polos | Petak polos, ikon area berwarna `primary` | Petak kaca, ikon dalam chip bergradien |
| Warna area (water/leaf) | Ya | Tidak (token area = netral) | Tidak | Hanya ikon | Ya |
| Panel samping | Kepala panel berwarna area | Tanpa kotak, garis kiri | Kotak polos | Kotak polos | Kaca |

Lumina, rincian perlakuan:

- Latar halaman: `linear-gradient(135deg, bg, water-bg 55%, leaf-bg)`; gelap: `radial-gradient(circle at 20% 0%, leaf-line, bg 55%)`.
- Kartu: `surface` dengan opacity 62% + `backdrop-filter: blur(16px) saturate(160%)` + bayangan `0 8px 32px -4px` hijau 18%.
- Tombol utama: gradien `primary` ke `info-fg`, pill, glow `0 4px 20px` hijau 45%.
- Keping status: pill, huruf kapital, tracking 0.06em, garis `currentColor`.
- `primary` sengaja digelapkan ke `#047857` (asli mockup `#10b981` hanya 2,5:1 dengan teks putih). Garis grafik dan fokus `#059669` (3,8:1).
- Titik berdenyut hanya di `LiveIndicator` dan mati saat `prefers-reduced-motion`.

## 6. Warna semantik

- **Biru air (`water-*`)** = area kolam ikan dan tandon. **Hijau daun (`leaf-*`)** = growbed/tanaman. Warna menandai area, bukan hiasan. Grafik TDS growbed memakai warna daun, bukan air.
- **`warn-*`** = di luar batas atau perlu perhatian. **`bad-*`** = galat, alat terputus, aksi hapus. **`info-*`** = perawatan, data tertunda, petunjuk. **`ok-*`** = normal, terhubung.
- Status **selalu** teks + ikon + warna. Tidak ada titik warna tanpa teks.
- Satu penekanan per layar: biasanya Alert ringkasan di atas (contoh: "1 parameter perlu dicek…").
- Semua pasangan teks utama sudah dicek ≥ 4,5:1 di kesepuluh palet; grafik dan fokus ≥ 3:1.

## 7. Tipografi

| Peran | Ukuran / tinggi baris | Catatan |
| --- | --- | --- |
| Judul halaman | 26/32 (Catatan Lapangan 30/35, Lumina 30/36) | Satu per halaman, `text-wrap: balance` |
| Judul bagian / area | 19/26 | |
| Judul kartu / panel | 16/22 | |
| Isi | 15/22 | Minimal 14 px untuk teks yang harus dibaca |
| Kecil | 14/20 | Subjudul, meta |
| Keterangan | 12/16 | Hanya untuk label rentang, waktu ukur; tidak pernah 9-11 px |
| Nilai sensor besar | 26-32 | `font-num`, `tabular-nums` |
| Kode alat | 12-13 | `font-mono` (atau `font-num`) |

Angka memakai format `id-ID` (koma desimal, titik ribuan), desimal sesuai `sensor_types.decimals`. Label huruf kapital hanya untuk kepala kolom tabel; tidak dipakai sebagai eyebrow di atas judul.

## 8. Komponen

| Komponen | Varian / status | Catatan |
| --- | --- | --- |
| AppShell | Sidebar + konten; laci di < 720 px | Lebar sidebar 232 px |
| Sidebar | Grup menu, menu aktif, info akun, poin | Tanpa deskripsi di bawah tiap menu |
| TopBar | Judul halaman, aksi halaman, tombol tema cepat | Tanpa label "Mode Pengguna" |
| PageHeader | Judul + satu baris subjudul + aksi | Tanpa eyebrow |
| Button | primary, secondary, danger, ghost; sm 32, md 40, lg 44 px | Panah hanya untuk aksi yang memang berpindah halaman |
| IconButton | sm/md/lg | Wajib `aria-label` |
| StatusPill | ok, warn, bad, info, muted | Ikon + teks |
| Alert | warn, bad, info, ok; dengan aksi opsional | Menggantikan ±30 banner buatan tangan |
| Card / Panel | default; Kebun Air: kepala berwarna | |
| AreaSection | water, leaf, neutral | Judul area + ikon ikan/kecambah/tetes |
| SensorReading | tile, row; normal, low, high, stale, no-data | Nilai + satuan + RangeBar + waktu ukur |
| RangeBar | normal, di luar batas | Pita ideal + penanda nilai |
| ReadingChart | line + garis ambang putus-putus + ringkasan min/maks | Tanpa animasi |
| Sparkline | 32 px | `aria-label` berisi ringkasan |
| Table | default; berubah jadi kartu < 720 px | Kepala kolom huruf kapital kecil |
| Tabs | | Pengganti tab buatan tangan di Monitoring dan Kelola IoT |
| FilterChip | aktif/tidak | Pengganti chip di 4 halaman admin |
| Field, Input, Select, TextArea, Checkbox, Switch | default, fokus, galat, nonaktif | Label di atas, petunjuk di bawah |
| Modal | default, lebar | Kunci fokus, Esc menutup |
| EmptyState | first-run, hasil filter kosong, tanpa izin | Sebab + satu aksi |
| Loading | teks "Memuat …" + skeleton seperlunya | |
| TaskList | selesai/belum | |
| Avatar | inisial di atas warna | |
| Metric | hanya untuk angka yang dihitung dari data | Maksimal satu baris per halaman |
| ThemePicker | 5 kartu pratinjau (mini sidebar + petak sensor) | `role="radiogroup"` |
| ModeToggle | Terang / Gelap / Ikuti sistem | Segmented control |
| LiveIndicator | live, polling, menyambung ulang | |
| QrLabel, SecretReveal | | Dari spesifikasi IoT yang sudah ada |

## 9. Fitur ganti tema

- **Tempat:** halaman Profil, bagian "Tampilan" (ThemePicker + ModeToggle). Tombol tema cepat di TopBar membuka popover kecil yang sama.
- **Bawaan:** Kebun Air, mode Ikuti sistem.
- **Simpan:** `localStorage` kunci `jagofarm.tampilan` → `{ "tema": "kebun-air", "mode": "sistem" }`. Dibaca dalam `try/catch`; kalau gagal, pakai bawaan.
- **Tanpa kilatan:** skrip inline kecil di `index.html` menyetel `data-theme`/`data-mode` sebelum React dimuat.
- **Aksesibilitas:** radiogroup dengan panah kiri/kanan; setiap kartu pratinjau punya nama tema + deskripsi satu baris; perubahan langsung terlihat tanpa muat ulang.
- **Halaman publik** (`/masuk`, `/daftar`, `/d/:code`) mengikuti pilihan tersimpan di perangkat itu.

## 10. Inventaris halaman (24)

| Rute | Halaman | Tugas utama layar |
| --- | --- | --- |
| `/masuk` | Masuk | Masuk cepat; tanda jelas bahwa data demo adalah contoh |
| `/daftar` | Daftar | Membuat akun pengguna lapangan |
| `/d/:code` | Klaim alat (QR) | Halaman publik, mobile dulu, target sentuh 44 px; klaim alat ke area |
| `/` | Pantauan | Apakah ada yang salah sekarang? Alert ringkasan → area → sensor → grafik → tugas |
| `/iot` | Daftar alat | Cari alat yang terputus/tertunda; filter status & area |
| `/iot/:id` | Detail alat | Nilai sekarang, grafik, kejadian, info alat, QR |
| `/iot/:id/log` | Log sensor | Tabel log mentah, rentang waktu, ekspor Excel |
| `/monitoring` | Monitoring | Tab per paket / per sensor / per area, grafik perbandingan, kejadian |
| `/detail-informasi` | Pindai QR | Pemindai kamera + penjelasan alat |
| `/area` | Area & kolam | Daftar area (kolam, growbed, tandon) dengan status & HPP |
| `/area/:id` | Detail area | Populasi ikan, biaya/HPP, sensor terpasang |
| `/v-pet` | V-Pet | Karakter GIF, kebutuhan, misi harian |
| `/gamifikasi` | Misi & poin | Misi, badge, peringkat |
| `/chatbot` | Chatbot akuaponik | Tanya jawab, saran pertanyaan |
| `/profil` | Profil & tampilan | Data akun, **ThemePicker**, keluar |
| `/developer` | Developer (mitra) | API key, sandbox, contoh ingest |
| `/admin` | Dashboard pengelola | Yang perlu ditangani: alat terputus, di luar batas, belum ditempatkan |
| `/admin/pengguna` | Kelola pengguna | Tabel, peran, filter, form modal |
| `/admin/iot` | Kelola IoT | Tab, provisioning, cetak QR, kunci |
| `/admin/kategori` | Kategori alat | Jenis alat & parameter ukur |
| `/admin/detail-informasi` | Detail informasi | Editor penjelasan alat yang dibaca pengguna |
| `/admin/area` | Kelola area | Area yang sudah dipasangi alat |
| `/admin/v-pet` | Kelola V-Pet | Jenis pet, kondisi, reset |
| `/admin/point` | Sistem poin | Aturan poin & badge |

Setiap halaman didesain dengan data contoh yang ditandai "Data contoh", dalam kelima tema (mode terang), ditambah mode gelap untuk tema bawaan.

## 11. Aturan anti-slop (berlaku di semua tema kecuali pengecualian visual Lumina)

- Tanpa gradien, kaca, glow, atau bayangan dekoratif.
- Tanpa emoji di UI. Tanpa eyebrow huruf kapital di atas judul. Tanpa deskripsi di bawah setiap menu.
- Tanpa angka, delta, atau persentase yang tidak dihitung dari data.
- Tanpa baris 4 kartu statistik sebagai pembuka default; Metric hanya bila angkanya inti halaman.
- Tanpa ikon dekoratif di setiap kartu; ikon hanya bila membawa makna (jenis sensor, jenis area, status).
- Kosong/memuat/galat selalu menyebut sebab dan langkah berikutnya.
- Lumina dikecualikan hanya untuk: gradien latar & judul, kaca, glow tombol utama, radius besar, keping pill kapital.

## 12. Checklist sebelum halaman dianggap selesai

- [ ] Hanya token semantik, tidak ada hex atau kelas warna Tailwind mentah di JSX
- [ ] Lolos di kelima tema dan kedua mode
- [ ] Lebar 360 px, 841 px (layar 150 %), dan desktop tanpa scroll horizontal
- [ ] Semua aksi bisa dengan keyboard, fokus terlihat
- [ ] Status selalu teks + ikon
- [ ] Kosong, memuat, galat, dan berisi sudah ada
- [ ] Tidak ada em dash di teks UI
