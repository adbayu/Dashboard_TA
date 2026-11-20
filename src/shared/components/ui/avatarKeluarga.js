import { ronaDariHex } from '../../model/rona.js';

// Warna avatar di data (`avatar.warna`, hex pilihan pengguna) tidak pernah dipakai
// langsung: hanya ronanya yang dibaca untuk memilih keluarga token tema.
/**
 * Keluarga token dari avatar akun: hijau -> leaf, teal dan biru -> water,
 * ungu -> info, oranye -> warn; merah, abu-abu, tanpa avatar, atau warna yang
 * tidak terbaca -> primary. Pengguna yang sama selalu mendapat keluarga yang
 * sama di sidebar, profil, daftar pengguna, dan halaman masuk.
 */
export function keluargaAvatar(avatar) {
  const h = ronaDariHex(avatar?.warna);
  if (h == null) return 'primary';
  if (h >= 75 && h < 170) return 'leaf';
  if (h >= 170 && h < 260) return 'water';
  if (h >= 260 && h < 330) return 'info';
  if (h >= 15 && h < 75) return 'warn';
  return 'primary';
}
