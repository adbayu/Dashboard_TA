// Rona (hue, 0-360) dari warna heksadesimal 6 digit yang tersimpan di data
// lama (kategori alat, avatar akun). Warnanya tidak pernah dipakai langsung di
// layar: hanya rona yang dibaca untuk memilih keluarga token terdekat.
// Mengembalikan null untuk nilai yang bukan heksadesimal atau hampir abu-abu.
export function ronaDariHex(warna) {
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
