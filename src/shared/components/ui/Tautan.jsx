import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { UKURAN } from '../ui.jsx';
import { IkonSlot } from './IkonSlot.jsx';
import { FOKUS } from './tones.js';
import { kelasTombol, varianTombol } from './tombol.js';

/**
 * Tautan navigasi di dalam teks: warna `primary`, bergaris bawah, cincin fokus
 * bersama. `icon` opsional di depan teks (mis. panah kembali).
 */
export function Tautan({ to, icon, children, className = '', ...rest }) {
  return (
    <Link
      to={to}
      className={clsx(
        'inline-flex items-center gap-1 rounded-sm font-semibold text-primary underline decoration-1 underline-offset-[3px] hover:text-primary-hover',
        FOKUS,
        className,
      )}
      {...rest}
    >
      <IkonSlot icon={icon} size={16} />
      {children}
    </Link>
  );
}

/**
 * Tautan yang tampil sebagai tombol (navigasi, bukan aksi). Varian dan ukuran
 * sama dengan <Button>; `data-ui="button"` ikut supaya perlakuan tema berlaku.
 */
export function TautanTombol({ to, variant = 'primary', size = 'md', icon, children, className = '', ...rest }) {
  const u = UKURAN[size] || UKURAN.md;
  return (
    <Link
      to={to}
      data-ui="button"
      data-variant={varianTombol(variant)}
      className={kelasTombol({ variant, size, tautan: true, className })}
      {...rest}
    >
      <IkonSlot icon={icon} size={u.ikonPx} />
      {children}
    </Link>
  );
}
