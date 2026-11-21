import { useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import {
  Alert, Avatar, Button, EmptyState, Field, FilterChip, IconButton, Input, Modal, PageHeader, Select, StatusPill, Table,
} from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { DEMO_PASSWORD, STATUS_AKUN } from '../data/seed.js';
import { pillStatusAkun } from '../model/statusAkun.js';
import { areaTone } from '../../kelola-area/model/areaTone.js';
import { ikonJenisArea, labelJenisArea } from '../../kelola-area/model/areaTampil.js';

const empty = { name: '', email: '', role: 'pengguna', status: 'aktif', areaIds: [], password: '' };
const ROLES = [
  { value: 'pengguna', label: 'Pengguna (operator farm)' },
  { value: 'pengelola', label: 'Pengelola (admin sistem)' },
];
const OPSI_STATUS = Object.entries(STATUS_AKUN).map(([value, label]) => ({ value, label }));
const FILTER_PERAN = [
  { value: 'semua', label: 'Semua' },
  { value: 'pengguna', label: 'Pengguna' },
  { value: 'pengelola', label: 'Pengelola' },
];
const FILTER_STATUS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'nonaktif', label: 'Nonaktif' },
];

export default function AdminUsers() {
  const { users, areas, saveUser, removeUser, adjustPoints, setUserStatus, currentUser } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  // Pesan hasil aksi: `bad` untuk penolakan formulir, `ok` untuk perubahan yang berhasil.
  const [message, setMessage] = useState(null);
  const [filterPeran, setFilterPeran] = useState('semua');
  const [filterStatus, setFilterStatus] = useState(null);
  const [cari, setCari] = useState('');

  // Pintu modal "tambah" tidak bisa memakai `form !== empty`: saat menambah, form
// di-set ke objek `empty` itu sendiri, sehingga perbandingannya SELALU false dan
// modal tidak pernah terbuka. Dipakai state khusus supaya tidak ada ketergantungan
// pada identitas objek.
  const [terbuka, setTerbuka] = useState(false);
  const open = terbuka;
  // Pendaftar yang menunggu persetujuan ditonjolkan di atas tabel supaya tidak
  // terlewat — akun pengelola tidak bisa masuk sebelum disetujui.
  const menunggu = users.filter((u) => u.status === 'menunggu');
  // Galat formulir hanya berlaku selama modal itu terbuka.
  const buangGalat = () => setMessage((kini) => (kini?.tone === 'bad' ? null : kini));
  const closeModal = () => {
    buangGalat();
    setEditing(null);
    setForm(empty);
    setTerbuka(false);
  };
  const bukaTambah = () => { buangGalat(); setEditing(false); setForm(empty); setTerbuka(true); };

  const startEdit = (user) => {
    buangGalat();
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
      setMessage({ tone: 'bad', text: `Email ${form.email} sudah dipakai akun lain. Pakai email berbeda.` });
      return;
    }
    saveUser({ ...form, email: emailBaru, password: (form.password || '').trim() || undefined });
    setMessage({
      tone: 'ok',
      text: `Akun ${form.email} ${editing ? 'diperbarui' : 'ditambahkan'}.${
        !editing ? ` Password awal: ${(form.password || '').trim() || DEMO_PASSWORD}` : ''
      }`,
    });
    closeModal();
  };

  // Menurunkan peran atau menonaktifkan akun sendiri sama saja mengunci diri dari halaman pengelola.
  const akunSendiri = Boolean(editing && editing.id === currentUser?.id);

  const toggleArea = (areaId) => {
    setForm((prev) => ({
      ...prev,
      areaIds: prev.areaIds.includes(areaId) ? prev.areaIds.filter((id) => id !== areaId) : [...prev.areaIds, areaId],
    }));
  };

  const setujui = (user, teks) => {
    setUserStatus(user.id, 'aktif');
    setMessage({ tone: 'ok', text: teks });
  };

  const kunci = cari.trim().toLowerCase();
  const tampil = users.filter((u) =>
    (filterPeran === 'semua' || u.role === filterPeran)
    && (!filterStatus || u.status === filterStatus)
    && (!kunci || [u.name, u.email].some((s) => (s || '').toLowerCase().includes(kunci))));
  const jumlahPeran = (peran) => (peran === 'semua' ? users.length : users.filter((u) => u.role === peran).length);
  const jumlahStatus = (status) => users.filter((u) => u.status === status).length;
  const namaArea = (id) => areas.find((a) => a.id === id)?.name || id;

  const kolom = [
    {
      key: 'name',
      label: 'Nama',
      render: (user) => (
        <span className="flex items-center gap-3">
          <Avatar avatar={user.avatar} nama={user.name} size="sm" />
          <span className="font-semibold">{user.name}</span>
        </span>
      ),
    },
    { key: 'email', label: 'Email', render: (user) => <span className="text-text-2">{user.email}</span> },
    { key: 'role', label: 'Peran', render: (user) => (user.role === 'pengelola' ? 'Pengelola' : 'Pengguna') },
    {
      key: 'area',
      label: 'Area akses',
      render: (user) => {
        if (user.areaIds?.length) return <span className="block max-w-[14rem]">{user.areaIds.map(namaArea).join(', ')}</span>;
        if (user.role === 'pengelola') return 'Semua area';
        return <span className="text-text-2">Belum ada</span>;
      },
    },
    { key: 'points', label: 'Poin', align: 'end', num: true, render: (user) => Number(user.points || 0).toLocaleString('id-ID') },
    {
      key: 'status',
      label: 'Status',
      render: (user) => {
        const pill = pillStatusAkun(user.status);
        return <StatusPill tone={pill.tone} icon={pill.icon}>{pill.text}</StatusPill>;
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: (user) => (
        <div className="flex flex-nowrap items-center justify-end gap-1">
          {user.status === 'menunggu' && (
            <IconButton icon="check" size="sm" onClick={() => setujui(user, `Akun ${user.email} disetujui.`)} label={`Setujui akun ${user.name}`} />
          )}
          <IconButton icon="pencil" size="sm" onClick={() => startEdit(user)} label={`Ubah akun ${user.name}`} />
          <IconButton icon="plus" size="sm" onClick={() => adjustPoints(user.id, 100)} label={`Beri bonus 100 poin untuk ${user.name}`} />
          {/* Akun yang sedang dipakai tidak bisa dihapus dari sini: pengelola akan terkunci dari sistem. */}
          {user.id !== currentUser?.id && (
            <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => setConfirm(user)} label={`Hapus akun ${user.name}`} />
          )}
        </div>
      ),
    },
  ];

  const kolomArea = [
    { key: 'name', label: 'Area', render: (area) => <span className="font-semibold">{area.name}</span> },
    {
      key: 'type',
      label: 'Tipe',
      render: (area) => (
        <span data-area={areaTone(area.type)} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span data-ui="area-icon" className="inline-flex"><IkonSlot icon={ikonJenisArea(area.type)} size={16} /></span>
          {labelJenisArea(area.type)}
        </span>
      ),
    },
    {
      key: 'owners',
      label: 'Penanggung jawab',
      render: (area) => {
        const owners = users.filter((u) => u.areaIds?.includes(area.id));
        return owners.length === 0
          ? <StatusPill tone="warn" icon="triangle-alert">Belum ada penanggung jawab</StatusPill>
          : owners.map((owner) => owner.name).join(', ');
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kelola pengguna"
        subtitle="Tentukan peran akun dan area yang boleh dikelolanya. Perubahan berlaku langsung di dashboard pengguna."
        actions={<Button icon="user-plus" onClick={bukaTambah}>Tambah pengguna</Button>}
      />

      <div className="flex flex-col gap-6">
        {/* Pendaftar pengelola harus disetujui dulu sebelum bisa masuk. */}
        {menunggu.map((u) => (
          <Alert
            key={u.id}
            tone="warn"
            title="Pengajuan akun Pengelola menunggu."
            action={(
              <div className="flex flex-wrap gap-2">
                <Button icon="check" onClick={() => setujui(u, `Akun ${u.email} disetujui sebagai pengelola.`)}>Setujui</Button>
                <Button
                  variant="ghost"
                  icon="x"
                  onClick={() => {
                    setUserStatus(u.id, 'nonaktif');
                    setMessage({ tone: 'ok', text: `Pengajuan ${u.email} ditolak (akun dinonaktifkan).` });
                  }}
                >
                  Tolak
                </Button>
              </div>
            )}
          >
            {u.name} ({u.email}) mendaftar pada {u.joinedAt}. Pengelola punya akses penuh ke seluruh farm, jadi akun dari formulir pendaftaran tidak langsung aktif.
          </Alert>
        ))}

        {message && !open && <Alert tone={message.tone} live={message.tone === 'bad' ? undefined : 'status'}>{message.text}</Alert>}

        <section aria-label="Akun pengguna sistem" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div role="group" aria-label="Filter peran" className="flex flex-wrap items-center gap-2">
              <span className="text-text-2">Peran</span>
              {FILTER_PERAN.map((item) => (
                <FilterChip key={item.value} active={filterPeran === item.value} count={jumlahPeran(item.value)} onClick={() => setFilterPeran(item.value)}>
                  {item.label}
                </FilterChip>
              ))}
            </div>
            <div role="group" aria-label="Filter status" className="flex flex-wrap items-center gap-2">
              <span className="text-text-2">Status</span>
              {FILTER_STATUS.map((item) => (
                <FilterChip
                  key={item.value}
                  active={filterStatus === item.value}
                  count={jumlahStatus(item.value)}
                  onClick={() => setFilterStatus((kini) => (kini === item.value ? null : item.value))}
                >
                  {item.label}
                </FilterChip>
              ))}
            </div>
            <div className="w-full sm:ml-auto sm:w-[280px]">
              <Input type="search" value={cari} onChange={setCari} placeholder="Cari nama atau email" aria-label="Cari pengguna" />
            </div>
          </div>

          {users.length === 0 ? (
            <EmptyState title="Belum ada pengguna" icon="users">Tambahkan akun pertama untuk farm ini.</EmptyState>
          ) : tampil.length === 0 ? (
            <EmptyState title="Tidak ada akun yang cocok" icon="search-x">Ubah filter atau kata pencarian.</EmptyState>
          ) : (
            <Table columns={kolom} rows={tampil} />
          )}
          <p className="text-sm text-text-2">
            Tombol plus di baris memberi bonus 100 poin. Saldo poin ditampilkan pada papan peringkat pengguna. Akun yang dibuat di sini bisa langsung masuk dengan password awal yang ditampilkan setelah akun dibuat.
          </p>
        </section>

        <section aria-labelledby="sebaran-area-judul" className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 id="sebaran-area-judul" className="font-head text-base font-bold leading-[22px] text-text">Penanggung jawab per area</h2>
            <p className="mt-1 text-sm text-text-2">Pastikan setiap operator hanya memantau kolam yang menjadi tanggung jawabnya.</p>
          </div>
          {areas.length === 0 ? (
            <EmptyState title="Belum ada area" icon="waves" />
          ) : (
            <Table columns={kolomArea} rows={areas} />
          )}
        </section>
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah akun: ${editing.name}` : 'Tambah pengguna baru'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama lengkap">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Siti Rahmawati" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="nama@jagofarm.id" required />
            </Field>
            <Field label="Peran" hint={akunSendiri ? 'Peran akun Anda sendiri tidak bisa diubah dari sini.' : undefined}>
              <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES} disabled={akunSendiri} />
            </Field>
            <Field
              label="Status akun"
              hint={akunSendiri ? 'Status akun Anda sendiri tidak bisa diubah dari sini.' : "Pilih 'Menunggu persetujuan' bila pengajuan pengelola belum diverifikasi."}
            >
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={OPSI_STATUS} disabled={akunSendiri} />
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
            <p className="mb-2 text-sm font-semibold text-text">Area yang dikelola</p>
            <div role="group" aria-label="Area yang dikelola" className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <FilterChip key={area.id} active={form.areaIds?.includes(area.id)} onClick={() => toggleArea(area.id)}>
                  {area.name}
                </FilterChip>
              ))}
            </div>
          </div>
          {message?.tone === 'bad' && <Alert tone="bad">{message.text}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" icon="save">{editing ? 'Simpan perubahan' : 'Tambah akun'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus akun pengguna">
        {confirm && (
          <div className="space-y-4">
            <p className="text-text-2">
              Akun <strong className="text-text">{confirm.name}</strong> ({confirm.email}) akan dihapus dari sistem. Data pemantauan yang pernah
              dibuat tetap tersimpan di riwayat area.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button
                variant="danger"
                icon="trash-2"
                onClick={() => {
                  removeUser(confirm.id);
                  setMessage({ tone: 'ok', text: `Akun ${confirm.email} dihapus.` });
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
