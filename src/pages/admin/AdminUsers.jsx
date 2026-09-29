import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { Avatar, IconButton, Badge, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../components/ui';
import { DEMO_PASSWORD, STATUS_AKUN } from '../../data/seed';

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
