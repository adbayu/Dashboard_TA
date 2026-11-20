import { useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import {
  Button, Checkbox, EmptyState, Field, IconButton, Input, Modal, NumberInput, PageHeader, Select, Switch, Table,
} from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';

const emptyRule = { activity: '', points: 10, daily: 1, active: true };
const emptyBadge = { name: '', icon: 'trophy', minPoints: 100, desc: '' };
const JUDUL = 'font-head text-base font-bold leading-[22px] text-text';

export default function AdminPoints() {
  const { pointRules, badges, savePointRule, removePointRule, saveBadge, removeBadge, leaderboard, adjustPoints, ledger, users } = useSmart();
  const [rule, setRule] = useState(emptyRule);
  const [editRule, setEditRule] = useState(null);
  const [badge, setBadge] = useState(emptyBadge);
  const [editBadge, setEditBadge] = useState(null);
  const [amount, setAmount] = useState(50);
  const [target, setTarget] = useState('');

  // Modal dibuka lewat state sendiri: "Tambah" mengisi form dengan objek
  // kosong yang sama, jadi membandingkan identitas objek tidak pernah membuka modal.
  const [ruleOpen, setRuleOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const openRule = (row) => { setEditRule(row); setRule(row || emptyRule); setRuleOpen(true); };
  const openBadge = (row) => { setEditBadge(row); setBadge(row || emptyBadge); setBadgeOpen(true); };
  const closeRule = () => { setEditRule(null); setRule(emptyRule); setRuleOpen(false); };
  const closeBadge = () => { setEditBadge(null); setBadge(emptyBadge); setBadgeOpen(false); };

  const totalPoints = leaderboard.reduce((sum, row) => sum + row.points, 0);
  const activeRules = pointRules.filter((r) => r.active).length;
  const dailyCap = pointRules.filter((r) => r.active).reduce((sum, r) => sum + r.points * r.daily, 0);

  const submitRule = (event) => {
    event.preventDefault();
    if (!rule.activity) return;
    savePointRule(rule);
    closeRule();
  };

  const submitBadge = (event) => {
    event.preventDefault();
    if (!badge.name) return;
    saveBadge(badge);
    closeBadge();
  };

  const kolomAturan = [
    { key: 'activity', label: 'Aktivitas', render: (row) => <span className="font-semibold">{row.activity}</span> },
    { key: 'points', label: 'Poin', align: 'end', num: true, render: (row) => `+${row.points}` },
    { key: 'daily', label: 'Maks per hari', align: 'end', num: true, render: (row) => `${row.daily}×` },
    { key: 'max', label: 'Poin maksimal', align: 'end', num: true, render: (row) => (row.points * row.daily).toLocaleString('id-ID') },
    {
      key: 'active',
      label: 'Status',
      render: (row) => (
        <Switch label={row.active ? 'Aktif' : 'Nonaktif'} aria-label={`Aktifkan aturan ${row.activity}`} checked={Boolean(row.active)} onChange={(nyala) => savePointRule({ ...row, active: nyala })} />
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: (row) => (
        <div className="flex flex-nowrap items-center justify-end gap-1">
          <IconButton icon="pencil" size="sm" onClick={() => openRule(row)} label={`Ubah aturan ${row.activity}`} />
          <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => removePointRule(row.id)} label={`Hapus aturan ${row.activity}`} />
        </div>
      ),
    },
  ];

  const kolomSaldo = [
    {
      key: 'name',
      label: 'Pengguna',
      render: (row) => (
        <span className="font-semibold">
          {row.name}
          {target === row.id && <span className="font-normal text-text-2"> (dipilih)</span>}
        </span>
      ),
    },
    { key: 'area', label: 'Area', render: (row) => <span className="text-text-2">{row.area}</span> },
    { key: 'points', label: 'Poin', align: 'end', num: true, render: (row) => row.points.toLocaleString('id-ID') },
  ];

  return (
    <div>
      <PageHeader
        title="Sistem poin"
        subtitle="Tentukan aktivitas yang memberi poin, besarannya, dan batas per hari."
        actions={<Button icon="plus" onClick={() => openRule(null)}>Tambah aturan</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="aturan-judul" className="flex min-w-0 flex-col gap-3">
            <h2 id="aturan-judul" className={JUDUL}>Aturan perolehan poin</h2>
            {pointRules.length === 0 ? (
              <EmptyState title="Belum ada aturan poin" icon="list-checks">Tambahkan aturan pertama, misalnya mencatat pemantauan.</EmptyState>
            ) : (
              <Table columns={kolomAturan} rows={pointRules} />
            )}
            <p className="text-sm text-text-2">
              Batas poin harian per pengguna: <span className="font-num">{dailyCap.toLocaleString('id-ID')}</span> poin, dari {activeRules} aturan aktif dari {pointRules.length} aturan.
            </p>
          </section>

          <section aria-labelledby="saldo-judul" className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 id="saldo-judul" className={JUDUL}>Saldo poin pengguna</h2>
              <p className="mt-1 text-sm text-text-2">
                Total poin beredar di seluruh akun: <span className="font-num">{totalPoints.toLocaleString('id-ID')}</span> poin.
              </p>
            </div>
            {leaderboard.length === 0 ? (
              <EmptyState title="Belum ada saldo poin" icon="trophy" />
            ) : (
              <Table columns={kolomSaldo} rows={[...leaderboard].sort((a, b) => b.points - a.points)} />
            )}
          </section>

          <section aria-labelledby="riwayat-judul" className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 id="riwayat-judul" className={JUDUL}>Riwayat poin terakhir</h2>
              <p className="mt-1 text-sm text-text-2">Jejak pemberian poin yang tercatat sistem pada akun peraga.</p>
            </div>
            {ledger.length === 0 ? (
              <EmptyState title="Belum ada riwayat" icon="history" />
            ) : (
              <ul className="m-0 list-none divide-y divide-border border-y border-border p-0">
                {ledger.slice(0, 6).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold">{row.activity}</p>
                      <p className="text-sm text-text-2">{row.at}</p>
                    </div>
                    <span className="font-num font-semibold tabular-nums">+{row.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="badge-judul" className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="badge-judul" className={JUDUL}>Badge</h2>
              <Button variant="secondary" size="sm" icon="plus" onClick={() => openBadge(null)}>Tambah badge</Button>
            </div>
            <p className="text-sm text-text-2">Terbuka otomatis saat saldo poin pengguna melewati ambangnya.</p>
            {badges.length === 0 ? (
              <EmptyState title="Belum ada badge" icon="medal" />
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {badges.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
                    <span className="inline-flex shrink-0 text-primary"><IkonSlot icon={row.icon} size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-sm text-text-2">
                        Ambang <span className="font-num">{row.minPoints.toLocaleString('id-ID')}</span> poin · <span className="font-num">{users.filter((u) => (u.points || 0) >= row.minPoints).length}</span> pengguna tercapai
                      </p>
                    </div>
                    <IconButton icon="pencil" size="sm" onClick={() => openBadge(row)} label={`Ubah badge ${row.name}`} />
                    <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => removeBadge(row.id)} label={`Hapus badge ${row.name}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="penyesuaian-judul" className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 id="penyesuaian-judul" className={JUDUL}>Penyesuaian poin manual</h2>
              <p className="mt-1 text-sm text-text-2">Untuk bonus kegiatan lapangan atau koreksi kesalahan pencatatan.</p>
            </div>
            <Field label="Pengguna">
              <Select
                value={target}
                onChange={setTarget}
                placeholder="Pilih pengguna"
                options={leaderboard.map((row) => ({ value: row.id, label: `${row.name}: ${row.points.toLocaleString('id-ID')} poin` }))}
              />
            </Field>
            <Field label="Jumlah poin" hint="Isi negatif untuk mengurangi.">
              <NumberInput step="any" value={amount} onChange={setAmount} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon="check" disabled={!target} onClick={() => adjustPoints(target, Number(amount) || 0)}>
                Terapkan penyesuaian
              </Button>
              <Button variant="secondary" size="sm" icon="plus" disabled={!target} onClick={() => adjustPoints(target, 100)}>
                Bonus cepat +100
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Modal open={ruleOpen} onClose={closeRule} title={editRule ? `Ubah aturan: ${editRule.activity}` : 'Tambah aturan poin'}>
        <form onSubmit={submitRule} className="space-y-4">
          <Field label="Nama aktivitas">
            <Input value={rule.activity} onChange={(v) => setRule({ ...rule, activity: v })} placeholder="cth. Catat pemantauan kolam" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Poin per aktivitas">
              <NumberInput step="any" value={rule.points} onChange={(v) => setRule({ ...rule, points: v })} required />
            </Field>
            <Field label="Maksimal per hari">
              <NumberInput min="1" step="1" value={rule.daily} onChange={(v) => setRule({ ...rule, daily: v })} />
            </Field>
          </div>
          <Checkbox label="Aktifkan aturan ini" checked={rule.active} onChange={(e) => setRule({ ...rule, active: e.target.checked })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeRule}>Batal</Button>
            <Button type="submit" icon="save">{editRule ? 'Simpan perubahan' : 'Tambah aturan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={badgeOpen} onClose={closeBadge} title={editBadge ? `Ubah badge: ${editBadge.name}` : 'Tambah badge'}>
        <form onSubmit={submitBadge} className="space-y-4">
          <Field label="Nama badge">
            <Input value={badge.name} onChange={(v) => setBadge({ ...badge, name: v })} placeholder="cth. Ahli Kualitas Air" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama ikon" hint="Nama ikon lucide, mis. trophy atau droplet.">
              <div className="flex items-center gap-2">
                <Input value={badge.icon} onChange={(v) => setBadge({ ...badge, icon: v })} />
                <span className="inline-flex shrink-0 text-primary"><IkonSlot icon={badge.icon} size={22} /></span>
              </div>
            </Field>
            <Field label="Ambang poin">
              <NumberInput step="any" value={badge.minPoints} onChange={(v) => setBadge({ ...badge, minPoints: v })} required />
            </Field>
          </div>
          <Field label="Deskripsi">
            <Input value={badge.desc} onChange={(v) => setBadge({ ...badge, desc: v })} placeholder="cth. Kumpulkan 750 poin" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeBadge}>Batal</Button>
            <Button type="submit" icon="save">{editBadge ? 'Simpan perubahan' : 'Tambah badge'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
