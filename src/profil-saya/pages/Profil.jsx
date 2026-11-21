import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { Alert, Avatar, AvatarPilih, Badge, Button, Card, Field, Input, PageHeader, StatusPill, TextArea } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { ModeToggle } from '../../shared/theme/ModeToggle.jsx';
import { ThemePicker } from '../../shared/theme/ThemePicker.jsx';
import { useTampilan } from '../../shared/theme/TampilanProvider.jsx';
import { teksAktif } from '../../shared/theme/temaInfo.js';
import { keluargaAvatar } from '../../shared/components/ui/avatarKeluarga.js';
import { AVATAR_PILIHAN } from '../../kelola-user/data/seed.js';
import { passwordChangeAvailable } from '../../utils/frontendReview.js';
import { IOT_SOURCE } from '../../services/iotApi.js';

// Halaman profil: pemilik akun dapat mengubah data dirinya sendiri dan password demo lokal.
// Tombol Keluar ada di sini (bukan di sidebar) — di kartu ringkasan akun.
export default function Profil() {
  const { currentUser, updateProfile, changePassword, areas, role, logout } = useSmart();
  const navigate = useNavigate();
  const { tema, mode, resolvedMode, setTema, setMode } = useTampilan();

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
  const galatPw = (field) => pesanPw.tone === 'bad' && pesanPw.field === field;
  const [logoutError, setLogoutError] = useState('');

  if (!currentUser) {
    return <Card title="Belum ada sesi" subtitle="Masuk terlebih dahulu untuk melihat profil." />;
  }

  const areaSaya = areas.filter((a) => (currentUser.areaIds || []).includes(a.id));

  async function keluar() {
    setLogoutError('');
    const result = await logout();
    if (!result.ok) {
      setLogoutError(result.pesan);
      return;
    }
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
      setPesanPw({ tone: 'bad', text: 'Konfirmasi password baru tidak sama.', field: 'ulang' });
      return;
    }
    const hasil = changePassword(pw.lama, pw.baru);
    if (!hasil.ok) {
      setPesanPw({ tone: 'bad', text: hasil.pesan, field: hasil.field });
      return;
    }
    setPesanPw({ tone: 'ok', text: 'Password berhasil diganti. Gunakan password baru saat masuk berikutnya.' });
    setPw({ lama: '', baru: '', ulang: '' });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profil dan tampilan"
        subtitle="Atur akun Anda dan pilih tampilan dashboard."
        sample={IOT_SOURCE === 'local'}
      />

      {/* Tampilan: tema dan mode tersimpan di browser ini (jagofarm.tampilan) */}
      <Card title="Tampilan" subtitle="Pilihan tersimpan di browser ini dan berlaku di semua halaman, termasuk Masuk dan Daftar.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-semibold leading-[22px] text-text">Tema</h3>
            <ThemePicker value={tema} onChange={setTema} mode={resolvedMode} />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-[15px] font-semibold leading-[22px] text-text">Mode warna</h3>
              <ModeToggle value={mode} onChange={setMode} />
            </div>
            <p className="max-w-[46ch] flex-[1_1_260px] text-sm text-text-2">
              Ikuti sistem memakai pengaturan terang atau gelap di perangkat Anda. Mode dipilih terpisah dari tema.
            </p>
            <StatusPill tone="ok" icon="circle-check">{teksAktif(tema, resolvedMode)}</StatusPill>
          </div>
        </div>
      </Card>

      {/* Ringkasan akun */}
      <Card>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar avatar={form.avatar} nama={form.name || currentUser?.name} size={80} />
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-head text-2xl font-bold leading-tight text-text">{form.name || currentUser.name}</h2>
            <p className="text-sm text-text-2">{form.jabatan || 'Belum ada jabatan'} · {form.email}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
              <Badge tone="info" icon={role === 'pengelola' ? 'shield-user' : 'user'}>
                {role === 'pengelola' ? 'Pengelola' : role === 'mitra' ? 'Mitra' : 'Pengguna'}
              </Badge>
              <Badge tone={currentUser.status === 'aktif' ? 'ok' : 'muted'} icon={currentUser.status === 'aktif' ? 'circle-check' : 'clock'}>
                Akun {currentUser.status}
              </Badge>
              {currentUser.joinedAt && <Badge tone="muted" icon="calendar-days">Sejak {currentUser.joinedAt}</Badge>}
            </div>
          </div>

          {/* Tombol keluar akun — sengaja ditaruh di profil, bukan sidebar */}
          <Button variant="danger" icon="log-out" onClick={keluar} className="shrink-0">Keluar</Button>
        </div>
        {logoutError && <Alert tone="bad" className="mt-3">{logoutError}</Alert>}
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-6">
        {/* Form data diri */}
        <Card title="Ubah informasi profil" subtitle="Perubahan langsung tersimpan dan tampil di sidebar.">
          <form onSubmit={simpan} className="flex flex-col gap-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
              <Field label="Nama lengkap">
                <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
              </Field>
              <Field label="Nomor telepon">
                <Input type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" placeholder="cth. 0812-3456-7890" />
              </Field>
              <Field label="Jabatan / peran di farm">
                <Input value={form.jabatan} onChange={(v) => setForm({ ...form, jabatan: v })} placeholder="cth. Operator Kolam" />
              </Field>
            </div>

            <Field label="Tentang saya" hint="Ditampilkan pada halaman profil Anda.">
              <TextArea value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Ceritakan singkat tanggung jawab Anda di farm." />
            </Field>

            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 p-0 text-sm font-semibold leading-5 text-text">Foto profil</legend>
              <div className="flex flex-wrap gap-2.5">
                {AVATAR_PILIHAN.map((pilihan) => (
                  <AvatarPilih
                    key={pilihan.id}
                    avatar={pilihan}
                    nama={form.name}
                    size={48}
                    label={`Warna ${pilihan.nama}`}
                    terpilih={Boolean(form.avatar) && keluargaAvatar(form.avatar) === pilihan.keluarga}
                    onClick={() => setForm({ ...form, avatar: pilihan })}
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Simpan perubahan</Button>
              <Button
                type="button"
                variant="ghost"
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

        <Card
          title="Ganti password"
          subtitle={passwordChangeAvailable(IOT_SOURCE)
            ? 'Minimal 6 karakter. Password demo tersimpan di browser ini saja.'
            : 'Penggantian password belum tersedia dari dashboard.'}
        >
          {passwordChangeAvailable(IOT_SOURCE) ? (
            <form onSubmit={gantiPassword} className="flex flex-col gap-4">
              <Field label="Password lama">
                <Input type="password" value={pw.lama} onChange={(v) => setPw({ ...pw, lama: v })} autoComplete="current-password" required invalid={galatPw('lama')} aria-describedby={galatPw('lama') ? 'galat-password' : undefined} />
              </Field>
              <Field label="Password baru">
                <Input type="password" value={pw.baru} onChange={(v) => setPw({ ...pw, baru: v })} autoComplete="new-password" required invalid={galatPw('baru')} aria-describedby={galatPw('baru') ? 'galat-password' : undefined} />
              </Field>
              <Field label="Ulangi password baru">
                <Input type="password" value={pw.ulang} onChange={(v) => setPw({ ...pw, ulang: v })} autoComplete="new-password" required invalid={galatPw('ulang')} aria-describedby={galatPw('ulang') ? 'galat-password' : undefined} />
              </Field>

              {pesanPw.text && <Alert id="galat-password" tone={pesanPw.tone === 'ok' ? 'ok' : 'bad'} live={pesanPw.tone === 'ok' ? 'status' : undefined}>{pesanPw.text}</Alert>}

              <div>
                <Button type="submit" variant="secondary">Ganti password</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-text-2">Backend belum menyediakan perubahan password dari dashboard.</p>
          )}
        </Card>
      </div>

      {/* Area yang diampu */}
      <Card title="Area yang Anda ampu" subtitle="Ditetapkan oleh pengelola di menu Kelola User.">
        {areaSaya.length === 0 ? (
          <p className="text-sm text-text-2">Belum ada area yang ditugaskan ke akun Anda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areaSaya.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2">
                <Icon name="waves" size={18} className="shrink-0 text-primary" />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold leading-5 text-text">{a.name}</span>
                  <span className="text-sm leading-5 text-text-2">{a.commodity}</span>
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
