# DESIGN.md: JagoFarm SmartDashboard (AquaSmartponik)

Berkas ini hanya penunjuk. Arah, token, dan aturan desain ada di tempat berikut,
supaya tidak ada dua sumber kebenaran.

## Sumber kebenaran

| Apa | Di mana |
| --- | --- |
| Spec design system (lima tema, mode terang dan gelap, aturan) | `docs/superpowers/specs/2026-11-18-design-system-tema-design.md` |
| Token warna (39 nama x 10 palet) | `design/tokens.json` |
| Pembangkit `themes.css` dari token | `scripts/design/gen-themes.mjs`, jalankan `npm run design:themes` |
| CSS tema hasil bangkitan (jangan disunting tangan) | `src/app/styles/themes.css` |
| Perlakuan permukaan per tema (kaca Lumina, tepi Catatan Lapangan, dan lain-lain) | `src/app/styles/theme-surfaces.css` |
| Komponen bersama | `src/shared/components/ui.jsx` (barrel), `src/shared/components/ui/*` |
| Komponen IoT | `src/components/iot/*` (SensorReading, RangeBar, AreaSection, TaskList, ReadingChart) |
| Ikon | `src/shared/components/Icon.jsx` (lucide, peta nama di `ICON_MAP`) |
| Artifact Design System (acuan visual dan dokumentasi tiap komponen) | artifact "JagoFarm Design System" di Claude Design |

Artifact hanya acuan visual. Fitur dan alur halaman mengikuti aplikasi ini.

## Lima tema

| Id | Nama |
| --- | --- |
| `kebun-air` | Kebun Air (bawaan) |
| `catatan-lapangan` | Catatan Lapangan |
| `panel-instrumen` | Panel Instrumen |
| `tanah-lumut` | Tanah & Lumut |
| `lumina` | Lumina |

Setiap tema punya mode terang dan gelap. Pilihan pengguna disimpan di
`localStorage` pada kunci `jagofarm.tampilan` sebagai
`{ "tema": "kebun-air", "mode": "sistem" }`, dengan mode `terang`, `gelap`, atau
`sistem`. Di DOM, `<html>` membawa `data-theme` dan `data-mode` (`light` atau
`dark`). Skrip kecil di `index.html` menerapkannya sebelum cat pertama; daftar
nilainya dijaga `tests/design/boot-theme.test.mjs`, dan hash skripnya harus sama
dengan yang ada di `deploy/Caddyfile`.

Tata letak sama untuk semua tema. Yang berbeda hanya warna, huruf, radius, dan
perlakuan permukaan.

## Menambah halaman

1. Susun halaman dari komponen bersama. Judul halaman lewat `PageHeader`, yang
   merender satu-satunya `<h1>` (judul top bar adalah `<p>`).
2. Warna hanya lewat token Tailwind (`bg-surface`, `text-text-2`, `border-border`,
   `text-ok-fg`, dan seterusnya). Tidak ada hex, `rgb()`, kelas palet mentah
   (`text-red-600`), `bg-gradient-*`, atau varian `dark:`.
3. Ikon hanya lewat `Icon` atau prop `icon` komponen bersama, dengan nama lucide
   yang ada di `ICON_MAP` (tambahkan namanya di sana bila belum ada). Nama yang
   tidak dikenal tampil sebagai ikon cadangan.
4. Status selalu teks ditambah ikon (`StatusPill`, `Alert`), tidak pernah hanya
   warna. Banner memakai `Alert`, tab memakai `Tabs`, filter memakai `FilterChip`.
5. Halaman IoT memakai `.iot-touch-targets` supaya target sentuh 44 px.
6. Teks antarmuka berbahasa Indonesia, tanpa em dash, tanpa emoji, tanpa label
   huruf kapital di atas judul.
7. Ratchet berjalan otomatis: `tests/design/no-legacy-styles.test.mjs` memindai
   semua `src/**/*.jsx` (kecuali `src/pilot/`) dan gagal bila ada gaya lama. Tidak
   ada daftar yang perlu diperbarui. Jalankan `npm run test:ui` sebelum commit.

## Yang tidak dicakup

- `/pilot` (`src/pilot/`) memakai gayanya sendiri dan di luar design system ini.
- Warna data tersimpan lama (kategori alat, avatar akun) tidak dipakai langsung;
  hanya ronanya yang dibaca untuk memilih nada token terdekat.
- Tabel (`Table`) di bawah 720 px bergulir mendatar, bukan berubah menjadi tata letak
  kartu seperti di spec §8. Ini penyimpangan yang disengaja; mode kartu untuk semua
  tabel adalah pekerjaan lanjutan.
