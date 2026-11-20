// Nada warna area untuk Card, AreaSection, dan ikon jenis area. Kolam dan
// tandon berair (water), growbed berdaun (leaf); jenis lain atau kosong netral.
// Di Catatan Lapangan dan Panel Instrumen token area netral, jadi pembedanya
// tetap teks dan ikon, bukan warna.
const NADA = { kolam: 'water', tandon: 'water', growbed: 'leaf' };

/** `jenis` area (`area.type`) -> 'water' | 'leaf' | 'neutral'. */
export function areaTone(jenis) {
  return Object.hasOwn(NADA, jenis) ? NADA[jenis] : 'neutral';
}
