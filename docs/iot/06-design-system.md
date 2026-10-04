# Design System: IoT System (turunan Lumina Aqua)

| Atribut | Isi |
| --- | --- |
| Status | Draft v0.1 |
| Sumber kebenaran | `DESIGN.md`, `tailwind.config.js`, `src/index.css`, `src/components/ui.jsx` |
| Cakupan | Token yang sudah ada + komponen baru yang dibutuhkan halaman IoT |

Dokumen ini tidak membuat arah visual baru. Semua token diambil dari kode yang sudah ada. Komponen baru dirakit dari komponen `ui.jsx` yang sudah ada, supaya halaman IoT terlihat satu aplikasi dengan halaman lain. Tiga baris bertanda **[PERLU KONFIRMASI PEMILIK]** di `DESIGN.md` tetap berlaku dan belum dijawab.

## 1. Dial

| Dial | Nilai | Akibatnya di halaman IoT |
| --- | --- | --- |
| ENERGY | 1 | Tidak ada hero, ilustrasi, atau gradien baru. Fokus layar adalah angka sensor |
| RHYTHM | 2 | Pola tetap: ringkasan di atas, lalu daftar/tabel. Satu penekanan per layar, misalnya kartu sensor yang di luar ambang |
| MOTION | 1 | Hanya transisi hover 200 ms dan satu indikator "Live". Angka yang berubah tidak dianimasikan |

## 2. Token

### 2.1 Warna

Token semantik di `index.css` (triplet RGB di `:root` dan `.dark`) wajib dipakai lewat kelas Tailwind. Hex statis tidak boleh dipakai untuk teks atau permukaan, karena merusak mode gelap (sudah dicatat di `tailwind.config.js`).

| Peran | Kelas Tailwind | Dipakai di IoT untuk |
| --- | --- | --- |
| Permukaan kartu | `glass-card` (komponen `Card`) | Kartu device, kartu sensor |
| Teks utama | `text-on-surface` | Nilai sensor, nama device |
| Teks pendukung | `text-on-surface-variant` | Satuan, waktu ukur, label kecil |
| Garis | `border-outline-variant/40` | Pemisah baris tabel |
| Brand | `bg-primary`, `text-primary` | Tombol utama, tab aktif, garis rata-rata di grafik |
| Status | Tone `Badge`: `ok`, `warn`, `bad`, `info`, `muted`, `brand` | Status koneksi dan state ambang |

Tidak ada warna baru untuk IoT. Warna per jenis sensor tidak dibuat, karena sensor dibedakan lewat label dan ikon. Ini sejalan dengan batas palet 2 sampai 3 warna inti + 1 aksen.

### 2.2 Tipografi

| Peran | Kelas | Contoh di IoT |
| --- | --- | --- |
| Judul halaman | `font-headline text-headline-md` | "Monitoring" |
| Nilai sensor besar | `font-headline text-2xl font-extrabold` (sama dengan `StatCard`) | `7,02` |
| Nilai sensor di tabel | `text-sm font-semibold tabular-nums` | `612 ppm` |
| Label kecil | `text-[11px] font-bold uppercase tracking-wider` | Hanya untuk label kolom dan eyebrow, sesuai `DESIGN.md` |
| Kode teknis | `font-mono text-[13px]` | `AQ-PKT-001`, potongan secret key |

Tambahan untuk IoT: semua angka sensor memakai `tabular-nums`, supaya digit tidak bergeser saat nilai berubah lewat update live. Angka ditulis dengan koma desimal (format `id-ID`), dan jumlah desimal mengikuti `sensor_types.decimals`.

### 2.3 Ukuran, radius, bayangan

Dipakai apa adanya dari `ui.jsx` dan `DESIGN.md`:

- Tinggi kontrol: `sm` 32 px, `md` 40 px (bawaan), `lg` 44 px (aksi utama, dan wajib di halaman `/d/:code`).
- Radius: kartu `rounded-2xl`, kontrol `rounded-xl`, badge dan chip `rounded-full`.
- Bayangan: `shadow-glass` dan `shadow-glass-elevated` hanya untuk elevasi. Modal secret key memakai `glass-panel`.

## 3. Komponen yang sudah ada

| Komponen (`ui.jsx`) | Dipakai di IoT untuk |
| --- | --- |
| `Card` | Kartu device, panel grafik, panel kejadian |
| `SectionTitle` | Kepala setiap bagian |
| `StatCard` | Ringkasan jumlah device per status |
| `Badge` + `STATUS_TONE` | Status koneksi, state ambang, jenis tipe |
| `Button`, `IconButton` | Semua aksi |
| `Field`, `Input`, `NumberInput`, `Select`, `TextArea` | Form tipe, sensor, device, ambang |
| `Empty` | State kosong |
| `Modal` | Form, secret key, konfirmasi |
| `Table`, `AksiBaris` | Tabel Kelola IoT, tabel per sensor, daftar key |
| `Bar` | Posisi nilai terhadap rentang ambang |

`STATUS_LABEL` dan `STATUS_TONE` diperluas dengan status `stale` ("Data tertunda", tone `warn`), lihat [UI/UX bagian 6](05-ux-design.md#6-status-dan-teks).

## 4. Komponen baru

Semua komponen baru ditaruh di `src/components/iot/`, dirakit dari komponen di atas, dan wajib berfungsi di mode terang maupun gelap.

### 4.1 `SensorValue`

Menampilkan satu nilai sensor beserta konteksnya.

```
┌───────────────────────────┐
│ PH AIR            ● Normal│  label kecil + Badge state
│ 7,02 pH                   │  angka besar tabular-nums + satuan
│ ▕▔▔▔▔▔▔▔▔▔|▔▔▔▔▔▔▔▔▏      │  Bar posisi di rentang ambang
│ 6,5 sampai 7,5 · area     │  ambang + sumbernya
│ Diukur 12 detik lalu      │  waktu relatif, <time datetime>
└───────────────────────────┘
```

| Prop | Tipe | Catatan |
| --- | --- | --- |
| `sensor` | `{ code, name, unit, decimals }` | Dari `sensor_types` |
| `value` | `number \| null` | `null` ditampilkan sebagai tanda strip (-) dengan teks "Belum ada data" |
| `state` | `normal \| low \| high \| unknown` | Menentukan Badge |
| `threshold` | `{ low, high, source }` | Opsional |
| `measuredAt` | ISO string | Lewat 90 detik berarti teks waktu ikut bertone `warn` |
| `size` | `md \| lg` | `lg` untuk IoT satuan |

### 4.2 `ConnectionBadge`

`Badge` dengan ikon dan label dari tabel status koneksi. Dipakai di kartu device, tabel, dan kepala detail. Tidak pernah tampil sebagai titik warna tanpa teks.

### 4.3 `DeviceTypeBadge`

`Badge` tone `muted` dengan ikon `sensors` untuk Satuan atau `deployed_code` untuk Paket, diikuti kode tipe.

### 4.4 `ReadingChart`

Grafik riwayat satu sensor memakai `react-chartjs-2` (sudah ada di `package.json`).

| Elemen | Gaya |
| --- | --- |
| Garis rata-rata | Warna `primary` (`#0f5238`) di mode terang, `primary-fixed-dim` (`#95d4b3`) di mode gelap, ketebalan 2 px, tanpa titik |
| Pita min-max | Warna garis yang sama dengan opacity 12% |
| Garis ambang | Putus-putus 1 px, warna amber yang sama dengan tone `warn` |
| Grid | `outline-variant` opacity 40% |
| Tooltip | Waktu lengkap + avg, min, maks dengan satuan |
| Animasi | Dimatikan (`animation: false`), sesuai MOTION 1 |

Di bawah grafik wajib ada ringkasan teks: nilai terakhir, min, dan maks pada rentang yang dipilih.

### 4.5 `Sparkline`

Versi kecil `ReadingChart` (tinggi 32 px, tanpa sumbu, tanpa tooltip) untuk kartu paket di Monitoring. Wajib punya `aria-label` berisi ringkasan, misalnya "pH 24 jam: min 6,8, maks 7,2".

### 4.6 `EventList`

Daftar kejadian. Setiap baris berisi ikon jenis kejadian, kode device, teks kejadian ("pH di bawah ambang: 6,1"), dan waktu. Baris `threshold_clear` dan `online` memakai tone `ok`, sisanya `warn` atau `bad`.

### 4.7 `SecretReveal`

Blok untuk secret yang hanya tampil sekali (API key, credential device, kode aktivasi).

- Teks `font-mono`, bisa dipilih seluruhnya dengan satu klik.
- Tombol Salin dengan umpan balik teks "Tersalin", bukan hanya perubahan ikon.
- Peringatan tetap terlihat: "Tidak akan ditampilkan lagi."

### 4.8 `QrLabel`

Tata letak label QR siap cetak, dibangun dari `QrCode.jsx` yang sudah ada. Isinya QR, kode alat dengan huruf besar, nama tipe, dan teks "Scan untuk klaim". Disiapkan untuk ukuran stiker 50 × 30 mm (usulan, sesuaikan dengan stiker yang dibeli). Cetak lewat `window.print()` dengan stylesheet `@media print` khusus.

### 4.9 `LiveIndicator`

Teks "Live" dengan ikon `sensors` saat SSE tersambung, atau "Diperbarui tiap 30 detik" saat memakai polling. Saat putus, teksnya menjadi "Menyambung ulang..." dengan tone `warn`. Ini satu-satunya indikator aktivitas di halaman (sesuai MOTION 1). Tidak memakai animasi berdenyut.

## 5. Aturan pakai

| Lakukan | Hindari |
| --- | --- |
| Tulis status sebagai teks + ikon + warna | Titik warna saja |
| Tampilkan waktu ukur di samping setiap nilai | Nilai tanpa keterangan waktu |
| Pakai `tabular-nums` untuk angka sensor | Font angka proporsional yang membuat angka bergeser |
| Satu penekanan per layar (misalnya kartu yang di luar ambang) | Banyak kartu dengan warna mencolok sekaligus |
| Pakai token semantik (`text-on-surface`, dst.) | Hex statis untuk teks atau permukaan |
| Matikan animasi grafik | Animasi masuk, berdenyut, atau berulang |
| Pakai ikon Material Symbols yang relevan (`water_ph`, `thermostat`, `water_ec` kalau tersedia di set) | Ikon dekoratif tanpa makna |

## 6. Checklist sebelum PR halaman IoT

- [ ] Semua state (loading, kosong, error, berisi) ada dan sudah dicoba
- [ ] Mode terang dan gelap sudah dicek
- [ ] Lebar 360 px, 841 px, dan desktop tidak memunculkan scroll horizontal
- [ ] Semua aksi bisa dijalankan dengan keyboard, fokus terlihat
- [ ] Tidak ada em dash di teks UI
- [ ] Tidak ada angka atau data contoh yang tampil saat backend mati
