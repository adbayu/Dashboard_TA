import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, AvatarPilih, Button, Card, Checkbox, Field, Input } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { PublicFrame, PublicPanel, SampleTag } from '../../shared/components/PublicFrame.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';
import { keluargaAvatar } from '../../shared/components/ui/avatarKeluarga.js';
import { AVATAR_PILIHAN } from '../../kelola-user/data/seed.js';

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
    icon: 'tractor',
    desc: 'Memantau kolam, mencatat pemantauan, HPP, dan panen di area yang ditugaskan pengelola.',
    catatan: 'Langsung aktif. Area kerja diatur pengelola setelah akun dibuat.',
  },
  {
    value: 'pengelola',
    label: 'Pengelola Farm',
    icon: 'shield-user',
    desc: 'Mengelola akun, perangkat IoT, kategori alat, area, virtual pet, dan sistem poin.',
    catatan: 'Perlu persetujuan pengelola yang sudah ada sebelum bisa masuk.',
  },
];

const FORM_AWAL = { name: '', email: '', phone: '', jabatan: '', avatar: AVATAR_PILIHAN[0] };
const LABEL_KELOMPOK = 'mb-2 p-0 text-sm font-semibold leading-5 text-text';

export default function Daftar() {
  const { register } = useSmart();
  const navigate = useNavigate();
  const [peran, setPeran] = useState('pengguna');
  const [form, setForm] = useState(FORM_AWAL);
  const [pw, setPw] = useState({ password: '', ulang: '' });
  const [galat, setGalat] = useState('');
  // Isian yang menyebabkan galat ('email' | 'password' | 'ulang'), supaya ditandai aria-invalid.
  const [galatField, setGalatField] = useState('');
  const galatDi = (field) => Boolean(galat) && galatField === field;
  const ariaGalat = (field) => (galatDi(field) ? 'galat-daftar' : undefined);
  const [lihatPassword, setLihatPassword] = useState(false);
  const [proses, setProses] = useState(false);
  const [berhasil, setBerhasil] = useState(null);

  const peranTerpilih = PERAN.find((p) => p.value === peran);

  async function kirim(e) {
    e.preventDefault();
    setGalat('');
    setGalatField('');
    if (pw.password !== pw.ulang) {
      setGalat('Konfirmasi password tidak sama.');
      setGalatField('ulang');
      return;
    }
    setProses(true);
    const hasil = register({ ...form, password: pw.password, role: peran });
    setProses(false);
    if (!hasil.ok) {
      setGalat(hasil.pesan);
      setGalatField(hasil.field || '');
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
      <PublicFrame>
        <Card pad="none" className="flex w-full max-w-lg flex-col gap-4 p-8">
          <h1 className="font-head text-[22px] font-bold leading-7 text-text">Pengajuan akun pengelola terkirim</h1>
          <p className="text-[15px] leading-[22px] text-text-2">
            Akun <strong className="text-text">{berhasil.email}</strong> tercatat sebagai pengelola
            dan sekarang berstatus <strong className="text-text">menunggu persetujuan</strong>.
            Hak pengelola memberi akses penuh ke seluruh farm, jadi harus disetujui pengelola yang sudah
            ada lewat menu <strong className="text-text">Kelola User</strong>.
          </p>
          <Alert tone="warn" icon="hourglass">
            Saat ini Anda belum bisa masuk dengan akun ini. Hubungi pengelola farm untuk menyetujuinya,
            atau daftar lagi sebagai operator farm bila hanya perlu memantau kolam.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Link to="/masuk">
              <Button>Ke halaman masuk</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setBerhasil(null);
                setPeran('pengguna');
                setForm(FORM_AWAL);
                setPw({ password: '', ulang: '' });
              }}
            >
              Daftar sebagai operator farm
            </Button>
          </div>
        </Card>
      </PublicFrame>
    );
  }

  return (
    <PublicFrame>
      <div className="grid w-full max-w-[1080px] grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-stretch gap-6">
        {/* Sisi kiri: penjelasan alur peran */}
        <PublicPanel>
          <div className="flex flex-col gap-3">
            <h1 className="text-balance font-head text-[32px] font-bold leading-[38px] tracking-tight">Buat akun JagoFarm</h1>
            <p className="max-w-[40ch] text-base leading-6">
              Pilih peran sesuai pekerjaan Anda. Peran menentukan menu dan data yang bisa dibuka.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {PERAN.map((p) => (
              <div key={p.value} className="flex items-start gap-2.5">
                <Icon name={p.icon} size={18} className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-sm leading-5 text-side-text-2">{p.catatan}</span>
                </div>
              </div>
            ))}
            <p className="border-t border-side-line pt-3.5 text-sm leading-5 text-side-text-2">
              Data demo: akun disimpan di browser ini saja (belum ada server autentikasi).
            </p>
          </div>
        </PublicPanel>

        {/* Sisi kanan: formulir */}
        <Card pad="none" className="flex flex-col gap-5 p-8">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-head text-[22px] font-bold leading-7 text-text">Daftar akun</h2>
              <SampleTag />
            </div>
            <p className="text-[15px] leading-[22px] text-text-2">
              Sudah punya akun?{' '}
              <Link to="/masuk" className={`rounded-control font-semibold text-primary underline underline-offset-[3px] hover:text-primary-hover ${FOKUS}`}>
                Masuk di sini
              </Link>
            </p>
          </div>

          <form onSubmit={kirim} className="flex flex-col gap-[18px]">
            {/* Pilihan peran: radio bawaan browser supaya panah dan fokus bekerja */}
            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className={LABEL_KELOMPOK}>Daftar sebagai</legend>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-2">
                {PERAN.map((p) => (
                  <label key={p.value} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="peran"
                      value={p.value}
                      checked={peran === p.value}
                      onChange={() => setPeran(p.value)}
                      className="peer sr-only"
                    />
                    <span className="flex h-full min-h-11 flex-col gap-1 rounded-card border border-border bg-surface p-3.5 text-left text-text peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-inset peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon name={p.icon} size={18} className="text-primary" />
                        {p.label}
                      </span>
                      <span className="text-sm leading-5 text-text-2">{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="flex items-start gap-1.5 text-sm leading-5 text-text-2">
                <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info-fg" />
                {peranTerpilih.catatan}
              </p>
            </fieldset>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
              <Field label="Nama lengkap">
                <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Rina Kartika" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="nama@jagofarm.id" autoComplete="username" required invalid={galatDi('email')} aria-describedby={ariaGalat('email')} />
              </Field>
              <Field label="Nomor telepon" optional>
                <Input type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="cth. 0812-3456-7890" />
              </Field>
              <Field label="Jabatan di farm" optional>
                <Input value={form.jabatan} onChange={(v) => setForm({ ...form, jabatan: v })} placeholder="cth. Operator Kolam" />
              </Field>
              <Field label="Password" hint="Minimal 6 karakter.">
                <Input
                  type={lihatPassword ? 'text' : 'password'}
                  value={pw.password}
                  onChange={(v) => setPw({ ...pw, password: v })}
                  autoComplete="new-password"
                  required
                  invalid={galatDi('password')}
                  aria-describedby={ariaGalat('password')}
                />
              </Field>
              <Field label="Ulangi password">
                <Input
                  type={lihatPassword ? 'text' : 'password'}
                  value={pw.ulang}
                  onChange={(v) => setPw({ ...pw, ulang: v })}
                  autoComplete="new-password"
                  required
                  invalid={galatDi('ulang')}
                  aria-describedby={ariaGalat('ulang')}
                />
              </Field>
            </div>

            <Checkbox
              label="Tampilkan password"
              checked={lihatPassword}
              onChange={(e) => setLihatPassword(e.target.checked)}
            />

            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={LABEL_KELOMPOK}>Foto profil</legend>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_PILIHAN.map((pilihan) => (
                  <AvatarPilih
                    key={pilihan.id}
                    avatar={pilihan}
                    nama={form.name}
                    size={44}
                    label={`Warna ${pilihan.nama}`}
                    terpilih={Boolean(form.avatar) && keluargaAvatar(form.avatar) === pilihan.keluarga}
                    onClick={() => setForm({ ...form, avatar: pilihan })}
                  />
                ))}
              </div>
            </fieldset>

            {galat && <Alert id="galat-daftar" tone="bad">{galat}</Alert>}

            <Button type="submit" size="lg" disabled={proses} className="w-full">
              {proses ? 'Mendaftarkan…' : peran === 'pengelola' ? 'Ajukan akun pengelola' : 'Daftar & masuk'}
            </Button>
          </form>
        </Card>
      </div>
    </PublicFrame>
  );
}
