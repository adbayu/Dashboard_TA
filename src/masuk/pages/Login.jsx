import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, Avatar, Button, Card, Checkbox, Field, Input } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { PublicFrame, PublicPanel, SampleTag } from '../../shared/components/PublicFrame.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';
import { DEMO_PASSWORD } from '../../kelola-user/data/seed.js';
import { IOT_SOURCE } from '../../services/iotApi.js';
import { loginDestination } from '../../utils/roleAccess.js';

// Halaman masuk. Role TIDAK dipilih di sini — ditentukan oleh akun yang dipakai:
// akun pengguna masuk ke "/", akun pengelola masuk ke "/admin".
export default function Login() {
  const { login, users, resetDemoPassword, sessionError } = useSmart();
  const navigate = useNavigate();
  const location = useLocation();
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
    const returnTo = location.state?.from;
    const hasil = await login(email, password);
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan);
      return;
    }
    navigate(loginDestination(hasil.akun.role, returnTo), { replace: true });
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
    <PublicFrame>
      <div className="grid w-full max-w-[1080px] grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] items-stretch gap-6">
        {/* Sisi kiri: identitas aplikasi */}
        <PublicPanel>
          <div className="flex flex-col gap-3">
            <h1 className="text-balance font-head text-[32px] font-bold leading-[38px] tracking-tight">
              Masuk ke dashboard aquaponik Anda
            </h1>
            <p className="max-w-[42ch] text-base leading-6">
              Pantau kolam, perangkat IoT, HPP, hingga virtual pet dalam satu tempat. Masuk memakai
              akun yang sudah terdaftar di sistem.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm leading-5 text-side-text-2">
            {IOT_SOURCE === 'local' ? (
              <>
                <li className="flex items-start gap-2">
                  <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                  Data contoh. Perangkat IoT contoh hanya berlaku selama sesi ini.
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
                  Akun demo disimpan di browser ini.
                </li>
              </>
            ) : (
              <li className="flex items-start gap-2">
                <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
                Masuk memakai sesi backend JagoFarm.
              </li>
            )}
          </ul>
        </PublicPanel>

        {/* Sisi kanan: formulir */}
        <Card pad="none" className="flex flex-col gap-5 p-8">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-head text-[22px] font-bold leading-7 text-text">Masuk</h2>
              {IOT_SOURCE === 'local' && <SampleTag />}
            </div>
            <p className="text-[15px] leading-[22px] text-text-2">
              {IOT_SOURCE === 'local' ? (
                <>Belum punya akun?{' '}
                  <Link to="/daftar" className={`rounded-control font-semibold text-primary underline underline-offset-[3px] hover:text-primary-hover ${FOKUS}`}>Daftar di sini</Link>
                </>
              ) : 'Masuk dengan akun yang sudah terdaftar.'}
            </p>
          </div>

          {sessionError && <Alert tone="bad">{sessionError}</Alert>}

          <form onSubmit={kirim} className="flex flex-col gap-4">
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
              <Input
                type={lihatPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Password akun"
                autoComplete="current-password"
                required
              />
            </Field>

            <Checkbox
              label="Tampilkan password"
              checked={lihatPassword}
              onChange={(e) => setLihatPassword(e.target.checked)}
            />

            {galat && <Alert tone="bad">{galat}</Alert>}

            <Button type="submit" size="lg" disabled={proses} className="w-full">
              {proses ? 'Memeriksa…' : 'Masuk'}
            </Button>
          </form>

          {IOT_SOURCE === 'local' && (
            <div className="flex flex-col gap-2.5 border-t border-border pt-5">
              <p className="text-sm font-semibold leading-5 text-text">Akun demo: klik untuk mengisi</p>
              <div className="flex flex-col gap-2">
                {akunDemo.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => pakaiAkun(u)}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-control border border-border bg-surface-2 px-3 py-2 text-left text-text hover:border-primary ${FOKUS}`}
                  >
                    <Avatar avatar={u.avatar} nama={u.name} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{u.name}</span>
                      <span className="truncate text-sm leading-5 text-text-2">{u.email}</span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold leading-[18px] text-text-2">
                      {u.role === 'pengelola' ? 'Pengelola' : 'Pengguna'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-sm leading-5 text-text-2">
                Password semua akun demo: <span className="font-num font-semibold text-text">{DEMO_PASSWORD}</span>
              </p>
              {adaMenunggu.length > 0 && (
                <Alert tone="warn" icon="hourglass">
                  {adaMenunggu.length} pendaftar pengelola menunggu persetujuan, belum bisa masuk sampai
                  disetujui di menu Kelola User.
                </Alert>
              )}
            </div>
          )}
        </Card>
      </div>
    </PublicFrame>
  );
}
