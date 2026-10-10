import { useState } from 'react';
import { ambangUntuk, METRIC_META, useSmart } from '../../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, Table } from '../../components/ui';
import PetKarakter from '../../components/PetKarakter';
import { reaksiPet } from '../../data/reaksiPet';
import { PET_STAGES, SEED_PETS } from '../../data/seed';
import '../../pet.css';

const SPECIES = [...new Set(SEED_PETS.map((item) => item.species))];

export default function AdminVPet() {
  const { pet, pets, users, areas, devices, categoryOf, selectPet, addPet, configurePet, resetPet, healPet, decayPet, setAreaPopulation, catatKematian, kematianArea } = useSmart();
  const [form, setForm] = useState({ name: pet.name, species: pet.species, appliedToAreaId: pet.appliedToAreaId || '' });
  const [addOpen, setAddOpen] = useState(false);
  const [newPetForm, setNewPetForm] = useState({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
  const [populationDraft, setPopulationDraft] = useState({ areaId: '', value: '' });
  const [mortalityDraft, setMortalityDraft] = useState({ areaId: '', jumlah: '', catatan: '' });
  const [confirm, setConfirm] = useState(false);

  // Reaksi dihitung dari sensor area yang ditautkan, memakai aturan yang SAMA
  // dengan halaman pengguna (src/data/reaksiPet.js). Pengelola jadi melihat
  // akibat pengaturan ambangnya tanpa harus masuk sebagai pengguna.
  const area = areas.find((a) => a.id === pet.appliedToAreaId);
  const kolam = area?.type === 'kolam' ? area : null;
  const populationValue = populationDraft.areaId === kolam?.id
    ? populationDraft.value
    : kolam ? Number(kolam.population || 0) : '';
  const mortalityJumlah = mortalityDraft.areaId === kolam?.id ? mortalityDraft.jumlah : '';
  const mortalityCatatan = mortalityDraft.areaId === kolam?.id ? mortalityDraft.catatan : '';
  const kematianHariIni = kolam ? kematianArea(kolam.id) : [];
  const jumlahMatiHariIni = kematianHariIni.reduce((total, row) => total + Number(row.jumlah || 0), 0);
  const readings = devices
    .filter((d) => d.areaId === pet.appliedToAreaId && METRIC_META[d.metric?.key])
    .map((d) => {
      const ambang = ambangUntuk(area, categoryOf(d.categoryId), d.metric.key);
      return { key: d.metric.key, label: METRIC_META[d.metric.key].label, unit: METRIC_META[d.metric.key].unit,
        value: d.metric.value, ambang };
    });
  const reaksi = reaksiPet(readings, {
    lapar: 100 - pet.hunger,
    kotor: 100 - pet.hygiene,
    sakit: 100 - pet.health,
  });
  const ekspresiKarakter = pet.happiness < 40
    && !['kepanasan', 'kedinginan'].includes(reaksi.ekspresi)
    ? 'sedih'
    : reaksi.ekspresi;

  const stats = [
    { label: 'Kenyang', value: pet.hunger },
    { label: 'Kebahagiaan', value: pet.happiness },
    { label: 'Kebersihan', value: pet.hygiene },
    { label: 'Kesehatan', value: pet.health },
  ];
  const avg = Math.round(stats.reduce((sum, s) => sum + s.value, 0) / stats.length);

  const submit = (event) => {
    event.preventDefault();
    configurePet(pet.id, form);
  };
  const submitNewPet = (event) => {
    event.preventDefault();
    const petId = addPet(newPetForm);
    if (!petId) return;
    setForm({ ...newPetForm });
    setNewPetForm({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
    setAddOpen(false);
  };
  const submitPopulation = (event) => {
    event.preventDefault();
    if (!kolam || populationValue === '') return;
    setAreaPopulation(kolam.id, populationValue);
    setPopulationDraft({ areaId: '', value: '' });
  };
  const submitMortality = (event) => {
    event.preventDefault();
    if (!kolam || mortalityJumlah === '') return;
    catatKematian(kolam.id, mortalityJumlah, mortalityCatatan);
    setMortalityDraft({ areaId: '', jumlah: '', catatan: '' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Jenis Pet Aktif" value={pet.species} icon="pets" hint={`Level ${pet.level} · ${pet.stage}`} />
        <StatCard label="Kondisi Rata-rata" value={`${avg}%`} icon="favorite" tone={avg < 50 ? 'bad' : 'ok'} hint="Gabungan 4 indikator" />
        <StatCard label="Pengalaman" value={`${pet.xp}/${pet.xpNext} EXP`} icon="trending_up" hint="Dari peningkatan kondisi, bukan bermain" />
        <StatCard label="Pemelihara" value={users.filter((u) => u.role === 'pengguna').length} icon="group" hint="Pengguna yang merawat pet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr),minmax(0,2fr)]">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <SectionTitle eyebrow="Virtual Pet Aktif" title={pet.name} subtitle={`${pet.species} · tahap ${pet.stage}`} />
          {/* Karakter yang sama dengan yang dilihat pengguna, supaya pengelola
              bisa memeriksa hasil reaksi sensor tanpa berpindah akun. */}
          <div className="my-3">
            <PetKarakter species={pet.species} level={pet.level} ekspresi={ekspresiKarakter} pesan={reaksi.pesan} tinggi={260} />
            <p className="mt-2 text-sm text-on-surface-variant">{reaksi.pesan}</p>
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
            <Button variant="soft" icon="healing" onClick={() => healPet(pet.id)} className="justify-center">Pulihkan</Button>
            <Button variant="ghost" icon="schedule" onClick={() => decayPet(pet.id)} className="justify-center">Simulasi waktu</Button>
          </div>
        </Card>

        <div className="space-y-4 min-w-0">
          <Card>
            <SectionTitle
              eyebrow="Kelola Virtual Pet"
              title="Pengaturan pet sistem"
              subtitle="Ubah nama, karakter, dan kolam. Pengaturan yang disimpan langsung dipakai kartu V-Pet pengguna."
              action={<Button icon="add" onClick={() => setAddOpen(true)}>Tambah pet farm</Button>}
            />
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pet yang dikelola" className="sm:col-span-2">
                  <Select
                    value={pet.id}
                    onChange={(petId) => {
                      selectPet(petId);
                      const selected = pets.find((item) => item.id === petId);
                      if (selected) setForm({ name: selected.name, species: selected.species, appliedToAreaId: selected.appliedToAreaId || '' });
                    }}
                    options={pets.map((item) => ({ value: item.id, label: `${item.name} (${item.species})` }))}
                  />
                </Field>
                <Field label="Nama pet">
                  <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Nila Ku" required />
                </Field>
                <Field label="Karakter pet">
                  <Select
                    value={form.species}
                    onChange={(v) => setForm({ ...form, species: v })}
                    options={SPECIES.map((species) => ({ value: species, label: species }))}
                  />
                </Field>
                <Field label="Lokasi kolam">
                  <Select
                    value={form.appliedToAreaId}
                    onChange={(v) => setForm({ ...form, appliedToAreaId: v })}
                    placeholder="Pilih kolam…"
                    options={areas.filter((a) => a.type === 'kolam').map((a) => ({ value: a.id, label: a.name }))}
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
            <SectionTitle
              eyebrow="Pemantauan Ikan"
              title="Populasi dan kematian"
              subtitle={kolam ? `Data ${kolam.name} menjadi sumber bersama untuk V-Pet pengguna dan area.` : 'Tautkan pet ke kolam agar populasinya dapat dicatat.'}
            />
            {kolam ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-outline-variant/40 p-3 panel-inset">
                    <p className="text-[11px] text-on-surface-variant">Jumlah ikan tercatat</p>
                    <p className="text-xl font-extrabold text-on-surface">{Number(kolam.population || 0).toLocaleString('id-ID')} {kolam.populationUnit || 'ekor'}</p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/40 p-3 panel-inset">
                    <p className="text-[11px] text-on-surface-variant">Mati hari ini</p>
                    <p className="text-xl font-extrabold text-on-surface">{jumlahMatiHariIni} ekor</p>
                  </div>
                </div>
                <form onSubmit={submitPopulation} className="mt-4 flex flex-wrap items-end gap-2">
                  <Field label={`Jumlah ikan hidup (${kolam.populationUnit || 'ekor'})`} className="min-w-[180px] flex-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={populationValue}
                      onChange={(value) => setPopulationDraft({ areaId: kolam.id, value })}
                      required
                    />
                  </Field>
                  <Button type="submit" icon="save">Simpan populasi</Button>
                </form>
                <form onSubmit={submitMortality} className="mt-4 grid gap-3 sm:grid-cols-[1fr,1.4fr,auto] sm:items-end">
                  <Field label="Jumlah mati hari ini (ekor)" hint={`Catatan saat ini: ${jumlahMatiHariIni} ekor`}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={mortalityJumlah}
                      onChange={(value) => setMortalityDraft({ areaId: kolam.id, jumlah: value, catatan: mortalityCatatan })}
                      required
                    />
                  </Field>
                  <Field label="Catatan kematian (opsional)">
                    <Input
                      value={mortalityCatatan}
                      onChange={(value) => setMortalityDraft({ areaId: kolam.id, jumlah: mortalityJumlah, catatan: value })}
                      placeholder="cth. setelah pemeriksaan pagi"
                    />
                  </Field>
                  <Button type="submit" variant="soft" icon="heart_broken">Simpan kematian</Button>
                </form>
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  Input ulang pada hari yang sama memperbarui total kematian; populasi berkurang atau bertambah sesuai selisihnya.
                </p>
              </>
            ) : (
              <Empty
                title={area ? 'Area ini bukan kolam ikan' : 'Pet belum ditautkan ke kolam'}
                icon="water"
                hint="Pilih lokasi kolam pada pengaturan pet untuk mencatat populasi dan kematian ikan."
              />
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Tahapan Pertumbuhan" title="Jalur evolusi pet" subtitle="Level naik saat EXP dari perbaikan kondisi cukup. Ajak main hanya menaikkan kebahagiaan." />
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
            kondisi pet saat ini akan kembali ke nilai awal. Nama, karakter, dan lokasi tetap dipertahankan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Batal</Button>
            <Button variant="danger" icon="restart_alt" onClick={() => { resetPet(); setConfirm(false); }}>Reset pet</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah pet farm" wide mobileFull>
        <form onSubmit={submitNewPet} className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            Pet ini menjadi bagian dari koleksi farm dan dapat dilihat pengguna yang memiliki akses ke kolam pilihannya.
          </p>
          <Field label="Nama pet">
            <Input
              value={newPetForm.name}
              onChange={(value) => setNewPetForm({ ...newPetForm, name: value })}
              placeholder="cth. Lele Kolam B"
              maxLength={40}
              required
            />
          </Field>
          <Field label="Karakter pet">
            <Select
              value={newPetForm.species}
              onChange={(value) => setNewPetForm({ ...newPetForm, species: value })}
              options={SPECIES.map((species) => ({ value: species, label: species }))}
            />
          </Field>
          <Field label="Kolam">
            <Select
              value={newPetForm.appliedToAreaId}
              onChange={(value) => setNewPetForm({ ...newPetForm, appliedToAreaId: value })}
              placeholder="Pilih kolam…"
              options={areas.filter((item) => item.type === 'kolam').map((item) => ({ value: item.id, label: item.name }))}
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button type="submit" icon="add">Tambah pet farm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
