import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function TopNavBar({
  telemetry,
  currentUser,
  userRole,
  onOpenRoleModal,
  theme,
  onToggleTheme,
  lang,
  onToggleLanguage,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Peringatan Kalibrasi', desc: 'Sensor PH-04 membaca nilai tidak menentu (7.9 pH).', time: '10 mnt lalu', type: 'warn' },
    { id: 2, title: 'Baterai Sensor Rendah', desc: 'Stasiun 4 (Kebun Buah C1) tersisa 22%.', time: '45 mnt lalu', type: 'warn' },
    { id: 3, title: 'Auto-Sync Berhasil', desc: '14 node telemetri LoRaWAN tersinkronisasi.', time: '1 jam lalu', type: 'info' },
  ];

  return (
    <header className="h-20 fixed top-0 right-0 left-0 sm:left-20 md:left-24 z-30 bg-white/70 dark:bg-[#191e1b]/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10 flex justify-between items-center px-4 sm:px-8 transition-colors duration-200">
      {/* Left Section: Breadcrumb & Context Shortcuts */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 sm:hidden">
          <span className="material-symbols-outlined text-primary text-2xl fill">eco</span>
          <span className="font-headline-md text-base font-bold text-primary">AquaSmart</span>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-label-md text-on-surface-variant font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Tampilan Kebun</Link>
          <Link to="/tanah" className="hover:text-primary transition-colors">Pemeliharaan</Link>
          <Link to="/analitik" className="hover:text-primary transition-colors">Laporan</Link>
        </nav>

        {/* Live Telemetry Mini Status Badges */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-outline-variant/30 text-xs text-on-surface-variant font-medium">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">device_thermostat</span>
            <span className="font-bold text-on-surface">{telemetry?.water?.waterTemp || 25.4}°C</span>
          </div>
          <span className="text-outline-variant">|</span>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">opacity</span>
            <span className="font-bold text-on-surface">EC {telemetry?.water?.ec || 1.7} mS</span>
          </div>
          <span className="text-outline-variant">|</span>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Right Section: Actions, Controls & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder={lang === 'id' ? 'Cari telemetri / node...' : 'Search telemetry / node...'}
            className="w-48 lg:w-64 py-1.5 pl-9 pr-4 text-xs rounded-full bg-white/60 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/40 transition-all placeholder:text-outline/70"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline/70 text-base">search</span>
        </div>

        {/* Language Toggle Button */}
        <button
          onClick={onToggleLanguage}
          title="Ganti Bahasa (ID / EN)"
          className="px-2.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 hover:bg-white dark:hover:bg-white/20 text-xs font-bold text-on-surface transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">translate</span>
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* Theme Dark/Light Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode'}
          className="p-2 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 hover:bg-white dark:hover:bg-white/20 text-on-surface-variant hover:text-primary transition-all"
        >
          <span className="material-symbols-outlined text-lg">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>

        {/* Notifications Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifikasi"
            className="p-2 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 hover:bg-white dark:hover:bg-white/20 text-on-surface-variant hover:text-primary transition-all relative"
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white dark:ring-surface"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass-card p-4 shadow-xl z-50 border border-white/80 dark:border-white/10">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-3">
                <span className="font-bold text-xs uppercase tracking-wider text-primary">Notifikasi Sistem</span>
                <span className="text-[11px] text-outline font-semibold">3 Baru</span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-outline-variant/20 flex gap-3">
                    <span className={`material-symbols-outlined text-lg mt-0.5 ${n.type === 'warn' ? 'text-amber-600' : 'text-primary'}`}>
                      {n.type === 'warn' ? 'warning' : 'info'}
                    </span>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-on-surface">{n.title}</p>
                        <span className="text-[10px] text-outline">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Role & Profile Switcher Button */}
        <button
          onClick={onOpenRoleModal}
          title="Klik untuk beralih peran (Operator vs Kepala Agronomis)"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-2xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 hover:border-primary/50 transition-all group"
        >
          <img
            src={currentUser?.avatar}
            alt={currentUser?.name}
            className="w-8 h-8 rounded-xl object-cover ring-2 ring-primary/30"
          />
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">
              {currentUser?.name?.split(',')[0]}
            </div>
            <div className="text-[10px] font-semibold text-primary dark:text-emerald-glow leading-none mt-0.5 flex items-center gap-1">
              <span>{currentUser?.role === 'agronomist' ? 'Agronomis (L4)' : 'Operator (L2)'}</span>
              <span className="material-symbols-outlined text-[12px]">swap_horiz</span>
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
