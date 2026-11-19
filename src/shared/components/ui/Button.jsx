import clsx from 'clsx';
import { UKURAN } from '../ui.jsx';
import { IkonSlot } from './IkonSlot.jsx';
import { FOKUS } from './tones.js';
import { kelasTombol, varianTombol } from './tombol.js';

// Kelas varian dan ukuran ada di tombol.js, dipakai bersama <TautanTombol>.
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
  return (
    <button
      type={type}
      data-ui="button"
      data-variant={varianTombol(variant)}
      className={kelasTombol({ variant, size, className })}
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
