import { NavLink } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';

// ── Definisi menu per role ────────────────────────────────────────────────────
export const MENUS = {
  pengguna: [
    {
      group: 'Pemantauan',
      items: [
        { to: '/', end: true, label: 'Dashboard', icon: 'dashboard', hint: 'Ringkasan kolam & sensor aktif' },
        { to: '/iot', label: 'List IoT', icon: 'sensors', hint: 'Semua perangkat terpasang' },
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
        { to: '/admin/kategori', label: 'Kategori Device', icon: 'category', hint: 'Jenis alat & parameter ukurnya' },
        { to: '/admin/area', label: 'Kelola Area', icon: 'water', hint: 'Kolam/growbed yang sudah dipasangi IoT' },
        { to: '/admin/v-pet', label: 'Kelola Virtual Pet', icon: 'pets', hint: 'Jenis pet, kondisi & reset' },
        { to: '/admin/point', label: 'Sistem Point', icon: 'stars', hint: 'Aturan poin, badge & saldo pengguna' },
      ],
    },
  ],
};

export default function SmartSidebar({ open, onClose }) {
  const { role, setRole, currentUser, points, activeAlerts } = useSmart();
  const menu = MENUS[role] || MENUS.pengguna;
  const pending = activeAlerts.length;

  return (
    <>
      {/* Lapisan gelap hanya untuk layar sempit (< 640px) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity sm:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Sidebar selalu tampil mulai 640px (sm:) tanpa perlu klik; melebar bertahap di layar besar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 sm:w-56 md:w-64 xl:w-72 flex flex-col shadow-2xl transition-transform duration-300 sm:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, rgb(56, 84, 49) 0%, rgb(38, 60, 34) 55%, rgb(27, 44, 25) 100%)' }}
      >
        {/* Kepala: brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-emerald-accent/20 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[24px] fill">eco</span>
          </div>
          <div className="leading-tight">
            <p className="text-white font-extrabold tracking-tight">JagoFarm</p>
            <p className="text-[11px] font-semibold text-emerald-accent">SmartDashboard Aquaponik</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white sm:hidden" aria-label="Tutup menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Identitas pengguna aktif */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 p-3">
            <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-accent/40" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-[11px] text-white/60 truncate">{currentUser.email}</p>
            </div>
          </div>
          {/* Pemilih role */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-black/25 p-1.5">
            {[
              { key: 'pengguna', label: 'Pengguna', icon: 'person' },
              { key: 'pengelola', label: 'Pengelola', icon: 'shield_person' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setRole(option.key)}
                className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                  role === option.key ? 'bg-emerald-accent text-white shadow-emerald-glow' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daftar menu */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-5">
          {menu.map((section) => (
            <div key={section.group}>
              <p className="px-2 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-white/40">{section.group}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all group ${
                        isActive ? 'bg-white text-primary shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isActive ? 'fill text-primary' : ''}`}>{item.icon}</span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold leading-tight">{item.label}</span>
                          <span className={`block text-[11px] leading-tight ${isActive ? 'text-on-surface-variant' : 'text-white/50'}`}>{item.hint}</span>
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
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/70">
              <span className="material-symbols-outlined text-[16px] text-emerald-accent">stars</span>
              Point Anda
            </span>
            <span className="text-sm font-extrabold text-white">{points.toLocaleString('id-ID')}</span>
          </div>
          {pending > 0 && (
            <p className="text-[11px] text-amber-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {pending} device butuh perhatian
            </p>
          )}
          <p className="text-[10px] text-white/40 leading-snug">Data demo lokal — belum terhubung hardware IoT fisik.</p>
        </div>
      </aside>
    </>
  );
}
