import clsx from 'clsx';
import { IkonSlot } from './IkonSlot.jsx';
import { normalizeTone, TONE_BG, TONE_TEXT } from './tones.js';

/**
 * Keping status: ikon + teks berwarna nada. Status tidak pernah hanya warna,
 * jadi kirim `icon` untuk status (nama lucide).
 * `tone` menerima ok | warn | bad | info | muted dan nama lama (brand,
 * success, error, ...), lihat normalizeTone. Di tema Lumina keping menjadi
 * pill bergaris huruf kapital lewat theme-surfaces.css.
 */
export function StatusPill({ children, tone = 'muted', icon, solid = false, className = '' }) {
  const nada = normalizeTone(tone);
  return (
    <span
      data-ui="pill"
      data-tone={nada}
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold leading-[18px]',
        TONE_TEXT[nada],
        solid && ['rounded-control px-2 py-0.5', TONE_BG[nada]],
        className,
      )}
    >
      <IkonSlot icon={icon} size={15} />
      {children}
    </span>
  );
}
