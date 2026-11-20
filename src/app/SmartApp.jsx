import { useCallback, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SmartProvider, useSmart } from '../shared/store/SmartStore';
import SmartSidebar from './layout/SmartSidebar';
import SmartTopBar from './layout/SmartTopBar';
import { Alert, Button } from '../shared/components/ui';
import { Icon } from '../shared/components/Icon.jsx';

import Dashboard from '../dashboard/pages/Dashboard';
import Profil from '../profil-saya/pages/Profil';
import Login from '../masuk/pages/Login';
import Daftar from '../daftar/pages/Daftar';
import ListIot, { DeviceDetail } from '../list-iot/pages/ListIot';
import DetailInformation from '../detail-information/pages/DetailInformation';
import DeviceClaim from '../kelola-area/pages/DeviceClaim';
import KelolaArea from '../kelola-area/pages/KelolaArea';
import AreaDetail from '../kelola-area/pages/AreaDetail';
import VPet from '../v-pet/pages/VPet';
import Gamifikasi from '../gamifikasi/pages/Gamifikasi';
import Chatbot from '../chatbot-aquaponik/pages/Chatbot';

import AdminDashboard from '../dashboard-pengelola/pages/AdminDashboard';
import AdminUsers from '../kelola-user/pages/AdminUsers';
import AdminIot from '../kelola-iot/pages/AdminIot';
import AdminCategories from '../kategori-device/pages/AdminCategories';
import AdminAreas from '../kelola-area/pages/AdminAreas';
import AdminVPet from '../kelola-virtual-pet/pages/AdminVPet';
import AdminPoints from '../sistem-point/pages/AdminPoints';
import AdminDetailInformation from '../detail-information/pages/AdminDetailInformation';
import { IOT_SOURCE } from '../services/iotApi.js';
import Developer from '../kelola-area/pages/Developer';
import Monitoring from '../kelola-area/pages/Monitoring';
import DeviceLog from '../kelola-area/pages/DeviceLog';
import { loginDestination, roleCanOpenPath } from '../utils/roleAccess.js';

// Judul halaman untuk top bar. Judul mengikuti label menu kanvas (Ruling R12);
// subtitle hanya dipasang bila menambah informasi di luar judul.
const TITLES = [
  { path: '/admin/pengguna', title: 'Pengguna', subtitle: 'Akun pengguna, peran, dan area tanggung jawab' },
  { path: '/admin/iot', title: 'Alat IoT', subtitle: 'Registrasi perangkat, kalibrasi, dan QR penjelas alat' },
  { path: '/developer', title: 'Developer', subtitle: 'API key dan pemakaian API' },
  { path: '/monitoring', title: 'Monitoring', subtitle: 'Nilai sensor, area, dan kejadian perangkat live' },
  { path: '/admin/kategori', title: 'Kategori alat', subtitle: 'Jenis alat beserta parameter dan ambang idealnya' },
  { path: '/admin/detail-informasi', title: 'Detail informasi', subtitle: 'Penjelasan alat yang sama dengan yang dibaca pengguna' },
  { path: '/admin/area', title: 'Area', subtitle: 'Kolam, growbed, dan tandon yang sudah dipasangi IoT' },
  { path: '/admin/v-pet', title: 'V-Pet', subtitle: 'Jenis, kondisi, dan area pemantauan virtual pet' },
  { path: '/admin/point', title: 'Sistem poin', subtitle: 'Aturan poin, badge, dan saldo pengguna' },
  { path: '/admin', title: 'Dashboard pengelola', subtitle: 'Ringkasan seluruh sistem aquaponik' },
  { path: '/profil', title: 'Profil dan tampilan', subtitle: 'Atur akun Anda dan pilih tampilan dashboard' },
  { path: '/detail-informasi', title: 'Pindai QR', subtitle: 'Penjelasan lengkap perangkat dari kode QR alat' },
  { path: '/iot', title: 'Alat IoT' },
  { path: '/iot/:id/log', title: 'Log sensor' },
  { path: '/area', title: 'Area & kolam', subtitle: 'HPP dan pemantauan kolam Anda' },
  { path: '/v-pet', title: 'V-Pet', subtitle: 'Pemantauan farm dalam bentuk hewan peliharaan' },
  { path: '/gamifikasi', title: 'Misi & poin', subtitle: 'Badge dan papan peringkat' },
  { path: '/chatbot', title: 'Chatbot akuaponik', subtitle: 'Tanya seputar ikan, sayur, dan sistem aquaponik' },
  { path: '/', title: 'Pantauan' },
];

function Toast() {
  const { toast } = useSmart();
  if (!toast) return null;
  const warn = toast.tone === 'warn';
  return (
    <div className="fixed bottom-5 right-5 z-[70] max-w-sm">
      <div
        data-ui="toast"
        className={`flex items-start gap-2 rounded-card border px-4 py-3 text-sm font-semibold ${
          warn ? 'border-warn-line bg-warn-bg text-warn-fg' : 'border-ok-fg bg-ok-bg text-ok-fg'
        }`}
        role="status"
      >
        <Icon name={warn ? 'triangle-alert' : 'circle-check'} size={20} className="shrink-0" />
        <span className="text-text">{toast.message}</span>
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
      <Alert
        tone="warn"
        title="Data lokal di browser ini tidak bisa dibaca."
        className="mb-4"
        action={IOT_SOURCE === 'local' && <Button variant="secondary" size="sm" icon="rotate-ccw" onClick={resetDemo}>Pulihkan data contoh</Button>}
      >
        {IOT_SOURCE === 'api'
          ? 'Fitur selain IoT memakai data contoh yang disiapkan ulang di memori.'
          : 'Sistem memakai data contoh awal. Anda dapat memulihkan data contoh dari top bar.'}
      </Alert>
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

  if (isLoggedIn && location.pathname === '/masuk') {
    return <Navigate to={loginDestination(role, location.state?.from)} replace />;
  }

  // Pengguna biasa tidak boleh membuka alamat /admin, dan sebaliknya.
  // (Bila dipaksa lewat alamat, langsung dialihkan ke beranda role-nya.)
  const homePath = role === 'pengelola' ? '/admin' : role === 'mitra' ? '/developer' : '/';
  if (!roleCanOpenPath(role, location.pathname)) return <Navigate to={homePath} replace />;

  const match = TITLES.filter((row) => {
    if (row.path === '/') return location.pathname === '/' || location.pathname === '';
    if (row.path === '/iot/:id/log') return /^\/iot\/[^/]+\/log$/.test(location.pathname);
    return location.pathname === row.path || location.pathname.startsWith(row.path + '/');
  }).sort((a, b) => b.path.length - a.path.length)[0];

  return (
    <div className="min-h-screen">
      <SmartSidebar isOpen={menuOpen} onClose={closeMobileMenu} />

      <div data-ui="shell-content" className="shell-content pl-52 sm:pl-56 md:pl-64 xl:pl-72 flex flex-col min-h-screen">
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
            <Route path="/iot/:id/log" element={<DeviceLog />} />
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
            <Route path="*" element={<Navigate to={homePath} replace />} />
          </Routes>
        </main>

        <footer className="border-t border-border px-4 py-4 text-xs text-text-2 sm:px-6">
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
