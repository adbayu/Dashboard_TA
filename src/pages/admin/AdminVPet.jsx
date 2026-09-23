import { useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../components/ui';
import { PET_STAGES } from '../../data/seed';

const SPECIES = ['Ikan Nila', 'Ikan Lele', 'Ikan Gurame', 'Ikan Mas', 'Udang Galah'];

export default function AdminVPet() {
  const { pet, users, areas, renamePet, setPetSpecies, resetPet, healPet, applyPetToArea, decayPet } = useSmart();
  const [form, setForm] = useState({ name: pet.name, species: pet.species, level: pet.level, appliedToAreaId: pet.appliedToAreaId || '' });
  const [confirm, setConfirm] = useState(false);

  const stats = [
    { label: 'Kenyang', value: pet.hunger },
    { label: 'Kebahagiaan', value: pet.happiness },
    { label: 'Kebersihan', value: pet.hygiene },
    { label: 'Kesehatan', value: pet.health },
  ];
  const avg = Math.round(stats.reduce((sum, s) => sum + s.value, 0) / stats.length);
  const area = areas.find((a) => a.id === pet.appliedToAreaId);

  const submit = (event) => {
    event.preventDefault();
    renamePet(form.name);
    setPetSpecies(form.species);
    if (form.appliedToAreaId) applyPetToArea(form.appliedToAreaId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Jenis Pet Aktif" value={pet.species} icon="pets" hint={`Level ${pet.level} · ${pet.stage}`} />
        <StatCard label="Kondisi Rata-rata" value={`${avg}%`} icon="favorite" tone={avg < 50 ? 'bad' : 'ok'} hint="Gabungan 4 indikator" />
        <StatCard label="Pengalaman" value={`${pet.xp}/${pet.xpNext}`} icon="trending_up" hint="Progres ke level berikutnya" />
        <StatCard label="Pemelihara" value={users.filter((u) => u.role === 'pengguna').length} icon="group" hint="Pengguna yang merawat pet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,2fr]">
        <Card className="text-center bg-gradient-to-br from-primary/10 to-transparent">
          <SectionTitle eyebrow="Virtual Pet Aktif" title={pet.name} subtitle={`${pet.species} · tahap ${pet.stage}`} />
          <div className="my-3 flex justify-center">
            <div className="w-32 h-32 rounded-full bg-white/60 dark:bg-white/10 border-4 border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '60px' }}>
                {pet.species.toLowerCase().includes('lele') ? 'phishing' : 'set_meal'}
              </span>
            </div>
          </div>
          <Badge tone="brand">Level {pet.level}</Badge>
          <div className="mt-4 space-y-2 text-left">
            {stats.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] font-semibold mb-1">
                  <span className="text-on-surface-variant">{row.label}</span>
                  <span className={row.value < 40 ? 'text-red-600' : 'text-on-surface'}>{row.value}%</span>
                </div>
                <Bar value={row.value} tone={row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand'} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="soft" icon="healing" onClick={healPet} className="justify-center">Pulihkan</Button>
            <Button variant="ghost" icon="schedule" onClick={decayPet} className="justify-center">Simulasi waktu</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle
              eyebrow="Kelola Virtual Pet"
              title="Pengaturan pet sistem"
              subtitle="Nama, jenis, dan area pemantauan yang ditautkan ke virtual pet pengguna."
            />
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama pet">
                  <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Nila Ku" required />
                </Field>
                <Field label="Jenis hewan">
                  <Select value={form.species} onChange={(v) => setForm({ ...form, species: v })} options={SPECIES.map((s) => ({ value: s, label: s }))} />
                </Field>
                <Field label="Area pemantauan terhubung" className="sm:col-span-2">
                  <Select
                    value={form.appliedToAreaId}
                    onChange={(v) => setForm({ ...form, appliedToAreaId: v })}
                    placeholder="Pilih area kolam…"
                    options={areas.map((a) => ({ value: a.id, label: `${a.name} — ${a.commodity}` }))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" icon="save">Simpan pengaturan</Button>
                <Button variant="danger" icon="restart_alt" onClick={() => setConfirm(true)}>Reset pet pengguna</Button>
              </div>
            </form>
            <p className="mt-3 text-[11px] text-on-surface-variant">
              Area aktif saat ini: <strong className="text-on-surface">{area?.name || 'belum dipilih'}</strong>
            </p>
          </Card>

          <Card>
            <SectionTitle eyebrow="Tahapan Pertumbuhan" title="Jalur evolusi pet" subtitle="Level naik saat pengguna rajin merawat pet dan mencatat aktivitas farm." />
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {PET_STAGES.map((stage, index) => {
                const reached = PET_STAGES.indexOf(pet.stage) >= index;
                return (
                  <div key={stage} className="flex items-center gap-2 shrink-0">
                    <div
                      className={`rounded-2xl border px-3 py-2 text-center min-w-[110px] ${
                        reached ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/40'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[24px] ${reached ? 'text-primary' : 'text-outline'}`}>
                        {index === 0 ? 'egg' : index < 3 ? 'set_meal' : 'emoji_events'}
                      </span>
                      <p className={`text-[11px] font-bold ${reached ? 'text-on-surface' : 'text-on-surface-variant'}`}>{stage}</p>
                      <p className="text-[10px] text-outline">Level {index * 2 + 1}–{index * 2 + 2}</p>
                    </div>
                    {index < PET_STAGES.length - 1 && <span className="material-symbols-outlined text-outline">chevron_right</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <SectionTitle eyebrow="Jurnal" title="Riwayat perawatan pet terakhir" subtitle="Aktivitas yang membuat pet ini berkembang." />
        {pet.log.length === 0 ? (
          <Empty title="Belum ada aktivitas perawatan" icon="history" hint="Aktivitas muncul saat pengguna merawat pet." />
        ) : (
          <Table head={['Waktu', 'Aktivitas', 'Dampak']}>
            {pet.log.map((row) => (
              <tr key={row.id} className="hover:bg-primary/5">
                <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">{row.at}</td>
                <td className="px-3 py-2 text-on-surface">{row.text}</td>
                <td className="px-3 py-2 font-semibold text-primary">{row.delta}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset virtual pet">
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Pet <strong className="text-on-surface">{pet.name}</strong> akan direset ke tahap awal (level 1, pengalaman 0). Riwayat perawatan dan
            kondisi pet saat ini akan hilang.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Batal</Button>
            <Button variant="danger" icon="restart_alt" onClick={() => { resetPet(); setConfirm(false); }}>Reset pet</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
