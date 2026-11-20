// Nada warna kategori alat untuk Card dan ikon: 'water' | 'leaf' | 'neutral'.
// Kategori baru menyimpan `area` (dipilih di formulir). Data lama hanya punya
// `color` heksadesimal dari seed; warnanya tidak pernah dipakai langsung,
// hanya rona (hue) yang dibaca untuk memilih nada token terdekat:
// biru/sian -> water, hijau -> leaf, lainnya -> neutral.
import { ronaDariHex } from '../../shared/model/rona.js';

export const NADA_KATEGORI = ['water', 'leaf', 'neutral'];

export const LABEL_NADA_KATEGORI = { water: 'Air', leaf: 'Daun', neutral: 'Netral' };

export function nadaKategori(kategori) {
  if (NADA_KATEGORI.includes(kategori?.area)) return kategori.area;
  const h = ronaDariHex(kategori?.color);
  if (h == null) return 'neutral';
  if (h >= 170 && h < 260) return 'water';
  if (h >= 75 && h < 170) return 'leaf';
  return 'neutral';
}
