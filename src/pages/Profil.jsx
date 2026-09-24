import { useState } from 'react';
import { useSmart } from '../store/SmartStore';
import { Badge, Button, Card, Field, Input, SectionTitle, StatCard, TextArea } from '../components/ui';

const AVATAR_PILIHAN = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=250',
];

// Halaman profil: pemilik akun dapat mengubah data dirinya sendiri + ganti password.
export default function Profil() {
  const { currentUser, updateProfile, changePassword, areas, role, points } = useSmart();

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
          <img
            src={form.avatar}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/20"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Profil Saya</p>
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
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <img src={url} alt="" className="w-14 h-14 object-cover" />
                </button>
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
              <span key={a.id} className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-white/60 dark:bg-white/5 px-3 py-2">
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
