/**
 * Indeks tab tujuan untuk satu tombol papan ketik, atau null bila tombol itu
 * bukan navigasi tab: panah memutar (dari ujung ke ujung), Home ke tab pertama,
 * End ke tab terakhir.
 */
export function tujuanTab(key, indeksAktif, jumlah) {
  if (!jumlah) return null;
  if (key === 'ArrowRight') return (indeksAktif + 1) % jumlah;
  if (key === 'ArrowLeft') return (indeksAktif - 1 + jumlah) % jumlah;
  if (key === 'Home') return 0;
  if (key === 'End') return jumlah - 1;
  return null;
}
