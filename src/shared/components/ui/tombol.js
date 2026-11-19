import clsx from 'clsx';
import { UKURAN } from '../ui.jsx';
import { FOKUS } from './tones.js';

// Kelas tombol bersama untuk <Button> dan tautan yang tampil sebagai tombol
// (<TautanTombol>), supaya tautan navigasi tidak menyalin kelas tombol sendiri.
// Empat varian design system; tinggi selalu dari UKURAN (sm 32, md 40, lg 44)
// dan semua varian punya garis 1 px (transparan bila tak terlihat) supaya
// tombol berbeda varian tetap persis sama tinggi dalam satu baris.
const VARIAN = {
  primary: 'bg-primary text-on-primary border-transparent enabled:hover:bg-primary-hover',
  secondary: 'bg-surface text-text border-text-2 enabled:hover:bg-surface-2',
  danger: 'bg-surface text-bad-fg border-bad-fg enabled:hover:bg-bad-bg',
  ghost: 'bg-transparent text-text border-transparent enabled:hover:bg-surface-2',
};

// Tautan tidak punya :enabled, jadi hover-nya ditulis langsung.
const VARIAN_TAUTAN = {
  primary: 'bg-primary text-on-primary border-transparent hover:bg-primary-hover',
  secondary: 'bg-surface text-text border-text-2 hover:bg-surface-2',
  danger: 'bg-surface text-bad-fg border-bad-fg hover:bg-bad-bg',
  ghost: 'bg-transparent text-text border-transparent hover:bg-surface-2',
};

// Nama varian lama dari halaman yang belum dimigrasi.
const ALIAS_VARIAN = { soft: 'secondary' };

const NONAKTIF = 'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-2 disabled:border-surface-2';

export function varianTombol(variant) {
  const nama = ALIAS_VARIAN[variant] || variant;
  return VARIAN[nama] ? nama : 'primary';
}

/** Kelas lengkap tombol; `tautan: true` untuk elemen <a>. */
export function kelasTombol({ variant = 'primary', size = 'md', tautan = false, className = '' } = {}) {
  const u = UKURAN[size] || UKURAN.md;
  const nama = varianTombol(variant);
  return clsx(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control border font-semibold transition-colors duration-200',
    u.kontrol,
    tautan ? VARIAN_TAUTAN[nama] : [VARIAN[nama], NONAKTIF],
    FOKUS,
    className,
  );
}
