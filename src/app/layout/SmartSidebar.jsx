import { useEffect, useSyncExternalStore } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useSmart } from '../../shared/store/SmartStore';
import { IOT_SOURCE } from '../../services/iotApi.js';
import { iotMonitoringStore } from '../../services/iotMonitoringStore.js';
import { Avatar } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import AttentionBadge from '../../components/iot/AttentionBadge.jsx';
import { countAttentionDevices } from '../../utils/monitoring.js';
import { shouldConnectIotMonitoring } from '../../utils/roleAccess.js';

// ── Definisi menu per role ────────────────────────────────────────────────────
// Grup, label, dan ikon (lucide) mengikuti kanvas Main/admin (Ruling R12); rute,
// `end`, dan `attention` tetap. Tanpa deskripsi di bawah menu.
// oxlint-disable-next-line react/only-export-components -- Shared menu data stays beside its existing consumer.
export const MENUS = {
  pengguna: [
    {
      group: 'Pemantauan',
      items: [
        { to: '/', end: true, label: 'Pantauan', icon: 'activity' },
        { to: '/iot', label: 'Alat IoT', icon: 'radio' },
        { to: '/monitoring', label: 'Monitoring', icon: 'thermometer', attention: true },
        { to: '/detail-informasi', label: 'Pindai QR', icon: 'qr-code' },
      ],
    },
    {
      group: 'Operasional',
      items: [
        { to: '/area', label: 'Area & kolam', icon: 'waves' },
        { to: '/v-pet', label: 'V-Pet', icon: 'heart' },
      ],
    },
    {
      group: 'Belajar & poin',
      items: [
        { to: '/gamifikasi', label: 'Misi & poin', icon: 'square-check' },
        { to: '/chatbot', label: 'Chatbot akuaponik', icon: 'info' },
      ],
    },
    {
      group: 'Integrasi',
      items: [{ to: '/developer', label: 'Developer', icon: 'lock' }],
    },
  ],
  pengelola: [
    {
      group: 'Ringkasan',
      items: [
        { to: '/admin', end: true, label: 'Dashboard pengelola', icon: 'activity' },
        { to: '/monitoring', label: 'Monitoring', icon: 'thermometer', attention: true },
      ],
    },
    {
      group: 'Kelola data',
      items: [
        { to: '/admin/pengguna', label: 'Pengguna', icon: 'user' },
        { to: '/admin/iot', label: 'Alat IoT', icon: 'radio' },
        { to: '/admin/detail-informasi', label: 'Detail informasi', icon: 'qr-code' },
        { to: '/admin/kategori', label: 'Kategori alat', icon: 'inbox' },
        { to: '/admin/area', label: 'Area', icon: 'waves' },
        { to: '/admin/v-pet', label: 'V-Pet', icon: 'heart' },
        { to: '/admin/point', label: 'Sistem poin', icon: 'square-check' },
      ],
    },
    {
      group: 'Integrasi',
      items: [{ to: '/developer', label: 'Developer', icon: 'lock' }],
    },
  ],
  mitra: [
    {
      group: 'Integrasi',
      items: [{ to: '/developer', label: 'Developer', icon: 'lock' }],
    },
  ],
};

const PERAN = { pengelola: 'Akun Pengelola', mitra: 'Akun Mitra', pengguna: 'Akun Pengguna' };

// Cincin fokus di atas sidebar gelap memakai `side-text` (design system), bukan `focus`.
const FOKUS_SIDEBAR =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-side-text';

// ── Sidebar per role: menu diambil dari MENUS sesuai role aktif (dari URL) ───
// Tombol Keluar sengaja TIDAK ada di sini — logout ada di halaman /profil.
// Perlakuan per tema (Lumina mengambang bergradien) ada di theme-surfaces.css
// lewat data-ui="sidebar".
export default function SmartSidebar({ role: roleProp, isOpen = false, onClose }) {
  const { role: roleCtx, currentUser, points } = useSmart();
  const role = roleProp || roleCtx;
  const menu = MENUS[role] || MENUS.pengguna;
  const iotSnapshot = useSyncExternalStore(iotMonitoringStore.subscribe, iotMonitoringStore.getSnapshot, iotMonitoringStore.getSnapshot);
  const snapshotForUser = iotSnapshot.userId === String(currentUser?.id ?? '') && iotSnapshot.catalogState !== 'idle';
  const attentionCount = snapshotForUser
    ? countAttentionDevices(iotSnapshot.devices, iotSnapshot.latestByDevice)
    : null;

  useEffect(() => {
    if (IOT_SOURCE !== 'api' || !shouldConnectIotMonitoring(role)) return undefined;
    return iotMonitoringStore.connect(currentUser?.id);
  }, [currentUser?.id, role]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.querySelector('.smart-sidebar nav a')?.focus();
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.querySelector('.mobile-menu-button')?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && <button type="button" className="sidebar-backdrop" aria-label="Tutup menu" onClick={onClose} />}
      <aside
        data-ui="sidebar"
        aria-label="Navigasi utama"
        className={clsx(
          'smart-sidebar fixed left-0 top-0 bottom-0 z-50 flex w-52 flex-col gap-[18px] border-r border-side-line bg-side-bg px-3.5 py-5 text-side-text sm:w-56 md:w-64 xl:w-72',
          isOpen && 'is-open',
        )}
      >
        {/* Merek */}
        <div className="flex items-center gap-2.5 px-1.5 font-head text-lg font-bold leading-6">
          <span data-ui="brand-mark" className="grid h-7 w-7 shrink-0 place-items-center rounded-control bg-mark-bg text-mark-fg">
            <Icon name="sprout" size={18} />
          </span>
          JagoFarm
        </div>

        {/* Daftar menu per grup */}
        <div className="custom-scrollbar flex-1 space-y-[18px] overflow-y-auto">
          {menu.map((section) => (
            <nav key={section.group} aria-label={section.group}>
              <p className="mb-1.5 px-2 text-[13px] leading-[18px] text-side-text-2">{section.group}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    data-ui="nav-item"
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-2.5 rounded-control p-2 text-[15px] leading-[22px] transition-colors duration-200',
                        isActive ? 'bg-side-active text-side-active-text font-semibold' : 'text-side-text hover:bg-side-active',
                        FOKUS_SIDEBAR,
                      )
                    }
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.attention && attentionCount !== null && <AttentionBadge count={attentionCount} />}
                  </NavLink>
                ))}
              </div>
            </nav>
          ))}
        </div>

        {/* Kaki: akun aktif (menuju profil) dan catatan sumber data */}
        <div className="space-y-2 border-t border-side-line pt-2.5">
          {currentUser && (
            <Link
              to="/profil"
              title="Buka profil saya"
              onClick={onClose}
              className={clsx('flex items-center gap-2.5 rounded-control p-2 transition-colors duration-200 hover:bg-side-active', FOKUS_SIDEBAR)}
            >
              <Avatar avatar={currentUser.avatar} nama={currentUser.name} size="sm" />
              <span className="min-w-0 flex-1 text-sm leading-5">
                <span className="block truncate font-semibold">{currentUser.name}</span>
                <span className="block truncate text-[13px] leading-[18px] text-side-text-2">
                  {PERAN[role] || PERAN.pengguna} · {points.toLocaleString('id-ID')} poin
                </span>
              </span>
            </Link>
          )}
          <p className="px-2 text-xs leading-4 text-side-text-2">
            {IOT_SOURCE === 'api' ? 'Fitur non-IoT menggunakan data contoh.' : 'Data contoh lokal. IoT contoh hanya berlaku selama sesi ini.'}
          </p>
        </div>
      </aside>
    </>
  );
}
