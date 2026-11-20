import clsx from 'clsx';
import { keluargaAvatar } from './avatarKeluarga.js';

const UKURAN_AVATAR = { sm: 28, md: 36, lg: 44 };

function inisialDari(nama) {
  return (nama || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase();
}

// Keluarga token dipilih lewat avatarKeluarga.js (warna di data hanya dibaca ronanya).
// Garis 1 px memakai warna teks keluarga (setengah buram) supaya tepi chip tetap
// terlihat di atas sidebar gelap, juga saat latar chip hampir sama dengan sidebar.
const KELUARGA_AVATAR = {
  primary: 'bg-primary text-on-primary border-on-primary/70',
  leaf: 'bg-leaf-bg text-leaf-fg border-leaf-fg/70',
  water: 'bg-water-bg text-water-fg border-water-fg/70',
  info: 'bg-info-bg text-info-fg border-info-fg/70',
  warn: 'bg-warn-bg text-warn-fg border-warn-fg/70',
};

/**
 * Avatar akun: inisial nama di atas warna keluarga token (lihat keluargaAvatar).
 * Bentuk data avatar = { id, keluarga } (pilihan baru) atau { id, warna, warnaTeks }
 * (data lama); `keluarga` didahulukan, lalu rona `warna`.
 * `size` boleh angka piksel (lama) atau sm | md | lg.
 */
export function Avatar({ avatar, nama, name, size = 40, className = '' }) {
  const piksel = typeof size === 'number' ? size : UKURAN_AVATAR[size] || UKURAN_AVATAR.md;
  const keluarga = keluargaAvatar(avatar);
  return (
    <span
      aria-hidden="true"
      data-ui="avatar"
      data-family={keluarga}
      className={clsx(
        'inline-flex select-none items-center justify-center rounded-control border font-bold tracking-[0.02em]',
        KELUARGA_AVATAR[keluarga],
        className,
      )}
      style={{ width: piksel, height: piksel, minWidth: piksel, fontSize: Math.max(11, Math.round(piksel * 0.36)) }}
    >
      {inisialDari(nama ?? name)}
    </span>
  );
}

// Tombol pemilih avatar: bentuk yang sama dengan yang tampil di sidebar/profil,
// jadi yang dilihat pengguna di daftar pilihan persis sama dengan hasilnya.
export function AvatarPilih({ avatar, nama, terpilih, onClick, size = 48, label = 'Pilih avatar' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={terpilih}
      className={clsx(
        'overflow-hidden rounded-control border-2 transition-colors',
        terpilih ? 'border-primary ring-2 ring-focus' : 'border-transparent hover:border-text-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      )}
    >
      <Avatar avatar={avatar} nama={nama} size={size} />
    </button>
  );
}
