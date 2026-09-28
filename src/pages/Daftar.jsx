import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSmart } from '../store/SmartStore';
import { Button, Field, Input } from '../components/ui';
import { AVATAR_PILIHAN } from '../data/seed';

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
        <div className="glass-panel rounded-3xl px-7 py-8 shadow-2xl w-full max-w-lg">
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
          className="rounded-3xl px-8 py-10 text-white shadow-2xl flex flex-col justify-between"
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
              Data demo — akun disimpan di browser ini saja (belum ada server autentikasi).
            </p>
          </div>
        </div>

        {/* Sisi kanan: formulir */}
        <div className="glass-panel rounded-3xl px-7 py-8 shadow-2xl">
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
                {AVATAR_PILIHAN.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setForm({ ...form, avatar: url })}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      form.avatar === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/40'
                    }`}
                    aria-label="Pilih foto profil"
                  >
                    <img src={url} alt="" className="w-12 h-12 object-cover" />
                  </button>
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
