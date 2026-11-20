import { ronaDariHex } from '../../model/rona.js';

// Keluarga token avatar akun. Pilihan baru menyimpan id keluarganya
// (`avatar.keluarga`); data lama hanya punya `avatar.warna` (hex pilihan
// pengguna), yang tidak pernah dipakai langsung: hanya ronanya yang dibaca
// untuk memilih keluarga terdekat.
export const KELUARGA_AVATAR_ID = ['leaf', 'water', 'info', 'warn', 'primary'];

/**
 * Keluarga token dari avatar akun. Urutan: `avatar.keluarga` yang dikenal,
 * lalu rona `avatar.warna` (hijau leaf, teal dan biru water, ungu info, oranye
 * warn), lalu primary (merah, abu-abu, tanpa avatar, atau warna tak terbaca).
 * Pengguna yang sama selalu mendapat keluarga yang sama di sidebar, profil,
 * daftar pengguna, dan halaman masuk.
 */
export function keluargaAvatar(avatar) {
  if (KELUARGA_AVATAR_ID.includes(avatar?.keluarga)) return avatar.keluarga;
  const h = ronaDariHex(avatar?.warna);
  if (h == null) return 'primary';
  if (h >= 75 && h < 170) return 'leaf';
  if (h >= 170 && h < 260) return 'water';
  if (h >= 260 && h < 330) return 'info';
  if (h >= 15 && h < 75) return 'warn';
  return 'primary';
}
