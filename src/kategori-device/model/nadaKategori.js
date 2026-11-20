// Nada warna kategori alat untuk Card dan ikon: 'water' | 'leaf' | 'neutral'.
// Kategori baru menyimpan `area` (dipilih di formulir). Data lama hanya punya
// `color` heksadesimal dari seed; warnanya tidak pernah dipakai langsung,
// hanya rona (hue) yang dibaca untuk memilih nada token terdekat:
// biru/sian -> water, hijau -> leaf, lainnya -> neutral.
export const NADA_KATEGORI = ['water', 'leaf', 'neutral'];

export const LABEL_NADA_KATEGORI = { water: 'Air', leaf: 'Daun', neutral: 'Netral' };

function rona(warna) {
  const cocok = /^#?([0-9a-f]{6})$/i.exec(String(warna || '').trim());
  if (!cocok) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(cocok[1].slice(i, i + 2), 16) / 255);
  const maks = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = maks - min;
  if (d < 0.08) return null;
  let h;
  if (maks === r) h = ((g - b) / d) % 6;
  else if (maks === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function nadaKategori(kategori) {
  if (NADA_KATEGORI.includes(kategori?.area)) return kategori.area;
  const h = rona(kategori?.color);
  if (h == null) return 'neutral';
  if (h >= 170 && h < 260) return 'water';
  if (h >= 75 && h < 170) return 'leaf';
  return 'neutral';
}
