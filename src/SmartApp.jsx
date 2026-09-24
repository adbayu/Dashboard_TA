import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SmartProvider, useSmart } from './store/SmartStore';
import SmartSidebar from './components/SmartSidebar';
import SmartTopBar from './components/SmartTopBar';

import Dashboard from './pages/Dashboard';
import ListIot, { DeviceDetail } from './pages/ListIot';
import KelolaArea from './pages/KelolaArea';
import AreaDetail from './pages/AreaDetail';
import VPet from './pages/VPet';
import Gamifikasi from './pages/Gamifikasi';
import Chatbot from './pages/Chatbot';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminIot from './pages/admin/AdminIot';
import AdminCategories from './pages/admin/AdminCategories';
import AdminAreas from './pages/admin/AdminAreas';
import AdminVPet from './pages/admin/AdminVPet';
import AdminPoints from './pages/admin/AdminPoints';

// Judul halaman untuk top bar
const TITLES = [
  { path: '/admin/pengguna', title: 'Kelola User', subtitle: 'Akun pengguna, peran, dan area tanggung jawab' },
  { path: '/admin/iot', title: 'Kelola IoT', subtitle: 'Registrasi perangkat, kalibrasi, dan QR penjelas alat' },
  { path: '/admin/kategori', title: 'Kategori Device', subtitle: 'Jenis alat beserta parameter dan ambang idealnya' },
  { path: '/admin/area', title: 'Kelola Area', subtitle: 'Kolam, growbed, dan tandon yang sudah dipasangi IoT' },
  { path: '/admin/v-pet', title: 'Kelola Virtual Pet', subtitle: 'Jenis, kondisi, dan area pemantauan virtual pet' },
  { path: '/admin/point', title: 'Sistem Point', subtitle: 'Aturan poin, badge, dan saldo pengguna' },
  { path: '/admin', title: 'Dashboard Pengelola', subtitle: 'Ringkasan seluruh sistem aquaponik' },
  { path: '/iot', title: 'List IoT', subtitle: 'Perangkat yang terpasang di farm' },
  { path: '/area', title: 'Kelola Area', subtitle: 'HPP dan pemantauan kolam Anda' },
  { path: '/v-pet', title: 'Virtual Pet', subtitle: 'Pemantauan farm dalam bentuk hewan peliharaan' },
  { path: '/gamifikasi', title: 'Gamifikasi', subtitle: 'Misi, badge, dan papan peringkat' },
  { path: '/chatbot', title: 'Chatbot Aquaponik', subtitle: 'Tanya seputar ikan, sayur, dan sistem aquaponik' },
  { path: '/', title: 'SmartDashboard Aquaponik', subtitle: 'Pantauan kolam, device IoT, dan farm Anda' },
];

function Toast() {
  const { toast } = useSmart();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] max-w-sm">
      <div
        className={`flex items-start gap-2 rounded-2xl px-4 py-3 shadow-2xl border text-sm font-semibold ${
          toast.tone === 'warn'
            ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700'
        }`}
        role="status"
      >
        <span className="material-symbols-outlined text-[20px]">{toast.tone === 'warn' ? 'warning' : 'check_circle'}</span>
        {toast.message}
      </div>
    </div>
  );
}

function Shell() {
  const { role } = useSmart();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const match = TITLES.filter((row) => {
    if (row.path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname === row.path || location.pathname.startsWith(row.path + '/');
  }).sort((a, b) => b.path.length - a.path.length)[0];

  const home = role === 'pengelola' ? '/admin' : '/';

  return (
    <div className="min-h-screen">
      <SmartSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="sm:pl-56 md:pl-64 xl:pl-72 flex flex-col min-h-screen">
        <SmartTopBar onOpenMenu={() => setSidebarOpen(true)} title={match?.title || 'SmartDashboard'} subtitle={match?.subtitle} />

        <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-[1500px] mx-auto pb-16">
          <Routes>
            {/* ── Role Pengguna ── */}
            <Route path="/" element={role === 'pengelola' ? <Navigate to="/admin" replace /> : <Dashboard />} />
            <Route path="/iot" element={<ListIot />} />
            <Route path="/iot/:id" element={<DeviceDetail />} />
            <Route path="/area" element={<KelolaArea />} />
            <Route path="/area/:id" element={<AreaDetail />} />
            <Route path="/v-pet" element={<VPet />} />
            <Route path="/gamifikasi" element={<Gamifikasi />} />
            <Route path="/chatbot" element={<Chatbot />} />

            {/* ── Role Pengelola ── */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/pengguna" element={<AdminUsers />} />
            <Route path="/admin/iot" element={<AdminIot />} />
            <Route path="/admin/kategori" element={<AdminCategories />} />
            <Route path="/admin/area" element={<AdminAreas />} />
            <Route path="/admin/v-pet" element={<AdminVPet />} />
            <Route path="/admin/point" element={<AdminPoints />} />

            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </main>

        <footer className="px-4 sm:px-6 py-4 border-t border-outline-variant/30 text-[11px] text-on-surface-variant">
          JagoFarm SmartDashboard Aquaponik · Data demo disimpan di browser Anda (localStorage) · Belum terhubung perangkat IoT fisik.
        </footer>
      </div>

      <Toast />
    </div>
  );
}

export default function SmartApp() {
  return (
    <BrowserRouter>
      <SmartProvider>
        <Shell />
      </SmartProvider>
    </BrowserRouter>
  );
}
