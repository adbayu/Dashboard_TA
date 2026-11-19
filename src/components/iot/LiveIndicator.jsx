import clsx from 'clsx';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';

// Nada lewat token: live `ok-fg`, berkala `info-fg`, menyambung ulang `warn-fg`,
// selebihnya `text-2`. Selalu ikon + teks. Titik berdenyut hanya tampil di
// Lumina (theme-surfaces.css) dan mati saat prefers-reduced-motion.
const INDICATORS = {
  connecting: { label: 'Menghubungkan...', color: 'text-text-2', icon: 'radio' },
  live: { label: 'Live', color: 'text-ok-fg', icon: 'radio' },
  reconnecting: { label: 'Menyambung ulang...', color: 'text-warn-fg', icon: 'refresh-cw' },
  polling: { label: 'Diperbarui tiap 30 detik', color: 'text-info-fg', icon: 'clock' },
  local: { label: 'Data contoh', color: 'text-text-2', icon: 'info' },
  idle: { label: 'Live tidak aktif untuk rentang ini', color: 'text-text-2', icon: 'circle-pause' },
};

export default function LiveIndicator({ status = 'connecting', meta }) {
  const key = Object.hasOwn(INDICATORS, status) ? status : 'connecting';
  const indicator = INDICATORS[key];
  return (
    <span data-ui="live" data-state={key} className="inline-flex" role="status" aria-live="polite">
      <span className={clsx('inline-flex items-center gap-1.5 text-sm font-semibold leading-5', indicator.color)}>
        <span data-ui="live-dot" aria-hidden="true" className="hidden h-[7px] w-[7px] rounded-full bg-current" />
        <IkonSlot icon={indicator.icon} size={16} />
        {indicator.label}
        {meta && <span className="font-normal text-text-2">· {meta}</span>}
      </span>
    </span>
  );
}
