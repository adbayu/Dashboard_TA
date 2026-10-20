import { useSmart } from '../store/SmartStore';
import { IOT_SOURCE } from '../services/iotApi.js';
import { IconButton } from './ui';

export default function SmartTopBar({ title, subtitle, onMenuClick }) {
  const { theme, toggleTheme, role, resetDemo } = useSmart();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#191e1b]/85 border-b border-white/40 dark:border-white/10 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <IconButton
          icon="menu"
          onClick={onMenuClick}
          title="Menu"
          size="lg"
          className="mobile-menu-button panel-inset shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">
            {role === 'pengelola' ? 'Mode Pengelola' : role === 'mitra' ? 'Mode Mitra' : 'Mode Pengguna'}
          </p>
          <h1 className="text-lg sm:text-xl font-extrabold text-on-surface truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant break-words">{subtitle}</p>}
        </div>

        <IconButton
          icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          tone="netral"
          className="panel-inset"
        />

        {IOT_SOURCE === 'local' && (
          <IconButton
            icon="restart_alt"
            onClick={resetDemo}
            title="Pulihkan data contoh"
            tone="netral"
            className="panel-inset"
          />
        )}
      </div>
    </header>
  );
}
