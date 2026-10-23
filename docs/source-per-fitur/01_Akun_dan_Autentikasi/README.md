# Fitur 1: Akun dan Autentikasi

Login, registrasi, profil pengguna, kelola pengguna (admin), keamanan password.

## Daftar File

| # | File | Lokasi Asli | Deskripsi |
|---|------|------------|-----------|
| 1 | Login.jsx | src/akun/pages/ | Halaman login |
| 2 | Daftar.jsx | src/akun/pages/ | Halaman pendaftaran |
| 3 | Profil.jsx | src/akun/pages/ | Halaman profil & ubah password |
| 4 | AdminUsers.jsx | src/akun/pages/ | Kelola pengguna (admin) |
| 5 | seed.js | src/akun/data/ | Data awal akun demo |
| 6 | security.ts | server/features/akun/ | Password hashing (backend) |

## Logika SmartStore Terkait Akun

File: `src/shared/store/SmartStore.jsx`
- **login()** → baris 429-468
- **logout()** → baris 469-472
- **register()** → baris 482-523
- **setUserStatus()** → baris 526-531
- **resetDemoPassword()** → baris 538-548
- **updateProfile()** → baris 550-556
- **changePassword()** → baris 557-568
- **saveUser() / removeUser()** → baris 734-762

---

## seed.js — Data awal akun demo

```js
// ── Pengguna (untuk kelola user oleh admin) ────────────────────────────────────
// ── Akun demo (login) ─────────────────────────────────────────────────────────
// CATATAN PENTING: password di bawah ini HANYA untuk demo di browser.
// Belum ada backend, jadi akun & password tersimpan apa adanya di localStorage —
// jangan dipakai untuk data sungguhan sebelum server autentikasi dibuat.
export const DEMO_PASSWORD = 'jagofarm123';

// Pilihan foto profil dipakai di dua tempat: halaman Daftar (akun baru) dan
// halaman Profil. Ditaruh di seed supaya daftarnya tidak ditulis dua kali dan
// tidak bisa berbeda antar halaman.
export const AVATAR_PILIHAN = [
  { id: 'hijau', warna: '#0f5238', warnaTeks: '#eafff4' },
  { id: 'teal', warna: '#0f766e', warnaTeks: '#eafff4' },
  { id: 'biru', warna: '#1e40af', warnaTeks: '#eafff4' },
  { id: 'ungu', warna: '#6d28d9', warnaTeks: '#f6f0ff' },
  { id: 'oranye', warna: '#b45309', warnaTeks: '#fff8ec' },
  { id: 'merah', warna: '#9f1239', warnaTeks: '#fff1f4' },
];

// Isi seed versi lama: foto orang dari Unsplash. Dipakai hanya untuk mengenali
// data localStorage yang sudah telanjur menyimpan nilai itu, lalu diganti avatar
// divalidasi oleh migrateState (R-23/R-38: jangan pakai foto orang sebagai
// identitas akun demo).
export const AVATAR_LAMA = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=250',
];

// Identitas akun demo = avatar divalidasi (inisial nama + warna), bukan foto orang.
// Bentuknya objek {id, warna, warnaTeks}; komponen memakai <Avatar> dari ui.jsx.
export const avatarKe = (seed, nama, email, warna) => ({
  id: `${seed}-${(email || nama || 'akun').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`,
  warna,
  warnaTeks: '#eafff4',
});

export const AVATAR_AKUN = AVATAR_PILIHAN; // nama lama dipakai di beberapa halaman

// Status akun. 'menunggu' dipakai untuk pendaftar PENGELOLA: hak akses
// pengelola tidak diberikan otomatis dari formulir publik — harus disetujui
// pengelola yang sudah ada. Pendaftar pengguna langsung 'aktif' karena hanya
// mendapat akses ke area yang ditugaskan (belum ada area = belum ada data).
export const STATUS_AKUN = {
  aktif: 'Aktif',
  menunggu: 'Menunggu persetujuan',
  nonaktif: 'Nonaktif',
};

export const SEED_USERS = [
  {
    id: 'U-001', name: 'Budi Santoso', email: 'budi@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-01', 'AR-03'], status: 'aktif', joinedAt: '2026-01-12', points: 1240,
    phone: '0812-3456-7890', jabatan: 'Operator Kolam', bio: 'Mengurus kolam nila dan pakcoy sejak 2026.',
    avatar: { id: 'U-001', warna: '#0f5238', warnaTeks: '#eafff4' },
  },
  {
    id: 'U-002', name: 'Siti Rahmawati', email: 'siti@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-02'], status: 'aktif', joinedAt: '2026-01-20', points: 980,
    phone: '0813-2233-4455', jabatan: 'Operator Growbed', bio: 'Fokus pada sayuran daun dan kualitas air.',
    avatar: { id: 'U-002', warna: '#0f766e', warnaTeks: '#eafff4' },
  },
  {
    id: 'U-003', name: 'Agus Priyanto', email: 'agus@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-03'], status: 'nonaktif', joinedAt: '2026-02-02', points: 410,
    phone: '0857-9988-7766', jabatan: 'Operator Tandon', bio: 'Menangani tandon dan pompa.',
    avatar: { id: 'U-003', warna: '#b45309', warnaTeks: '#fff8ec' },
  },
  {
    id: 'U-004', name: 'Hendra Wicaksono', email: 'hendra@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengelola', areaIds: [], status: 'aktif', joinedAt: '2026-01-01', points: 0,
    phone: '0811-1122-3344', jabatan: 'Pengelola Farm', bio: 'Mengelola perangkat IoT dan data seluruh area.',
    avatar: { id: 'U-004', warna: '#1e40af', warnaTeks: '#eafff4' },
  },
];
```

## Login.jsx — Halaman login

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSmart } from '../../../shared/store/SmartStore';
import { Avatar, Button, Field, Input } from '../../../shared/components/ui';
import { DEMO_PASSWORD } from '../data/seed.js';

// Halaman masuk. Role TIDAK dipilih di sini — ditentukan oleh akun yang dipakai:
// akun pengguna masuk ke "/", akun pengelola masuk ke "/admin".
export default function Login() {
  const { login, users, resetDemoPassword } = useSmart();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [proses, setProses] = useState(false);

  const akunDemo = users.filter((u) => u.status === 'aktif');
  const adaMenunggu = users.filter((u) => u.status === 'menunggu');

  async function kirim(e) {
    e.preventDefault();
    setGalat('');
    setProses(true);
    const hasil = await login(email, password);
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }
    navigate(hasil.akun.role === 'pengelola' ? '/admin' : '/', { replace: true });
  }

  function pakaiAkun(akun) {
    // Kembalikan password akun demo ke nilai seed dulu. Tanpa ini, akun demo yang
    // pernah diganti password-nya akan terus gagal login walau kolom sudah terisi.
    resetDemoPassword(akun.email);
    setEmail(akun.email);
    setPassword(DEMO_PASSWORD);
    setGalat('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid md:grid-cols-[1.1fr,1fr] gap-6 items-stretch">
        {/* Sisi kiri: identitas aplikasi */}
        <div
          className="rounded-3xl px-8 py-10 text-white shadow-glass-elevated flex flex-col justify-between"
          style={{ background: 'linear-gradient(165deg, rgb(56, 84, 49) 0%, rgb(38, 60, 34) 55%, rgb(27, 44, 25) 100%)' }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-accent/20 border border-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[26px] fill">eco</span>
              </div>
              <div className="leading-tight">
                <p className="text-xl font-extrabold tracking-tight">JagoFarm</p>
                <p className="text-xs font-semibold text-emerald-accent">SmartDashboard Aquaponik</p>
              </div>
            </div>
            <h1 className="mt-8 text-3xl font-extrabold leading-tight">Masuk ke dashboard aquaponik Anda</h1>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Pantau kolam, perangkat IoT, HPP, hingga virtual pet dalam satu tempat. Masuk memakai
              akun yang sudah terdaftar di sistem.
            </p>
          </div>
          <div className="mt-8 space-y-2 text-[12px] text-white/60">
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-accent">info</span>
              Data demo: belum terhubung perangkat IoT fisik.
            </p>
            <p className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-accent">lock</span>
              Akun disimpan di browser ini saja (belum ada server autentikasi).
            </p>
          </div>
        </div>

        {/* Sisi kanan: formulir */}
        <div className="glass-panel rounded-3xl px-7 py-8 shadow-glass-elevated flex flex-col">
          <h2 className="text-xl font-extrabold text-on-surface">Masuk</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Belum punya akun?{' '}
            <Link to="/daftar" className="font-bold text-primary hover:underline">
              Daftar di sini
            </Link>
          </p>

          <form onSubmit={kirim} className="mt-6 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="nama@jagofarm.id"
                autoComplete="username"
                required
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <Input
                  type={lihatPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label={lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <span className="material-symbols-outlined text-[18px]">{lihatPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </Field>

            {galat && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-300/60 px-3 py-2 text-sm font-semibold text-red-800 dark:text-red-200">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {galat}
              </p>
            )}

            <Button type="submit" disabled={proses} icon="login" className="w-full justify-center">
              {proses ? 'Memeriksa…' : 'Masuk'}
            </Button>
          </form>

          {/* Akun demo, supaya mudah dicoba */}
          <div className="mt-7 pt-5 border-t border-outline-variant/40">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Akun demo: klik untuk mengisi
            </p>
            <div className="space-y-2">
              {akunDemo.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pakaiAkun(u)}
                  className="w-full flex items-center gap-3 rounded-xl panel-inset px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/10 transition-all"
                >
                  <Avatar avatar={u.avatar} nama={u.name} size={36} className="rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-on-surface truncate">{u.name}</span>
                    <span className="block text-[11px] text-on-surface-variant truncate">{u.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {u.role === 'pengelola' ? 'Pengelola' : 'Pengguna'}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-on-surface-variant">
              Password semua akun demo: <span className="font-bold text-on-surface">{DEMO_PASSWORD}</span>
            </p>
            {adaMenunggu.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/20 px-3 py-2 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-amber-600">hourglass_top</span>
                {adaMenunggu.length} pendaftar pengelola menunggu persetujuan, belum bisa masuk sampai
                disetujui di menu Kelola User.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Daftar.jsx — Halaman pendaftaran

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSmart } from '../../../shared/store/SmartStore';
import { AvatarPilih, Button, Field, Input } from '../../../shared/components/ui';
import { AVATAR_PILIHAN } from '../data/seed.js';

// Halaman daftar akun sendiri (/daftar).
//
// Alur peran:
// - Pilih "Operator Farm" → akun langsung AKTIF. Aksesnya hanya ke area yang
//   ditugaskan pengelola, jadi pendaftar belum bisa melihat data apa pun
//   sebelum ditugaskan area.
// - Pilih "Pengelola Farm" → akun berstatus MENUNGGU. Hak pengelola itu akses
//   penuh ke seluruh farm, jadi tidak diberikan otomatis dari formulir publik;
//   pengelola yang sudah ada harus menyetujuinya di Kelola User.
const PERAN = [
  {
    value: 'pengguna',
    label: 'Operator Farm',
    icon: 'agriculture',
    desc: 'Memantau kolam, mencatat pemantauan, HPP, dan panen di area yang ditugaskan pengelola.',
    catatan: 'Langsung aktif. Area kerja diatur pengelola setelah akun dibuat.',
  },
  {
    value: 'pengelola',
    label: 'Pengelola Farm',
    icon: 'shield_person',
    desc: 'Mengelola akun, perangkat IoT, kategori alat, area, virtual pet, dan sistem poin.',
    catatan: 'Perlu persetujuan pengelola yang sudah ada sebelum bisa masuk.',
  },
];

export default function Daftar() {
  const { register } = useSmart();
  const navigate = useNavigate();
  const [peran, setPeran] = useState('pengguna');
  const [form, setForm] = useState({ name: '', email: '', phone: '', jabatan: '', avatar: AVATAR_PILIHAN[0] });
  const [pw, setPw] = useState({ password: '', ulang: '' });
  const [galat, setGalat] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [proses, setProses] = useState(false);
  const [berhasil, setBerhasil] = useState(null);

  const peranTerpilih = PERAN.find((p) => p.value === peran);

  async function kirim(e) {
    e.preventDefault();
    setGalat('');
    if (pw.password !== pw.ulang) {
      setGalat('Konfirmasi password tidak sama.');
      return;
    }
    setProses(true);
    const hasil = register({ ...form, password: pw.password, role: peran });
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }
    // register() sudah menyetel sesinya untuk operator farm, jadi tidak perlu
    // login ulang — cukup pindah halaman.
    if (!hasil.menungguPersetujuan) {
      navigate('/', { replace: true });
      return;
    }
    setBerhasil(hasil.akun);
  }

  // ── Layar hasil untuk pengajuan pengelola ─────────────────────────────────
  if (berhasil) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="glass-panel rounded-3xl px-7 py-8 shadow-glass-elevated w-full max-w-lg">
          <span className="material-symbols-outlined text-[40px] text-amber-600">hourglass_top</span>
          <h2 className="mt-2 text-xl font-extrabold text-on-surface">Pengajuan akun pengelola terkirim</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Akun <strong className="text-on-surface">{berhasil.email}</strong> tercatat sebagai pengelola
            dan sekarang berstatus <strong className="text-on-surface">menunggu persetujuan</strong>.
            Hak pengelola memberi akses penuh ke seluruh farm, jadi harus disetujui pengelola yang sudah
            ada lewat menu <strong className="text-on-surface">Kelola User</strong>.
          </p>
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/20 p-3 text-[12px] text-on-surface-variant">
            Saat ini Anda belum bisa masuk dengan akun ini. Hubungi pengelola farm untuk menyetujuinya,
            atau daftar lagi sebagai operator farm bila hanya perlu memantau kolam.
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/masuk">
              <Button icon="login">Ke halaman masuk</Button>
            </Link>
            <Button
              variant="ghost"
              icon="person_add"
              onClick={() => {
                setBerhasil(null);
                setPeran('pengguna');
                setForm({ name: '', email: '', phone: '', jabatan: '', avatar: AVATAR_PILIHAN[0] });
                setPw({ password: '', ulang: '' });
              }}
            >
              Daftar sebagai operator farm
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid md:grid-cols-[1fr,1.25fr] gap-6 items-stretch">
        {/* Sisi kiri: penjelasan alur peran */}
        <div
          className="rounded-3xl px-8 py-10 text-white shadow-glass-elevated flex flex-col justify-between"
          style={{ background: 'linear-gradient(165deg, rgb(56, 84, 49) 0%, rgb(38, 60, 34) 55%, rgb(27, 44, 25) 100%)' }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-accent/20 border border-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[26px] fill">eco</span>
              </div>
              <div className="leading-tight">
                <p className="text-xl font-extrabold tracking-tight">JagoFarm</p>
                <p className="text-xs font-semibold text-emerald-accent">SmartDashboard Aquaponik</p>
              </div>
            </div>
            <h1 className="mt-8 text-3xl font-extrabold leading-tight">Buat akun JagoFarm</h1>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Pilih peran sesuai pekerjaan Anda. Peran menentukan menu dan data yang bisa dibuka.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {PERAN.map((p) => (
              <div key={p.value} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-accent text-[20px] mt-0.5">{p.icon}</span>
                <div>
                  <p className="text-sm font-bold">{p.label}</p>
                  <p className="text-[12px] text-white/60 leading-snug">{p.catatan}</p>
                </div>
              </div>
            ))}
            <p className="text-[12px] text-white/50 leading-snug pt-2 border-t border-white/10">
              Data demo: akun disimpan di browser ini saja (belum ada server autentikasi).
            </p>
          </div>
        </div>

        {/* Sisi kanan: formulir */}
        <div className="glass-panel rounded-3xl px-7 py-8 shadow-glass-elevated">
          <h2 className="text-xl font-extrabold text-on-surface">Daftar akun</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="font-bold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>

          <form onSubmit={kirim} className="mt-6 space-y-4">
            {/* Pilihan peran */}
            <div>
              <p className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Daftar sebagai
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERAN.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPeran(p.value)}
                    className={`text-left rounded-2xl border p-3 transition-all ${
                      peran === p.value
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-outline-variant/50 hover:border-primary/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[20px] ${peran === p.value ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {p.icon}
                      </span>
                      <span className="text-sm font-bold text-on-surface">{p.label}</span>
                    </span>
                    <span className="mt-1 block text-[11px] text-on-surface-variant leading-snug">{p.desc}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-[11px] text-on-surface-variant">
                {peranTerpilih.catatan}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap">
                <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Rina Kartika" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="nama@jagofarm.id" autoComplete="username" required />
              </Field>
              <Field label="Nomor telepon" hint="Opsional.">
                <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="cth. 0812-3456-7890" />
              </Field>
              <Field label="Jabatan / peran di farm" hint="Opsional.">
                <Input value={form.jabatan} onChange={(v) => setForm({ ...form, jabatan: v })} placeholder="cth. Operator Kolam" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" hint="Minimal 6 karakter.">
                <div className="relative">
                  <Input
                    type={lihatPassword ? 'text' : 'password'}
                    value={pw.password}
                    onChange={(v) => setPw({ ...pw, password: v })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setLihatPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">{lihatPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </Field>
              <Field label="Ulangi password">
                <Input
                  type={lihatPassword ? 'text' : 'password'}
                  value={pw.ulang}
                  onChange={(v) => setPw({ ...pw, ulang: v })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>

            <div>
              <p className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Foto profil</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PILIHAN.map((pilihan) => (
                  <AvatarPilih
                    key={pilihan.id}
                    avatar={pilihan}
                    nama={form.name}
                    size={48}
                    terpilih={form.avatar?.id === pilihan.id}
                    onClick={() => setForm({ ...form, avatar: pilihan })}
                  />
                ))}
              </div>
            </div>

            {galat && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/25 border border-red-300/60 px-3 py-2 text-sm font-semibold text-red-800 dark:text-red-200">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {galat}
              </p>
            )}

            <Button type="submit" disabled={proses} icon="how_to_reg" className="w-full justify-center">
              {proses ? 'Mendaftarkan…' : peran === 'pengelola' ? 'Ajukan akun pengelola' : 'Daftar & masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

## Profil.jsx — Halaman profil

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmart } from '../../../shared/store/SmartStore';
import { Avatar, AvatarPilih, Badge, Button, Card, Field, Input, SectionTitle, StatCard, TextArea } from '../../../shared/components/ui';
import { AVATAR_PILIHAN } from '../data/seed.js';

// Halaman profil: pemilik akun dapat mengubah data dirinya sendiri + ganti password.
// Tombol Keluar ada di sini (bukan di sidebar) — di kartu ringkasan akun.
export default function Profil() {
  const { currentUser, updateProfile, changePassword, areas, role, points, logout } = useSmart();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    jabatan: currentUser?.jabatan || '',
    bio: currentUser?.bio || '',
    avatar: currentUser?.avatar || '',
  }));
  const [pw, setPw] = useState({ lama: '', baru: '', ulang: '' });
  const [pesanPw, setPesanPw] = useState({ tone: '', text: '' });

  if (!currentUser) {
    return (
      <Card>
        <SectionTitle title="Belum ada sesi" subtitle="Masuk terlebih dahulu untuk melihat profil." />
      </Card>
    );
  }

  const areaSaya = areas.filter((a) => (currentUser.areaIds || []).includes(a.id));

  function keluar() {
    logout();
    navigate('/masuk', { replace: true });
  }

  function simpan(e) {
    e.preventDefault();
    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      jabatan: form.jabatan.trim(),
      bio: form.bio.trim(),
      avatar: form.avatar,
    });
  }

  function gantiPassword(e) {
    e.preventDefault();
    setPesanPw({ tone: '', text: '' });
    if (pw.baru !== pw.ulang) {
      setPesanPw({ tone: 'bad', text: 'Konfirmasi password baru tidak sama.' });
      return;
    }
    const hasil = changePassword(pw.lama, pw.baru);
    if (!hasil.ok) {
      setPesanPw({ tone: 'bad', text: hasil.pesan });
      return;
    }
    setPesanPw({ tone: 'ok', text: 'Password berhasil diganti. Gunakan password baru saat masuk berikutnya.' });
    setPw({ lama: '', baru: '', ulang: '' });
  }

  return (
    <div className="space-y-6">
      {/* Ringkasan akun */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar avatar={form.avatar} nama={form.name || currentUser?.name} size={80} className="rounded-2xl ring-4 ring-primary/20" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">Profil Saya</p>
            <h2 className="text-2xl font-extrabold text-on-surface leading-tight">{form.name || currentUser.name}</h2>
            <p className="text-sm text-on-surface-variant">{form.jabatan || 'Belum ada jabatan'} · {form.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="brand" icon={role === 'pengelola' ? 'shield_person' : 'person'}>
                {role === 'pengelola' ? 'Pengelola' : 'Pengguna'}
              </Badge>
              <Badge tone={currentUser.status === 'aktif' ? 'ok' : 'muted'}>
                Akun {currentUser.status}
              </Badge>
              <Badge tone="info">Sejak {currentUser.joinedAt}</Badge>
            </div>
          </div>

          {/* Tombol keluar akun — sengaja ditaruh di profil, bukan sidebar */}
          <button
            type="button"
            onClick={keluar}
            className="tombol-keluar shrink-0 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-red-500/40 px-4 text-[13px] font-bold text-red-600 hover:bg-red-600/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Keluar
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total Point" value={points.toLocaleString('id-ID')} icon="stars" hint="Dari aktivitas Anda" />
        <StatCard label="Area Diampu" value={areaSaya.length} icon="water" hint="Kolam / growbed" />
        <StatCard label="Kode Akun" value={currentUser.id} icon="badge" hint="Identitas di sistem" />
        <StatCard label="Device Terpantau" value={currentUser.areaIds?.length || 0} icon="sensors" hint="Area yang Anda pegang" />
      </div>

      {/* Form data diri */}
      <Card>
        <SectionTitle
          eyebrow="Data Diri"
          title="Ubah informasi profil"
          subtitle="Perubahan langsung tersimpan dan tampil di sidebar."
        />
        <form onSubmit={simpan} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama lengkap">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            </Field>
            <Field label="Nomor telepon">
              <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="cth. 0812-3456-7890" />
            </Field>
            <Field label="Jabatan / peran di farm">
              <Input value={form.jabatan} onChange={(v) => setForm({ ...form, jabatan: v })} placeholder="cth. Operator Kolam" />
            </Field>
          </div>

          <Field label="Tentang saya" hint="Ditampilkan pada halaman profil Anda.">
            <TextArea value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Ceritakan singkat tanggung jawab Anda di farm." />
          </Field>

          <div>
            <p className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Foto profil</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PILIHAN.map((pilihan) => (
                <AvatarPilih
                  key={pilihan.id}
                  avatar={pilihan}
                  nama={form.name}
                  size={56}
                  terpilih={form.avatar?.id === pilihan.id}
                  onClick={() => setForm({ ...form, avatar: pilihan })}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" icon="save">Simpan perubahan</Button>
            <Button
              type="button"
              variant="ghost"
              icon="undo"
              onClick={() =>
                setForm({
                  name: currentUser.name || '',
                  email: currentUser.email || '',
                  phone: currentUser.phone || '',
                  jabatan: currentUser.jabatan || '',
                  bio: currentUser.bio || '',
                  avatar: currentUser.avatar || '',
                })
              }
            >
              Kembalikan
            </Button>
          </div>
        </form>
      </Card>

      {/* Ganti password */}
      <Card>
        <SectionTitle
          eyebrow="Keamanan"
          title="Ganti password"
          subtitle="Minimal 6 karakter. Password demo tersimpan di browser ini saja."
        />
        <form onSubmit={gantiPassword} className="space-y-4 max-w-md">
          <Field label="Password lama">
            <Input type="password" value={pw.lama} onChange={(v) => setPw({ ...pw, lama: v })} required />
          </Field>
          <Field label="Password baru">
            <Input type="password" value={pw.baru} onChange={(v) => setPw({ ...pw, baru: v })} required />
          </Field>
          <Field label="Ulangi password baru">
            <Input type="password" value={pw.ulang} onChange={(v) => setPw({ ...pw, ulang: v })} required />
          </Field>

          {pesanPw.text && (
            <p
              role="status"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                pesanPw.tone === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-300/60 text-emerald-900 dark:text-emerald-100'
                  : 'bg-red-50 dark:bg-red-900/25 border-red-300/60 text-red-800 dark:text-red-200'
              }`}
            >
              {pesanPw.text}
            </p>
          )}

          <Button type="submit" icon="lock_reset" variant="soft">Ganti password</Button>
        </form>
      </Card>

      {/* Area yang diampu */}
      <Card>
        <SectionTitle eyebrow="Penugasan" title="Area yang Anda ampu" subtitle="Ditetapkan oleh pengelola di menu Kelola User." />
        {areaSaya.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada area yang ditugaskan ke akun Anda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areaSaya.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-xl panel-inset px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-primary">water</span>
                <span>
                  <span className="block text-sm font-bold text-on-surface">{a.name}</span>
                  <span className="block text-[11px] text-on-surface-variant">{a.commodity}</span>
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

## AdminUsers.jsx — Kelola pengguna (admin)

```jsx
import { useState } from 'react';
import { useSmart } from '../../../shared/store/SmartStore';
import { Avatar, IconButton, Badge, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../../shared/components/ui';
import { DEMO_PASSWORD, STATUS_AKUN } from '../data/seed.js';

const empty = { name: '', email: '', role: 'pengguna', status: 'aktif', areaIds: [], password: '' };
const ROLES = [
  { value: 'pengguna', label: 'Pengguna (operator farm)' },
  { value: 'pengelola', label: 'Pengelola (admin sistem)' },
];
const OPSI_STATUS = Object.entries(STATUS_AKUN).map(([value, label]) => ({ value, label }));

export default function AdminUsers() {
  const { users, areas, saveUser, removeUser, adjustPoints, setUserStatus } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');

  // Pintu modal "tambah" tidak bisa memakai `form !== empty`: saat menambah, form
// di-set ke objek `empty` itu sendiri, sehingga perbandingannya SELALU false dan
// modal tidak pernah terbuka. Dipakai state khusus supaya tidak ada ketergantungan
// pada identitas objek.
  const [terbuka, setTerbuka] = useState(false);
  const open = terbuka;
  // Pendaftar yang menunggu persetujuan ditonjolkan di atas tabel supaya tidak
  // terlewat — akun pengelola tidak bisa masuk sebelum disetujui.
  const menunggu = users.filter((u) => u.status === 'menunggu');
  const closeModal = () => {
    setEditing(null);
    setForm(empty);
    setTerbuka(false);
  };

  const startEdit = (user) => {
    setEditing(user);
    setForm({ ...empty, ...user });
    setTerbuka(true);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name || !form.email) return;
    const emailBaru = (form.email || '').trim().toLowerCase();
    const dipakai = users.some((u) => (u.email || '').toLowerCase() === emailBaru && u.id !== form.id);
    if (dipakai) {
      setMessage(`Email ${form.email} sudah dipakai akun lain. Pakai email berbeda.`);
      return;
    }
    saveUser({ ...form, email: emailBaru, password: (form.password || '').trim() || undefined });
    setMessage(
      `Akun ${form.email} ${editing ? 'diperbarui' : 'ditambahkan'}.${
        !editing ? ` Password awal: ${(form.password || '').trim() || DEMO_PASSWORD}` : ''
      }`,
    );
    closeModal();
  };

  const toggleArea = (areaId) => {
    setForm((prev) => ({
      ...prev,
      areaIds: prev.areaIds.includes(areaId) ? prev.areaIds.filter((id) => id !== areaId) : [...prev.areaIds, areaId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total Akun" value={users.length} icon="group" hint="Pengguna & pengelola" />
        <StatCard label="Pengguna Aktif" value={users.filter((u) => u.status === 'aktif' && u.role === 'pengguna').length} icon="how_to_reg" hint="Dapat mengakses dashboard" />
        <StatCard label="Pengelola" value={users.filter((u) => u.role === 'pengelola').length} icon="shield_person" hint="Hak akses penuh sistem" />
        <StatCard label="Nonaktif" value={users.filter((u) => u.status === 'nonaktif').length} icon="block" tone="warn" hint="Akses dibekukan" />
        <StatCard
          label="Menunggu Persetujuan"
          value={menunggu.length}
          icon="hourglass_top"
          tone={menunggu.length ? 'warn' : 'ok'}
          hint="Pendaftar akun pengelola"
        />
      </div>

      {/* Pendaftar pengelola harus disetujui dulu sebelum bisa masuk. */}
      {menunggu.length > 0 && (
        <Card>
          <SectionTitle
            eyebrow="Perlu Persetujuan"
            title="Pengajuan akun pengelola"
            subtitle="Pengelola punya akses penuh ke seluruh farm, jadi akun dari formulir pendaftaran tidak langsung aktif."
          />
          <div className="space-y-3">
            {menunggu.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/20 p-3">
                <Avatar avatar={u.avatar} nama={u.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-on-surface">{u.name}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {u.email} · mendaftar {u.joinedAt} · meminta peran <strong className="text-on-surface">Pengelola</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    icon="check_circle"
                    onClick={() => {
                      setUserStatus(u.id, 'aktif');
                      setMessage(`Akun ${u.email} disetujui sebagai pengelola.`);
                    }}
                  >
                    Setujui
                  </Button>
                  <Button
                    variant="ghost"
                    icon="close"
                    onClick={() => {
                      setUserStatus(u.id, 'nonaktif');
                      setMessage(`Pengajuan ${u.email} ditolak (akun dinonaktifkan).`);
                    }}
                  >
                    Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle
          eyebrow="Kelola User"
          title="Akun pengguna sistem"
          subtitle="Tentukan peran akun dan area yang boleh dikelolanya. Perubahan berlaku langsung di dashboard pengguna."
          action={
            <Button icon="person_add" onClick={() => { setEditing(false); setForm(empty); setTerbuka(true); }}>
              Tambah pengguna
            </Button>
          }
        />
        {message && (
          <p role="status" className="mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300/60 px-3 py-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {message}
          </p>
        )}
        {users.length === 0 ? (
          <Empty title="Belum ada pengguna" icon="group" hint="Tambahkan akun pertama untuk farm ini." />
        ) : (
          <Table head={['Nama', 'Email', 'Peran', 'Area', 'Poin', 'Status', '']}>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 font-semibold text-on-surface">{user.name}</td>
                <td className="px-3 py-2 text-on-surface-variant">{user.email}</td>
                <td className="px-3 py-2">
                  <Badge tone={user.role === 'pengelola' ? 'brand' : 'info'}>{user.role === 'pengelola' ? 'Pengelola' : 'Pengguna'}</Badge>
                </td>
                <td className="px-3 py-2 text-on-surface-variant max-w-[200px]">
                  {user.areaIds?.length ? user.areaIds.map((id) => areas.find((a) => a.id === id)?.name || id).join(', ') : '·'}
                </td>
                <td className="px-3 py-2 font-bold text-primary">{Number(user.points || 0).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2">
                  <Badge tone={user.status === 'aktif' ? 'ok' : user.status === 'menunggu' ? 'warn' : 'muted'}>
                    {STATUS_AKUN[user.status] || user.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {user.status === 'menunggu' && (
                      <IconButton icon="check_circle" size="sm" className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => { setUserStatus(user.id, 'aktif'); setMessage(`Akun ${user.email} disetujui.`); }} title="Setujui akun ini" />
                    )}
                    <IconButton icon="edit" size="sm" onClick={() => startEdit(user)} title="Ubah akun" />
                    <IconButton icon="add_card" size="sm" onClick={() => adjustPoints(user.id, 100)} title="Beri bonus 100 point" />
                    <IconButton icon="delete" tone="bad" size="sm" onClick={() => setConfirm(user)} title="Hapus akun" />
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-[11px] text-on-surface-variant">
          Saldo poin ditampilkan pada papan peringkat pengguna. Gunakan tombol <strong>add_card</strong> untuk memberi bonus 100 point.
          Akun yang dibuat di sini bisa langsung masuk dengan password awal di atas.
        </p>
      </Card>

      <Card>
        <SectionTitle eyebrow="Hak Akses Area" title="Sebaran area per akun" subtitle="Memastikan setiap operator hanya memantau kolam yang menjadi tanggung jawabnya." />
        {areas.length === 0 ? (
          <Empty title="Belum ada area" icon="water" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((area) => {
              const owners = users.filter((u) => u.areaIds?.includes(area.id));
              return (
                <div key={area.id} className="rounded-2xl border border-outline-variant/40 p-3 h-full min-w-0">
                  <p className="font-bold text-on-surface text-sm">{area.name}</p>
                  <p className="text-[11px] text-on-surface-variant mb-2">{area.location}</p>
                  {owners.length === 0 ? (
                    <Badge tone="warn">Belum ada penanggung jawab</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {owners.map((owner) => (
                        <Badge key={owner.id} tone="ok">
                          {owner.name.split(' ')[0]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah akun: ${editing.name}` : 'Tambah pengguna baru'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama lengkap">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Siti Rahmawati" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="nama@jagofarm.id" required />
            </Field>
            <Field label="Peran">
              <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES} />
            </Field>
            <Field label="Status akun" hint="Pilih 'Menunggu persetujuan' bila pengajuan pengelola belum diverifikasi.">
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={OPSI_STATUS} />
            </Field>
            <Field
              label={editing ? 'Password (biarkan kosong bila tidak diganti)' : 'Password awal'}
              hint={editing ? 'Kosongkan agar password lama tetap dipakai.' : `Kosongkan untuk memakai password demo: ${DEMO_PASSWORD}`}
            >
              <Input
                type="text"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                placeholder={editing ? '••••••••' : DEMO_PASSWORD}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Area yang dikelola</p>
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => {
                const picked = form.areaIds?.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className={`inline-flex items-center h-7 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                      picked ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    {area.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" icon="save">{editing ? 'Simpan perubahan' : 'Tambah akun'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus akun pengguna">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Akun <strong className="text-on-surface">{confirm.name}</strong> ({confirm.email}) akan dihapus dari sistem. Data pemantauan yang pernah
              dibuat tetap tersimpan di riwayat area.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button
                variant="danger"
                icon="delete"
                onClick={() => {
                  removeUser(confirm.id);
                  setMessage(`Akun ${confirm.email} dihapus.`);
                  setConfirm(null);
                }}
              >
                Hapus akun
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
```

## security.ts — Password hashing (backend)

```ts
import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from 'node:crypto';
const passwordOptions = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  deriveKey(password, salt, 64, passwordOptions, (error, key) => error ? reject(error) : resolve(key));
});
export const secret = () => randomBytes(32).toString('hex');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password: string) {
  const salt = secret();
  const key = await scrypt(password, salt);
  return salt + ':' + key.toString('hex');
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  const actual = await scrypt(password, salt);
  const expected = Buffer.from(encoded, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```
