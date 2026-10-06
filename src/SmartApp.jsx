import { useCallback, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SmartProvider, useSmart } from './store/SmartStore';
import SmartSidebar from './components/SmartSidebar';
import SmartTopBar from './components/SmartTopBar';

import Dashboard from './pages/Dashboard';
import Profil from './pages/Profil';
import Login from './pages/Login';
import Daftar from './pages/Daftar';
import ListIot, { DeviceDetail } from './pages/ListIot';
import DetailInformation from './pages/DetailInformation';
import DeviceClaim from './pages/DeviceClaim';
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
import AdminDetailInformation from './pages/admin/AdminDetailInformation';
import { IOT_SOURCE } from './services/iotApi.js';
import Developer from './pages/Developer.jsx';
import Monitoring from './pages/Monitoring.jsx';
import { roleCanOpenPath } from './utils/roleAccess.js';

// Judul halaman untuk top bar
const TITLES = [
  { path: '/admin/pengguna', title: 'Kelola User', subtitle: 'Akun pengguna, peran, dan area tanggung jawab' },
  { path: '/admin/iot', title: 'Kelola IoT', subtitle: 'Registrasi perangkat, kalibrasi, dan QR penjelas alat' },
  { path: '/developer', title: 'Developer', subtitle: 'API key dan pemakaian API' },
  { path: '/monitoring', title: 'Monitoring', subtitle: 'Nilai sensor, area, dan kejadian perangkat live' },
  { path: '/admin/kategori', title: 'Kategori Device', subtitle: 'Jenis alat beserta parameter dan ambang idealnya' },
  { path: '/admin/detail-informasi', title: 'Detail Information', subtitle: 'Penjelasan alat yang sama dengan yang dibaca pengguna' },
  { path: '/admin/area', title: 'Kelola Area', subtitle: 'Kolam, growbed, dan tandon yang sudah dipasangi IoT' },
  { path: '/admin/v-pet', title: 'Kelola Virtual Pet', subtitle: 'Jenis, kondisi, dan area pemantauan virtual pet' },
  { path: '/admin/point', title: 'Sistem Point', subtitle: 'Aturan poin, badge, dan saldo pengguna' },
  { path: '/admin', title: 'Dashboard Pengelola', subtitle: 'Ringkasan seluruh sistem aquaponik' },
  { path: '/profil', title: 'Profil Saya', subtitle: 'Ubah data diri, foto, dan password akun Anda' },
  { path: '/detail-informasi', title: 'Detail Information', subtitle: 'Pindai QR alat untuk penjelasan lengkap perangkat' },
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
        className={`flex items-start gap-2 rounded-2xl px-4 py-3 shadow-glass-elevated border text-sm font-semibold ${
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
  const { role, isLoggedIn, kondisi, resetDemo, sessionStatus } = useSmart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMobileMenu = useCallback(() => setMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMenuOpen(false), []);

  // Kondisi penyimpanan yang dulu tidak pernah ditampilkan (R-27). Hanya satu
  // yang bisa terjadi di aplikasi ini: data localStorage tidak bisa dibaca
  // (JSON rusak / disunting manual). Kondisi "belum ada data" tidak mungkin
  // muncul karena data awal sistem selalu terisi, jadi tidak dibuat cabang
  // mati untuknya. Saat nanti tersambung backend, keadaan memuat/gagal jaringan
  // ditambahkan di sini juga.
  const catatanPenyimpanan = kondisi === 'rusak' ? (
      <div role="alert" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
        <strong className="block">Data lokal di browser ini tidak bisa dibaca.</strong>
        {IOT_SOURCE === 'api'
          ? 'Fitur selain IoT memakai data contoh yang disiapkan ulang di memori.'
          : 'Sistem memakai data contoh awal. Anda dapat memulihkan data contoh dari top bar.'}
        {IOT_SOURCE === 'local' && <button type="button" onClick={resetDemo} className="ml-2 underline font-semibold">Pulihkan data contoh</button>}
      </div>
    ) : null;

  if (location.pathname.startsWith('/d/')) {
    return <Routes><Route path="/d/:code" element={<DeviceClaim />} /></Routes>;
  }

  if (IOT_SOURCE === 'api' && sessionStatus === 'loading' && location.pathname !== '/masuk') {
    return <div role="status">Memeriksa sesi...</div>;
  }

  // Belum masuk → hanya halaman /masuk dan /daftar yang boleh dibuka.
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/masuk" element={<Login />} />
          {IOT_SOURCE === 'local' && <Route path="/daftar" element={<Daftar />} />}
          <Route path="*" element={<Navigate to="/masuk" replace />} />
        </Routes>
        <Toast />
      </div>
    );
  }

  // Pengguna biasa tidak boleh membuka alamat /admin, dan sebaliknya.
  // (Bila dipaksa lewat alamat, langsung dialihkan ke beranda role-nya.)
  if (!roleCanOpenPath(role, location.pathname)) return <Navigate to={role === 'pengelola' ? '/admin' : '/'} replace />;

  const match = TITLES.filter((row) => {
    if (row.path === '/') return location.pathname === '/' || location.pathname === '';
    return location.pathname === row.path || location.pathname.startsWith(row.path + '/');
  }).sort((a, b) => b.path.length - a.path.length)[0];

  return (
    <div className="min-h-screen">
      <SmartSidebar isOpen={menuOpen} onClose={closeMobileMenu} />

      <div className="shell-content pl-52 sm:pl-56 md:pl-64 xl:pl-72 flex flex-col min-h-screen">
        <SmartTopBar title={match?.title || 'SmartDashboard'} subtitle={match?.subtitle} onMenuClick={openMobileMenu} />

        <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-[1500px] mx-auto pb-16">
          {catatanPenyimpanan}
          <Routes>
            {/* ── Profil: tersedia untuk kedua role ── */}
            <Route path="/profil" element={<Profil />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="/monitoring" element={<Monitoring />} />

            {/* ── Role Pengguna: alamat akar ── */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/iot" element={<ListIot />} />
            <Route path="/iot/:id" element={<DeviceDetail />} />
            <Route path="/detail-informasi" element={<DetailInformation />} />
            <Route path="/area" element={<KelolaArea />} />
            <Route path="/area/:id" element={<AreaDetail />} />
            <Route path="/v-pet" element={<VPet />} />
            <Route path="/gamifikasi" element={<Gamifikasi />} />
            <Route path="/chatbot" element={<Chatbot />} />

            {/* ── Role Pengelola: alamat berawalan /admin ── */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/pengguna" element={<AdminUsers />} />
            <Route path="/admin/iot" element={<AdminIot />} />
            <Route path="/admin/kategori" element={<AdminCategories />} />
            <Route path="/admin/detail-informasi" element={<AdminDetailInformation />} />
            <Route path="/admin/area" element={<AdminAreas />} />
            <Route path="/admin/v-pet" element={<AdminVPet />} />
            <Route path="/admin/point" element={<AdminPoints />} />

            {/* Alamat tak dikenal: kembali ke beranda role yang sesuai */}
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to={role === 'pengelola' ? '/admin' : '/'} replace />} />
          </Routes>
        </main>

        <footer className="px-4 sm:px-6 py-4 border-t border-outline-variant/30 text-[11px] text-on-surface-variant">
          {IOT_SOURCE === 'api'
            ? 'JagoFarm SmartDashboard Aquaponik · Fitur non-IoT menggunakan data contoh.'
            : 'JagoFarm SmartDashboard Aquaponik · Data contoh farm tersimpan di browser. IoT contoh hanya berlaku selama sesi ini.'}
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
