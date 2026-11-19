import clsx from 'clsx';
import { UKURAN } from '../ui.jsx';
import { IkonSlot } from './IkonSlot.jsx';
import { FOKUS } from './tones.js';

// Empat varian design system. Tinggi selalu dari UKURAN (sm 32, md 40, lg 44)
// dan semua varian punya garis 1 px (transparan bila tak terlihat) supaya
// tombol berbeda varian tetap persis sama tinggi dalam satu baris.
const VARIAN = {
  primary: 'bg-primary text-on-primary border-transparent enabled:hover:bg-primary-hover',
  secondary: 'bg-surface text-text border-text-2 enabled:hover:bg-surface-2',
  danger: 'bg-surface text-bad-fg border-bad-fg enabled:hover:bg-bad-bg',
  ghost: 'bg-transparent text-text border-transparent enabled:hover:bg-surface-2',
};

// Nama varian lama dari halaman yang belum dimigrasi.
const ALIAS_VARIAN = { soft: 'secondary' };

const NONAKTIF = 'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-2 disabled:border-surface-2';

function varianDari(variant) {
  const nama = ALIAS_VARIAN[variant] || variant;
  return VARIAN[nama] ? nama : 'primary';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon,
  iconRight,
  className = '',
  ...rest
}) {
  const u = UKURAN[size] || UKURAN.md;
  const nama = varianDari(variant);
  return (
    <button
      type={type}
      data-ui="button"
      data-variant={nama}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control border font-semibold transition-colors duration-200',
        u.kontrol,
        VARIAN[nama],
        NONAKTIF,
        FOKUS,
        className,
      )}
      {...rest}
    >
      <IkonSlot icon={icon} size={u.ikonPx} />
      {children}
      <IkonSlot icon={iconRight} size={u.ikonPx} />
    </button>
  );
}

// Warna ikon menurut `tone` lama; `variant` dari design system didahulukan.
const WARNA_IKON = {
  bad: 'border-transparent text-bad-fg enabled:hover:bg-bad-bg',
  warn: 'border-transparent text-warn-fg enabled:hover:bg-warn-bg',
  netral: 'border-transparent text-text-2 enabled:hover:text-text enabled:hover:bg-surface-2',
  brand: 'border-transparent text-text enabled:hover:bg-surface-2',
};

/**
 * Tombol ikon persegi. `label` (atau `title` lama) wajib: dipakai sebagai
 * aria-label dan title.
 */
export function IconButton({ icon, label, title, tone = 'brand', variant, size = 'md', className = '', ...rest }) {
  const u = UKURAN[size] || UKURAN.md;
  const nama = label || title;
  const warna =
    variant === 'danger'
      ? WARNA_IKON.bad
      : variant === 'secondary'
        ? 'bg-surface border-text-2 text-text enabled:hover:bg-surface-2'
        : WARNA_IKON[tone] || WARNA_IKON.brand;
  return (
    <button
      type="button"
      title={nama}
      aria-label={nama}
      data-ui="icon-button"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-control border transition-colors duration-200 disabled:cursor-not-allowed disabled:text-text-2 disabled:opacity-60',
        u.ikon,
        warna,
        FOKUS,
        className,
      )}
      {...rest}
    >
      <IkonSlot icon={icon} size={u.ikonPx} />
    </button>
  );
}
