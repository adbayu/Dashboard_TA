import { useState } from 'react';
import { ambangUntuk, METRIC_KEYS, METRIC_META, useSmart } from '../../shared/store/SmartStore';
import { Bar, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatusPill, Table } from '../../shared/components/ui';
import SensorReading from '../../components/iot/SensorReading.jsx';
import PetKarakter from '../../v-pet/components/PetKarakter';
import { reaksiPet } from '../../v-pet/model/reaksiPet';
import { SEED_PETS } from '../../v-pet/data/seed.js';
import { stagesForSpecies } from '../../v-pet/model/petProgress.js';
import { KANGKUNG_SENSOR_EXP_PER_DAY, kangkungSensorReaction } from '../../v-pet/model/kangkungSensorExp.js';
import { areaTone } from '../../kelola-area/model/areaTone.js';
import '../../v-pet/styles/pet.css';

const SPECIES = [...new Set(SEED_PETS.map((item) => item.species))];
const JUDUL = 'font-head text-base font-bold leading-[22px] text-text';

// Status pembacaan sensor (dalam | bawah | atas | tanpa-ambang | tanpa-data) ke
// status SensorReading. Rentang hanya dikirim bila ambangnya sah.
const STATUS_SENSOR = { dalam: 'normal', bawah: 'low', atas: 'high', 'tanpa-ambang': 'no-range' };
const ADA_RENTANG = new Set(['dalam', 'bawah', 'atas']);
const IKON_SENSOR = { ph: 'flask-conical', temp: 'thermometer', tds: 'droplet' };

const sumberExp = (species) => (SEED_PETS.find((item) => item.species === species)?.expMode === 'iot-daily'
  ? `Sensor IoT: +${KANGKUNG_SENSOR_EXP_PER_DAY} EXP sekali sehari bila pH, suhu, dan TDS dalam ambang`
  : 'Perbaikan kondisi pet (kenyang, bersih, sehat)');

export default function AdminVPet() {
  const { pet, pets, areas, devices, categoryOf, selectPet, addPet, configurePet, resetPet, healPet, decayPet, setAreaPopulation, catatKematian, kematianArea } = useSmart();
  const [form, setForm] = useState({ name: pet.name, species: pet.species, appliedToAreaId: pet.appliedToAreaId || '' });
  const [addOpen, setAddOpen] = useState(false);
  const [newPetForm, setNewPetForm] = useState({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
  const [populationDraft, setPopulationDraft] = useState({ areaId: '', value: '' });
  const [mortalityDraft, setMortalityDraft] = useState({ areaId: '', jumlah: '', catatan: '' });
  const [confirm, setConfirm] = useState(false);

  const isSensorDrivenPet = pet?.expMode === 'iot-daily';
  const area = areas.find((a) => a.id === pet.appliedToAreaId);
  const kolam = area?.type === 'kolam' ? area : null;
  const populationValue = populationDraft.areaId === kolam?.id
    ? populationDraft.value
    : kolam ? Number(kolam.population || 0) : '';
  const mortalityJumlah = mortalityDraft.areaId === kolam?.id ? mortalityDraft.jumlah : '';
  const mortalityCatatan = mortalityDraft.areaId === kolam?.id ? mortalityDraft.catatan : '';
  const kematianHariIni = kolam ? kematianArea(kolam.id) : [];
  const jumlahMatiHariIni = kematianHariIni.reduce((total, row) => total + Number(row.jumlah || 0), 0);
  const readings = isSensorDrivenPet
    ? METRIC_KEYS.map((key) => {
      const device = devices.find((item) => item.areaId === pet.appliedToAreaId && item.metric?.key === key);
      const ambang = ambangUntuk(area, categoryOf(device?.categoryId), key);
      return {
        key,
        label: METRIC_META[key].label,
        unit: METRIC_META[key].unit,
        value: device?.status === 'online' ? device.metric?.value : null,
        ambang,
        threshold: ambang,
      };
    })
    : devices
      .filter((d) => d.areaId === pet.appliedToAreaId && METRIC_META[d.metric?.key])
      .map((d) => {
        const ambang = ambangUntuk(area, categoryOf(d.categoryId), d.metric.key);
        return { key: d.metric.key, label: METRIC_META[d.metric.key].label, unit: METRIC_META[d.metric.key].unit,
          value: d.metric.value, ambang };
      });
  const reaksi = isSensorDrivenPet
    ? kangkungSensorReaction(readings, area?.name || 'kolam')
    : reaksiPet(readings, {
      lapar: 100 - pet.hunger,
      kotor: 100 - pet.hygiene,
      sakit: 100 - pet.health,
    });
  const ekspresiKarakter = isSensorDrivenPet ? reaksi.ekspresi : pet.happiness < 40
    && !['kepanasan', 'kedinginan'].includes(reaksi.ekspresi)
    ? 'sedih'
    : reaksi.ekspresi;

  const stats = isSensorDrivenPet ? [] : [
    { label: 'Kenyang', value: pet.hunger },
    { label: 'Kebahagiaan', value: pet.happiness },
    { label: 'Kebersihan', value: pet.hygiene },
    { label: 'Kesehatan', value: pet.health },
  ];
  const stages = stagesForSpecies(pet.species);
  const tahapKini = stages.indexOf(pet.stage);
  const persenExp = pet.xpNext ? Math.round((pet.xp / pet.xpNext) * 100) : 0;

  const pilihPet = (petId) => {
    selectPet(petId);
    const selected = pets.find((item) => item.id === petId);
    if (selected) setForm({ name: selected.name, species: selected.species, appliedToAreaId: selected.appliedToAreaId || '' });
  };

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

  const kolomPet = [
    {
      key: 'name',
      label: 'Pet',
      render: (row) => (
        <span>
          <span className="font-semibold">{row.name}</span>
          {row.id === pet.id && <span className="text-text-2"> (dikelola)</span>}
        </span>
      ),
    },
    { key: 'species', label: 'Karakter' },
    { key: 'stage', label: 'Tahap dan level', render: (row) => `${row.stage} · level ${row.level}` },
    { key: 'xp', label: 'EXP', align: 'end', num: true, render: (row) => `${row.xp} / ${row.xpNext}` },
    {
      key: 'area',
      label: 'Lokasi kolam',
      render: (row) => areas.find((a) => a.id === row.appliedToAreaId)?.name || <span className="text-text-2">Belum ditautkan</span>,
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'end',
      render: (row) => (row.id === pet.id
        ? <span className="text-sm text-text-2">Sedang dikelola</span>
        : <Button variant="ghost" size="sm" aria-label={`Kelola ${row.name}`} onClick={() => pilihPet(row.id)}>Kelola</Button>),
    },
  ];

  const kolomKarakter = [
    { key: 'species', label: 'Karakter', render: (row) => <span className="font-semibold">{row.species}</span> },
    { key: 'stages', label: 'Tahap pertumbuhan', render: (row) => stagesForSpecies(row.species).join(', ') },
    { key: 'exp', label: 'Sumber EXP', render: (row) => sumberExp(row.species) },
  ];

  return (
    <div>
      <PageHeader
        title="Kelola V-Pet"
        subtitle="Atur jenis karakter, lokasi kolam, kondisi, dan level pet farm yang dilihat pengguna."
        actions={<Button icon="plus" onClick={() => setAddOpen(true)}>Tambah pet farm</Button>}
      />

      <div className="flex flex-col gap-6">
        <section aria-labelledby="pet-farm-judul" className="flex min-w-0 flex-col gap-3">
          <h2 id="pet-farm-judul" className={JUDUL}>Pet farm</h2>
          <Table columns={kolomPet} rows={pets} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <Card area={areaTone(area?.type)} title={`Pengaturan ${pet.name}`} subtitle="Disimpan langsung dipakai kartu V-Pet pengguna.">
              <form onSubmit={submit} className="flex flex-col gap-3">
                <Field label="Pet yang dikelola">
                  <Select
                    value={pet.id}
                    onChange={pilihPet}
                    options={pets.map((item) => ({ value: item.id, label: `${item.name} (${item.species})` }))}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
                <Field label="Lokasi kolam" hint={`Area aktif saat ini: ${area?.name || 'belum dipilih'}`}>
                  <Select
                    value={form.appliedToAreaId}
                    onChange={(v) => setForm({ ...form, appliedToAreaId: v })}
                    placeholder="Pilih kolam"
                    options={areas.filter((a) => a.type === 'kolam').map((a) => ({ value: a.id, label: a.name }))}
                  />
                </Field>
                <div>
                  <Button type="submit" icon="save">Simpan pengaturan</Button>
                </div>
              </form>
            </Card>

            {!isSensorDrivenPet && (
              <Card
                title="Populasi dan kematian"
                subtitle={kolam ? `Data ${kolam.name} menjadi sumber bersama untuk V-Pet pengguna dan area.` : 'Tautkan pet ke kolam agar populasinya dapat dicatat.'}
              >
                {kolam ? (
                  <div className="flex flex-col gap-4">
                    <dl className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-sm text-text-2">Jumlah ikan tercatat</dt>
                        <dd className="font-num text-xl font-semibold">{Number(kolam.population || 0).toLocaleString('id-ID')} {kolam.populationUnit || 'ekor'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-text-2">Mati hari ini</dt>
                        <dd className="font-num text-xl font-semibold">{jumlahMatiHariIni} ekor</dd>
                      </div>
                    </dl>
                    <form onSubmit={submitPopulation} className="flex flex-wrap items-end gap-2">
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
                    <form onSubmit={submitMortality} className="grid gap-3 sm:grid-cols-2 sm:items-end">
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
                      <Field label="Catatan kematian" optional>
                        <Input
                          value={mortalityCatatan}
                          onChange={(value) => setMortalityDraft({ areaId: kolam.id, jumlah: mortalityJumlah, catatan: value })}
                          placeholder="cth. setelah pemeriksaan pagi"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Button type="submit" variant="secondary" icon="heart-crack">Simpan kematian</Button>
                      </div>
                    </form>
                    <p className="text-sm text-text-2">
                      Input ulang pada hari yang sama memperbarui total kematian; populasi berkurang atau bertambah sesuai selisihnya.
                    </p>
                  </div>
                ) : (
                  <EmptyState title={area ? 'Area ini bukan kolam ikan' : 'Pet belum ditautkan ke kolam'} icon="waves">
                    Pilih lokasi kolam pada pengaturan pet untuk mencatat populasi dan kematian ikan.
                  </EmptyState>
                )}
              </Card>
            )}
          </div>

          <Card
            title="Kondisi dan level"
            subtitle={`Level ${pet.level} · tahap ${pet.stage} · EXP ${pet.xp} dari ${pet.xpNext}${isSensorDrivenPet ? ' · EXP dari IoT kolam' : ''}`}
          >
            <div className="flex flex-col gap-4">
              {/* Karakter yang sama dengan yang dilihat pengguna, supaya pengelola
                  bisa memeriksa hasil reaksi sensor tanpa berpindah akun. */}
              <div>
                <PetKarakter species={pet.species} level={pet.level} ekspresi={ekspresiKarakter} pesan={reaksi.pesan} tinggi={220} />
                <p className="mt-2 text-sm text-text-2">{reaksi.pesan}</p>
              </div>

              {isSensorDrivenPet ? (
                <div className="flex flex-col gap-2">
                  {reaksi.readings.map((reading) => (
                    <SensorReading
                      key={reading.key}
                      variant="row"
                      name={reading.label}
                      icon={IKON_SENSOR[reading.key]}
                      value={reading.value == null || reading.value === '' ? null : Number(reading.value)}
                      decimals={METRIC_META[reading.key]?.precision ?? 1}
                      unit={reading.unit}
                      min={ADA_RENTANG.has(reading.state) ? reading.threshold?.[0] : undefined}
                      max={ADA_RENTANG.has(reading.state) ? reading.threshold?.[1] : undefined}
                      status={STATUS_SENSOR[reading.state]}
                    />
                  ))}
                  <p className="text-sm text-text-2">+{KANGKUNG_SENSOR_EXP_PER_DAY} EXP maksimal sekali sehari jika ketiga sensor berada dalam ambang.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {stats.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-text-2">{row.label}</span>
                        <span className="font-num font-semibold">{row.value}%</span>
                      </div>
                      <Bar value={row.value} tone={row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand'} label={row.label} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" icon="bandage" onClick={() => healPet(pet.id)} className="justify-center">Pulihkan</Button>
                    <Button variant="ghost" icon="clock" onClick={() => decayPet(pet.id)} className="justify-center">Simulasi waktu</Button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-text-2">EXP menuju level {pet.level + 1}</span>
                  <span className="font-num font-semibold">{persenExp}%</span>
                </div>
                <Bar value={pet.xp} max={pet.xpNext || 1} label={`EXP menuju level ${pet.level + 1}`} />
              </div>
              <p className="text-sm text-text-2">Level naik saat EXP dari perbaikan kondisi cukup. Ajak main hanya menaikkan kebahagiaan.</p>

              <div className="flex flex-col gap-2">
                <h3 className="font-head text-[15px] font-bold leading-[22px] text-text">Jalur evolusi</h3>
                <ol className="m-0 flex list-none flex-col p-0">
                  {stages.map((stage, index) => {
                    const levelRange = isSensorDrivenPet ? `Level ${index + 1}` : `Level ${index * 2 + 1}–${index * 2 + 2}`;
                    const status = index < tahapKini
                      ? <StatusPill tone="ok" icon="circle-check">Terlewati</StatusPill>
                      : index === tahapKini
                        ? <StatusPill tone="info" icon="map-pin">Sekarang</StatusPill>
                        : <StatusPill tone="muted" icon="circle-minus">Belum</StatusPill>;
                    return (
                      <li key={stage} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
                        <span className={index === tahapKini ? 'font-semibold' : ''}>{stage}</span>
                        <span className="text-sm text-text-2">{levelRange}</span>
                        <span className="ml-auto">{status}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </Card>
        </div>

        <section aria-labelledby="karakter-judul" className="flex min-w-0 flex-col gap-3">
          <h2 id="karakter-judul" className={JUDUL}>Jenis karakter</h2>
          <Table columns={kolomKarakter} rows={SPECIES.map((species) => ({ id: species, species }))} />
        </section>

        <section aria-labelledby="jurnal-judul" className="flex min-w-0 flex-col gap-3">
          <div>
            <h2 id="jurnal-judul" className={JUDUL}>Riwayat perawatan pet terakhir</h2>
            <p className="mt-1 text-sm text-text-2">Aktivitas yang membuat pet ini berkembang.</p>
          </div>
          {pet.log.length === 0 ? (
            <EmptyState title="Belum ada aktivitas perawatan" icon="history">Aktivitas muncul saat pengguna merawat pet.</EmptyState>
          ) : (
            <Table
              columns={[
                { key: 'at', label: 'Waktu', render: (row) => <span className="whitespace-nowrap text-text-2">{row.at}</span> },
                { key: 'text', label: 'Aktivitas' },
                { key: 'delta', label: 'Dampak', render: (row) => <span className="font-semibold">{row.delta}</span> },
              ]}
              rows={pet.log}
            />
          )}
        </section>

        <section aria-labelledby="reset-judul" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <h2 id="reset-judul" className={JUDUL}>Reset pet pengguna</h2>
            <p className="mt-1 text-sm text-text-2">Pet dikembalikan ke tahap awal: level 1, pengalaman 0. Nama, karakter, dan lokasi tetap dipertahankan.</p>
          </div>
          <Button variant="danger" icon="rotate-ccw" onClick={() => setConfirm(true)}>Reset pet pengguna</Button>
        </section>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset virtual pet">
        <div className="space-y-4">
          <p className="text-text-2">
            Pet <strong className="text-text">{pet.name}</strong> akan direset ke tahap awal (level 1, pengalaman 0). Riwayat perawatan dan
            kondisi pet saat ini akan kembali ke nilai awal. Nama, karakter, dan lokasi tetap dipertahankan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>Batal</Button>
            <Button variant="danger" icon="rotate-ccw" onClick={() => { resetPet(); setConfirm(false); }}>Reset pet</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah pet farm" wide>
        <form onSubmit={submitNewPet} className="space-y-3">
          <p className="text-text-2">
            Pet ini menjadi bagian dari koleksi farm dan dapat dilihat pengguna yang memiliki akses ke kolam pilihannya.
          </p>
          <Field label="Nama pet">
            <Input
              value={newPetForm.name}
              onChange={(value) => setNewPetForm({ ...newPetForm, name: value })}
              placeholder="cth. Gurame Kolam B"
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
              placeholder="Pilih kolam"
              options={areas.filter((item) => item.type === 'kolam').map((item) => ({ value: item.id, label: item.name }))}
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button type="submit" icon="plus">Tambah pet farm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
