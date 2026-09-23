import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { Badge, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../components/ui';

const empty = { name: '', email: '', role: 'pengguna', status: 'aktif', areaIds: [] };
const ROLES = [
  { value: 'pengguna', label: 'Pengguna (operator farm)' },
  { value: 'pengelola', label: 'Pengelola (admin sistem)' },
];

export default function AdminUsers() {
  const { users, areas, saveUser, removeUser, adjustPoints } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');

  const open = editing !== null || form !== empty;
  const closeModal = () => {
    setEditing(null);
    setForm(empty);
  };

  const startEdit = (user) => {
    setEditing(user);
    setForm({ ...empty, ...user });
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name || !form.email) return;
    saveUser(form);
    setMessage(`Akun ${form.email} ${editing ? 'diperbarui' : 'ditambahkan'}.`);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Akun" value={users.length} icon="group" hint="Pengguna & pengelola" />
        <StatCard label="Pengguna Aktif" value={users.filter((u) => u.status === 'aktif' && u.role === 'pengguna').length} icon="how_to_reg" hint="Dapat mengakses dashboard" />
        <StatCard label="Pengelola" value={users.filter((u) => u.role === 'pengelola').length} icon="shield_person" hint="Hak akses penuh sistem" />
        <StatCard label="Nonaktif" value={users.filter((u) => u.status !== 'aktif').length} icon="block" tone="warn" hint="Akses dibekukan" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kelola User"
          title="Akun pengguna sistem"
          subtitle="Tentukan peran akun dan area yang boleh dikelolanya. Perubahan berlaku langsung di dashboard pengguna."
          action={
            <Button icon="person_add" onClick={() => { setEditing(false); setForm(empty); }}>
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
                  {user.areaIds?.length ? user.areaIds.map((id) => areas.find((a) => a.id === id)?.name || id).join(', ') : '—'}
                </td>
                <td className="px-3 py-2 font-bold text-primary">{Number(user.points || 0).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2">
                  <Badge tone={user.status === 'aktif' ? 'ok' : 'muted'}>{user.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => startEdit(user)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Ubah akun">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => adjustPoints(user.id, 100)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                      title="Beri bonus 100 point"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_card</span>
                    </button>
                    <button onClick={() => setConfirm(user)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus akun">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-[11px] text-on-surface-variant">
          Saldo poin ditampilkan pada papan peringkat pengguna. Gunakan tombol <strong>add_card</strong> untuk memberi bonus 100 point.
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
                <div key={area.id} className="rounded-2xl border border-outline-variant/40 p-3">
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

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah akun — ${editing.name}` : 'Tambah pengguna baru'} wide>
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
            <Field label="Status akun">
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'aktif', label: 'Aktif' },
                  { value: 'nonaktif', label: 'Nonaktif' },
                ]}
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
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
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
