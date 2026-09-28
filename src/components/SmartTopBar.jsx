import { useSmart } from '../store/SmartStore';
import { IconButton } from './ui';
import { STATUS_LABEL } from './ui';

export default function SmartTopBar({ title, subtitle }) {
  const { theme, toggleTheme, role, activeAlerts, devices, resetDemo } = useSmart();

  const online = devices.filter((d) => d.status === 'online').length;
  const alertTone = activeAlerts.length === 0 ? 'ok' : activeAlerts.some((d) => d.status === 'offline') ? 'bad' : 'warn';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-[#191e1b]/80 border-b border-white/40 dark:border-white/10 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">
            {role === 'pengelola' ? 'Mode Pengelola' : 'Mode Pengguna'}
          </p>
          <h1 className="text-lg sm:text-xl font-extrabold text-on-surface truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>}
        </div>

        {/* Status ringkas */}
        <div className="hidden md:flex items-center gap-3 rounded-2xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-primary">sensors</span>
            {online}/{devices.length} online
          </span>
          <span className="text-outline-variant">|</span>
          <span
            className={`flex items-center gap-1.5 text-xs font-bold ${
              alertTone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : alertTone === 'bad' ? 'text-red-600' : 'text-amber-600'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">notification_important</span>
            {activeAlerts.length === 0 ? 'Semua normal' : `${activeAlerts.length} perhatian`}
          </span>
        </div>

        <IconButton
          icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          tone="netral"
          className="panel-inset"
        />

        <IconButton
          icon="restart_alt"
          onClick={resetDemo}
          title="Kembalikan data demo ke kondisi awal"
          tone="netral"
          className="panel-inset"
        />
      </div>

      {activeAlerts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeAlerts.slice(0, 4).map((device) => (
            <span
              key={device.id}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100"
            >
              <span className="material-symbols-outlined text-[13px]">warning</span>
              {device.code} · {STATUS_LABEL[device.status]}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
