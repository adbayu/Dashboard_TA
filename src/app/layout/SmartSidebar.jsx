import { Link, NavLink } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { Avatar } from '../../shared/components/ui';

// ── Definisi menu per role ────────────────────────────────────────────────────
export const MENUS = {
  pengguna: [
    {
      group: 'Pemantauan',
      items: [
        { to: '/', end: true, label: 'Dashboard', icon: 'dashboard', hint: 'Ringkasan kolam & sensor aktif' },
        { to: '/iot', label: 'List IoT', icon: 'sensors', hint: 'Semua perangkat terpasang' },
        { to: '/detail-informasi', label: 'Detail Information', icon: 'qr_code_scanner', hint: 'Pindai QR alat & baca penjelasannya' },
      ],
    },
    {
      group: 'Operasional Farm',
      items: [
        { to: '/area', label: 'Kelola Area', icon: 'water', hint: 'Kolam, growbed, HPP & pemantauan' },
        { to: '/v-pet', label: 'V-Pet', icon: 'pets', hint: 'Pelihara hewan virtual farm' },
      ],
    },
    {
      group: 'Belajar & Poin',
      items: [
        { to: '/gamifikasi', label: 'Gamifikasi', icon: 'emoji_events', hint: 'Misi, badge, papan peringkat' },
        { to: '/chatbot', label: 'Chatbot Aquaponik', icon: 'smart_toy', hint: 'Tanya soal ikan, sayur & sistem' },
      ],
    },
  ],
  pengelola: [
    {
      group: 'Ringkasan',
      items: [{ to: '/admin', end: true, label: 'Dashboard Pengelola', icon: 'dashboard', hint: 'Kondisi seluruh farm' }],
    },
    {
      group: 'Kelola Master Data',
      items: [
        { to: '/admin/pengguna', label: 'Kelola User', icon: 'group', hint: 'Akun pengguna & hak akses area' },
        { to: '/admin/iot', label: 'Kelola IoT', icon: 'devices', hint: 'Perangkat, kalibrasi & QR alat' },
        { to: '/admin/detail-informasi', label: 'Detail Information', icon: 'qr_code_2', hint: 'Penjelasan alat yang dibaca pengguna' },
        { to: '/admin/kategori', label: 'Kategori Device', icon: 'category', hint: 'Jenis alat & parameter ukurnya' },
        { to: '/admin/area', label: 'Kelola Area', icon: 'water', hint: 'Kolam/growbed yang sudah dipasangi IoT' },
        { to: '/admin/v-pet', label: 'Kelola Virtual Pet', icon: 'pets', hint: 'Jenis pet, kondisi & reset' },
        { to: '/admin/point', label: 'Sistem Point', icon: 'stars', hint: 'Aturan poin, badge & saldo pengguna' },
      ],
    },
  ],
};

// ── Sidebar per role: menu diambil dari MENUS sesuai role aktif (dari URL) ───
// Tombol Keluar sengaja TIDAK ada di sini — logout ada di halaman /profil.
export default function SmartSidebar({ role: roleProp }) {
  const { role: roleCtx, currentUser, points, activeAlerts } = useSmart();
  const role = roleProp || roleCtx;
  const menu = MENUS[role] || MENUS.pengguna;
  const pending = activeAlerts.length;

  return (
    <>
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 w-16 sm:w-56 md:w-64 xl:w-72 flex flex-col"
        style={{ background: 'linear-gradient(180deg, rgb(56, 84, 49) 0%, rgb(38, 60, 34) 55%, rgb(27, 44, 25) 100%)' }}
      >
        {/* Kepala: brand */}
        <div className="flex items-center justify-center sm:justify-start gap-3 px-2 sm:px-5 py-5 border-b border-white/10">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-accent/20 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px] fill">eco</span>
          </div>
          <div className="hidden sm:block leading-tight min-w-0">
            <p className="text-white font-extrabold tracking-tight">JagoFarm</p>
            <p className="text-[11px] font-semibold text-emerald-accent">SmartDashboard Aquaponik</p>
          </div>
        </div>

        {/* Identitas pengguna aktif — bisa diklik menuju halaman profil */}
        <div className="px-1 sm:px-4 py-4 border-b border-white/10 space-y-2">
          <Link
            to="/profil"
            title="Buka profil saya"
            aria-label={`Profil saya: ${currentUser.name}`}
            className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-3 rounded-2xl bg-white/10 border border-white/10 p-1 sm:p-3 hover:bg-white/20 transition-colors group"
          >
            <Avatar avatar={currentUser.avatar} nama={currentUser.name} size={40} className="ring-2 ring-emerald-accent/40" />
            <span className="sm:hidden text-[8px] font-semibold leading-tight text-white/80">Profil</span>
            <div className="hidden sm:block min-w-0 flex-1">
              <p className="text-white text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-[11px] text-white/60 truncate">
                {role === 'pengelola' ? 'Akun Pengelola' : 'Akun Pengguna'}
              </p>
            </div>
            <span aria-hidden="true" className="hidden sm:block material-symbols-outlined text-[18px] text-white/50 group-hover:text-white">chevron_right</span>
          </Link>

          <Link
            to="/profil"
            className="hidden sm:flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">account_circle</span>
            Profil Saya
          </Link>
        </div>

        {/* Daftar menu */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-1 sm:px-3 py-4 space-y-5">
          {menu.map((section) => (
            <div key={section.group}>
              <p className="hidden sm:block px-2 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-white/60">{section.group}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    aria-label={`${item.label}: ${item.hint}`}
                    className={({ isActive }) =>
                      `flex min-h-14 flex-col sm:min-h-11 sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 rounded-xl px-0.5 sm:px-3 py-2.5 transition-all group ${
                        isActive
                          ? 'bg-white text-primary dark:bg-inverse-primary/15 dark:text-inverse-primary'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span aria-hidden="true" className={`material-symbols-outlined shrink-0 text-[20px] sm:mt-0.5 ${isActive ? 'fill text-primary' : ''}`}>{item.icon}</span>
                        <span className="block w-full min-w-0 sm:flex-1">
                          <span className="block break-words text-center text-[9px] font-semibold leading-tight sm:text-left sm:text-[13px] sm:font-bold">{item.label}</span>
                          <span className={`hidden sm:block text-[11px] leading-tight ${isActive ? 'text-on-surface-variant dark:text-inverse-primary' : 'text-white/60'}`}>{item.hint}</span>
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Kaki: poin & catatan */}
        <div className="px-1 sm:px-4 py-4 border-t border-white/10 space-y-2">
          <div title={`Point Anda: ${points.toLocaleString('id-ID')}`} className="flex items-center justify-center gap-1 sm:justify-between sm:gap-0 rounded-xl bg-white/10 px-1 sm:px-3 py-2">
            <span className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[11px] font-bold text-white/70">
              <span aria-hidden="true" className="hidden sm:inline-block material-symbols-outlined text-[16px] text-emerald-accent">stars</span>
              <span className="hidden sm:inline">Point Anda</span><span className="sm:hidden">Poin</span>
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white">{points.toLocaleString('id-ID')}</span>
          </div>
          {pending > 0 && (
            <p className="hidden sm:flex text-[11px] text-amber-200 items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {pending} device butuh perhatian
            </p>
          )}
          <p className="hidden sm:block text-[10px] text-white/60 leading-snug">Data demo lokal, belum terhubung hardware IoT fisik.</p>
        </div>
      </aside>
    </>
  );
}
