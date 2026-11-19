import { useSmart } from '../../shared/store/SmartStore';
import { IOT_SOURCE } from '../../services/iotApi.js';
import { IconButton } from '../../shared/components/ui';
import { ThemeQuickMenu } from '../../shared/theme/ThemeQuickMenu.jsx';

// Bilah atas (kanvas Main): judul halaman, pulihkan data contoh (mode lokal),
// lalu tombol tema cepat. Tanpa eyebrow "Mode ..." di atas judul.
export default function SmartTopBar({ title, subtitle, onMenuClick }) {
  const { resetDemo } = useSmart();

  return (
    <header data-ui="topbar" className="sticky top-0 z-30 border-b border-border bg-bg px-4 py-2.5 sm:px-6">
      <div className="flex min-h-10 min-w-0 items-center gap-3">
        <IconButton icon="menu" onClick={onMenuClick} label="Buka menu" size="lg" className="mobile-menu-button shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-head text-base font-semibold leading-[22px] text-text">{title}</h1>
          {subtitle && <p className="text-xs text-text-2 break-words">{subtitle}</p>}
        </div>

        {IOT_SOURCE === 'local' && (
          <IconButton icon="refresh-cw" onClick={resetDemo} label="Pulihkan data contoh" tone="netral" />
        )}

        <ThemeQuickMenu />
      </div>
    </header>
  );
}
