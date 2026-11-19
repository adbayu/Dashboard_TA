// Nama dan deskripsi satu baris lima tema (spec §5, daftar THEMES design system)
// serta tiga pilihan mode. Urutan sama dengan TEMA/MODE di themePreference.js.

export const TEMA_INFO = [
  { id: 'kebun-air', nama: 'Kebun Air', catatan: 'bawaan', deskripsi: 'Krem tanah, hijau lumut, biru air. Kepala kartu berwarna per area.' },
  { id: 'catatan-lapangan', nama: 'Catatan Lapangan', deskripsi: 'Kertas dan garis tipis. Sensor tampil sebagai baris catatan.' },
  { id: 'panel-instrumen', nama: 'Panel Instrumen', deskripsi: 'Olive dingin dan angka mono. Teknis dan padat.' },
  { id: 'tanah-lumut', nama: 'Tanah & Lumut', deskripsi: 'Krem tanah, lumut, terakota. Paling hangat.' },
  { id: 'lumina', nama: 'Lumina', deskripsi: 'Gradien, kaca, glow. Disimpan sebagai pembanding.' },
];

export const MODE_INFO = [
  { id: 'terang', label: 'Terang', icon: 'sun' },
  { id: 'gelap', label: 'Gelap', icon: 'moon' },
  { id: 'sistem', label: 'Ikuti sistem', icon: 'monitor' },
];

/** Nama tampilan tema; id tak dikenal jatuh ke tema bawaan. */
export function namaTema(id) {
  return (TEMA_INFO.find((tema) => tema.id === id) ?? TEMA_INFO[0]).nama;
}

/** Teks keping status di Profil, dari mode terhitung (light|dark), bukan pilihan tersimpan. */
export function teksAktif(tema, resolvedMode) {
  return `Aktif sekarang: ${namaTema(tema)}, mode ${resolvedMode === 'dark' ? 'gelap' : 'terang'}`;
}
