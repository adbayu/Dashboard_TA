import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { Button, Card, Empty, Field, Input, Modal, NumberInput, SectionTitle, StatCard, Table } from '../../components/ui';

const emptyRule = { activity: '', points: 10, daily: 1, active: true };
const emptyBadge = { name: '', icon: 'emoji_events', minPoints: 100, desc: '' };

export default function AdminPoints() {
  const { pointRules, badges, savePointRule, removePointRule, saveBadge, removeBadge, leaderboard, adjustPoints, ledger, points, users } = useSmart();
  const [rule, setRule] = useState(emptyRule);
  const [editRule, setEditRule] = useState(null);
  const [badge, setBadge] = useState(emptyBadge);
  const [editBadge, setEditBadge] = useState(null);
  const [amount, setAmount] = useState(50);
  const [target, setTarget] = useState('');

  const ruleOpen = editRule !== null || rule !== emptyRule;
  const badgeOpen = editBadge !== null || badge !== emptyBadge;
  const closeRule = () => { setEditRule(null); setRule(emptyRule); };
  const closeBadge = () => { setEditBadge(null); setBadge(emptyBadge); };

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Poin Beredar" value={totalPoints.toLocaleString('id-ID')} icon="stars" hint="Total saldo semua pengguna" />
        <StatCard label="Aturan Aktif" value={`${activeRules}/${pointRules.length}`} icon="rule" hint="Aktivitas yang memberi poin" />
        <StatCard label="Batas Harian" value={dailyCap.toLocaleString('id-ID')} icon="speed" hint="Maksimal poin per pengguna/hari" />
        <StatCard label="Badge Sistem" value={badges.length} icon="military_tech" hint="Pencapaian yang tersedia" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Sistem Point"
          title="Aturan perolehan poin"
          subtitle="Tentukan aktivitas apa yang memberi poin, berapa besarannya, dan berapa kali boleh dilakukan per hari."
          action={<Button icon="add" onClick={() => { setEditRule(null); setRule(emptyRule); }}>Tambah aturan</Button>}
        />
        {pointRules.length === 0 ? (
          <Empty title="Belum ada aturan poin" icon="rule" hint="Tambahkan aturan pertama, misalnya mencatat pemantauan." />
        ) : (
          <Table head={['Aktivitas', 'Poin', 'Maks/hari', 'Poin maksimal', 'Status', '']}>
            {pointRules.map((row) => (
              <tr key={row.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 font-semibold text-on-surface">{row.activity}</td>
                <td className="px-3 py-2 font-bold text-primary">+{row.points}</td>
                <td className="px-3 py-2 text-on-surface-variant">{row.daily}×</td>
                <td className="px-3 py-2 text-on-surface-variant">{(row.points * row.daily).toLocaleString('id-ID')} point</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => savePointRule({ ...row, active: !row.active })}
                    className={`text-[11px] font-bold rounded-full px-2.5 py-1 border ${
                      row.active ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-surface-container text-on-surface-variant border-outline-variant/40'
                    }`}
                  >
                    {row.active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setEditRule(row); setRule(row); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Ubah aturan">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => removePointRule(row.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus aturan">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            eyebrow="Badge"
            title="Pencapaian pengguna"
            subtitle="Badge terbuka otomatis saat saldo poin pengguna melewati ambangnya."
            action={<Button variant="soft" icon="add" onClick={() => { setEditBadge(null); setBadge(emptyBadge); }}>Tambah badge</Button>}
          />
          {badges.length === 0 ? (
            <Empty title="Belum ada badge" icon="military_tech" />
          ) : (
            <div className="space-y-2">
              {badges.map((row) => (
                <div key={row.id} className="flex items-center gap-3 rounded-xl border border-outline-variant/40 p-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface">{row.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      Ambang {row.minPoints.toLocaleString('id-ID')} point · {users.filter((u) => (u.points || 0) >= row.minPoints).length} pengguna tercapai
                    </p>
                  </div>
                  <button onClick={() => { setEditBadge(row); setBadge(row); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Ubah badge">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => removeBadge(row.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus badge">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Saldo Pengguna" title="Penyesuaian poin manual" subtitle="Gunakan untuk bonus kegiatan lapangan atau koreksi kesalahan pencatatan." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pengguna">
                <select
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  className="w-full rounded-xl glass-input px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">Pilih pengguna…</option>
                  {leaderboard.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} — {row.points.toLocaleString('id-ID')} point
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jumlah poin" hint="Isi negatif untuk mengurangi.">
                <NumberInput step="any" value={amount} onChange={setAmount} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button icon="add_circle" disabled={!target} onClick={() => adjustPoints(target, Number(amount) || 0)}>
                Terapkan penyesuaian
              </Button>
              <Button variant="soft" icon="bolt" disabled={!target} onClick={() => adjustPoints(target, 100)}>
                Bonus cepat +100
              </Button>
            </div>
            <div className="mt-4">
              <Table head={['Pengguna', 'Area', 'Poin']}>
                {[...leaderboard]
                  .sort((a, b) => b.points - a.points)
                  .map((row) => (
                    <tr key={row.id} className={target === row.id ? 'bg-primary/5' : 'hover:bg-primary/5'}>
                      <td className="px-3 py-2 font-semibold text-on-surface">{row.name}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{row.area}</td>
                      <td className="px-3 py-2 font-bold text-primary">{row.points.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
              </Table>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Audit" title="Riwayat poin terakhir" subtitle="Jejak pemberian poin yang tercatat sistem pada akun peraga." />
            <ul className="space-y-2">
              {ledger.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-xl border border-outline-variant/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{row.activity}</p>
                    <p className="text-[11px] text-on-surface-variant">{row.at}</p>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">+{row.points}</span>
                </li>
              ))}
              {ledger.length === 0 && <Empty title="Belum ada riwayat" icon="history" />}
            </ul>
            <p className="mt-3 text-[11px] text-on-surface-variant">
              Saldo akun peraga saat ini: <strong className="text-on-surface">{points.toLocaleString('id-ID')} point</strong>
            </p>
          </Card>
        </div>
      </div>

      <Modal open={ruleOpen} onClose={closeRule} title={editRule ? `Ubah aturan — ${editRule.activity}` : 'Tambah aturan poin'}>
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
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={rule.active} onChange={(e) => setRule({ ...rule, active: e.target.checked })} className="w-4 h-4" />
            Aktifkan aturan ini
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeRule}>Batal</Button>
            <Button type="submit" icon="save">{editRule ? 'Simpan perubahan' : 'Tambah aturan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={badgeOpen} onClose={closeBadge} title={editBadge ? `Ubah badge — ${editBadge.name}` : 'Tambah badge'}>
        <form onSubmit={submitBadge} className="space-y-4">
          <Field label="Nama badge">
            <Input value={badge.name} onChange={(v) => setBadge({ ...badge, name: v })} placeholder="cth. Ahli Kualitas Air" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ikon Material Symbols">
              <div className="flex items-center gap-2">
                <Input value={badge.icon} onChange={(v) => setBadge({ ...badge, icon: v })} />
                <span className="material-symbols-outlined text-[24px] text-primary">{badge.icon}</span>
              </div>
            </Field>
            <Field label="Ambang poin">
              <NumberInput step="any" value={badge.minPoints} onChange={(v) => setBadge({ ...badge, minPoints: v })} required />
            </Field>
          </div>
          <Field label="Deskripsi">
            <Input value={badge.desc} onChange={(v) => setBadge({ ...badge, desc: v })} placeholder="cth. Kumpulkan 750 point" />
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
