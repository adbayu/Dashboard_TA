import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Utama', icon: 'grid_view' },
  { to: '/tanah', label: 'Tanah', icon: 'potted_plant' },
  { to: '/cuaca', label: 'Cuaca', icon: 'partly_cloudy_day' },
  { to: '/analitik', label: 'Analitik', icon: 'monitoring' },
  { to: '/riwayat', label: 'Riwayat', icon: 'history' },
  { to: '/sensor', label: 'Sensor', icon: 'sensors' },
  { to: '/ensiklopedia', label: 'Kamus', icon: 'menu_book' },
  { to: '/ai', label: 'AI', icon: 'psychology' },
  { to: '/pengaturan', label: 'Setelan', icon: 'settings' },
  { to: '/profil', label: 'Profil', icon: 'person' },
];

export default function Sidebar({ onOpenAddSensor }) {
  return (
    <>
      {/* Desktop & Tablet Persistent Left Rail */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-20 md:w-24 z-40 hidden sm:flex flex-col items-center py-6 shadow-2xl transition-all select-none rounded-r-[28px]"
        style={{
          background: 'linear-gradient(180deg, rgb(68, 99, 59) 0%, rgb(53, 79, 46) 100%)',
        }}
      >
        {/* Brand App Icon */}
        <div className="mb-4 flex flex-col items-center">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner border border-white/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-white text-[24px] fill">eco</span>
          </div>
          <span className="text-[10px] font-bold text-white/70 tracking-wider uppercase mt-1">Aqua</span>
        </div>

        {/* Navigation Items Rail */}
        <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 group ${
                  isActive
                    ? 'text-white shadow-[0_4px_16px_rgba(0,200,117,0.4)] scale-105'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: '#00c875' } : {}
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`material-symbols-outlined text-[22px] leading-none mb-1 transition-transform group-hover:scale-110 ${
                      isActive ? 'fill' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[10px] tracking-tight leading-tight ${
                      isActive ? 'font-bold' : 'font-medium text-white/80'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Quick Action: Add Node / Trigger */}
        <div className="mt-auto pt-3 flex flex-col items-center w-full px-2 border-t border-white/10">
          <button
            onClick={onOpenAddSensor}
            title="Tambah Node Sensor Baru"
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white/20 shadow-sm hover:rotate-90 hover:scale-105"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1e2420]/95 backdrop-blur-xl border-t border-outline-variant/30 flex items-center justify-around py-2 px-1 shadow-lg">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-primary dark:text-emerald-glow font-bold'
                  : 'text-on-surface-variant font-medium'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/ai"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all ${
              isActive
                ? 'text-primary dark:text-emerald-glow font-bold'
                : 'text-on-surface-variant font-medium'
            }`
          }
        >
          <span className="material-symbols-outlined text-[22px]">psychology</span>
          <span className="text-[10px] mt-0.5">AI</span>
        </NavLink>
      </nav>
    </>
  );
}
