import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';
import { Avatar, Button, Field, Input } from '../components/ui';
import { DEMO_PASSWORD } from '../data/seed';

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
