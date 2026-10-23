import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ambangUntuk, METRIC_KEYS, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { localDateKey, localMonthKey, millisecondsUntilNextLocalMidnight } from '../../shared/model/localDate.js';
import { Badge, Bar, Button, Card, Empty, Field, Input, Modal, SectionTitle, Table, Select } from '../../shared/components/ui';
import PetKarakter, { IkonSensor } from '../components/PetKarakter';
import { SEED_PETS } from '../data/seed.js';
import { dailyQuestChecklist, monthlyQuestChecklist } from '../model/petQuests.js';
import { penjelasanKondisiAir, reaksiPet, URUTAN_PARAMETER } from '../model/reaksiPet';
import { KANGKUNG_SENSOR_EXP_PER_DAY, kangkungSensorReaction } from '../model/kangkungSensorExp.js';
import { visiblePetsForUser } from '../model/petModel.js';
import '../styles/pet.css';

const SPECIES = [...new Set(SEED_PETS.map((item) => item.species))];
const QUEST_TITLES = {
  feed: 'Beri pakan',
  clean: 'Bersihkan',
  heal: 'Rawat',
  'water-check': 'Cek kualitas air',
  mortality: 'Catat kematian ikan',
  harvest: 'Catat panen',
  'monthly-pond-cleaning': 'Pembersihan area kolam ikan',
};

function KangkungSensorPanel({ summary, awardedToday }) {
  const statusLabel = (state) => state === 'dalam' ? 'Dalam ambang'
    : state === 'bawah' || state === 'atas' ? 'Di luar ambang'
      : state === 'tanpa-ambang' ? 'Ambang belum diatur' : 'Belum ada data';
  const statusTone = (state) => state === 'dalam' ? 'ok'
    : state === 'bawah' || state === 'atas' ? 'warn' : 'muted';

  return (
    <Card>
      <SectionTitle
        eyebrow="IoT Kangkung"
        title="Kondisi hidroponik"
        subtitle="EXP Kangkung hanya mengikuti sensor pH, suhu, dan TDS di kolam ini."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {summary.readings.map((reading) => (
          <div key={reading.key} className="rounded-xl border border-outline-variant/40 p-3 panel-inset">
            <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <IkonSensor nama={reading.key} size={18} />
                <span className="truncate">{reading.label}</span>
              </span>
              <Badge className="shrink-0" tone={statusTone(reading.state)}>{statusLabel(reading.state)}</Badge>
            </div>
            <p className="text-lg font-extrabold text-on-surface">
              {reading.value == null ? '—' : reading.value}{' '}
              <small className="text-[11px] font-semibold text-on-surface-variant">{reading.unit}</small>
            </p>
            {reading.threshold && (
              <p className="text-[10px] text-on-surface-variant">Rentang ideal {reading.threshold[0]}–{reading.threshold[1]} {reading.unit}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-outline-variant/40 p-3 panel-inset">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-on-surface">EXP sensor harian</p>
          <Badge tone={awardedToday ? 'ok' : summary.allSafe ? 'brand' : 'muted'}>
            {awardedToday ? `+${KANGKUNG_SENSOR_EXP_PER_DAY} EXP diterima hari ini` : 'Maksimal sekali per hari'}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          {awardedToday
            ? 'Reward hari ini sudah dicatat; pembacaan berikutnya tidak menggandakan EXP.'
            : summary.allSafe
              ? 'Semua parameter aman; EXP akan dicatat pada pembaruan telemetri berikutnya.'
              : `+${KANGKUNG_SENSOR_EXP_PER_DAY} EXP diberikan saat ketiga sensor tersedia dan berada dalam ambang area.`}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{summary.message}</p>
      </div>
    </Card>
  );
}

export default function VPet() {
  const location = useLocation();
  const {
    pets,
    selectedPetId,
    currentUser,
    selectPet,
    addPet,
    feedPet,
    playPet,
    cleanPet,
    healPet,
    decayPet,
    claimPetQuest,
    areasSaya,
    applyPetToArea,
    kematianArea,
    petQuestCompletions,
    petSensorExpCompletions,
    pondActivityEvents,
    notify,
    devices,
    categoryOf,
  } = useSmart();
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [newPetForm, setNewPetForm] = useState({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
  const [questDateKey, setQuestDateKey] = useState(() => localDateKey());
  const areas = areasSaya;
  const kolamSaya = areas.filter((item) => item.type === 'kolam');
  const devicesSaya = devices.filter((item) => areas.some((areaItem) => areaItem.id === item.areaId));
  const petsSaya = visiblePetsForUser(pets, currentUser?.id, areas.map((item) => item.id));
  const activePetId = petsSaya.some((item) => item.id === selectedPetId) ? selectedPetId : petsSaya[0]?.id;
  const openMissionActivity = location.state?.openMissionActivity;
  const [petDialogId, setPetDialogId] = useState(() => (
    openMissionActivity ? activePetId : null
  ));
  const requestedPetId = petsSaya.some((item) => item.id === petDialogId) ? petDialogId : activePetId;
  const pet = petsSaya.find((item) => item.id === requestedPetId) || null;
  const isSensorDrivenPet = pet?.expMode === 'iot-daily';
  const area = areas.find((item) => item.id === pet?.appliedToAreaId);
  const areaAccessTerbatas = Boolean(pet?.appliedToAreaId) && !area;
  const kolamPet = area?.type === 'kolam' ? area : null;
  const ikanMatiHariIni = kolamPet
    ? kematianArea(kolamPet.id).reduce((total, row) => total + Number(row.jumlah || 0), 0)
    : 0;
  const questRows = kolamPet && !isSensorDrivenPet
    ? dailyQuestChecklist(petQuestCompletions, kolamPet.id, questDateKey, pondActivityEvents)
    : [];
  const monthlyQuestRows = kolamPet && !isSensorDrivenPet
    ? monthlyQuestChecklist(petQuestCompletions, kolamPet.id, localMonthKey())
    : [];
  const kangkungSensorAwardedToday = Boolean(isSensorDrivenPet && petSensorExpCompletions?.some((item) =>
    item.petId === pet.id && item.date === questDateKey,
  ));
  const seenActivityEventIds = useRef(null);

  useEffect(() => {
    let midnightTimer;
    const refreshLocalDay = () => {
      const now = new Date();
      setQuestDateKey(localDateKey(now));
      midnightTimer = setTimeout(
        refreshLocalDay,
        millisecondsUntilNextLocalMidnight(now) + 25,
      );
    };
    refreshLocalDay();
    return () => clearTimeout(midnightTimer);
  }, []);

  useEffect(() => {
    if (!openMissionActivity || !petDialogId) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById('pet-care-actions')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [openMissionActivity, petDialogId]);

  useEffect(() => {
    const events = pondActivityEvents || [];
    if (seenActivityEventIds.current === null) {
      seenActivityEventIds.current = new Set(events.map((event) => event.id));
      return;
    }

    const unseen = events.filter((event) => !seenActivityEventIds.current.has(event.id));
    unseen.forEach((event) => seenActivityEventIds.current.add(event.id));
    const event = unseen.find((item) => item.userId === currentUser?.id && item.areaId === kolamPet?.id);
    if (!event) return;

    const pointsText = event.pointsAwarded > 0 ? ` +${event.pointsAwarded} poin farm.` : '';
    const completedQuestId = event.completedQuestIds?.[0];
    const repeatedQuestId = event.alreadyCompletedQuestIds?.[0];
    const completedMonthlyQuestId = event.completedMonthlyQuestIds?.[0];
    const repeatedMonthlyQuestId = event.alreadyCompletedMonthlyQuestIds?.[0];
    if (completedMonthlyQuestId) {
      notify(`Quest bulanan ${QUEST_TITLES[completedMonthlyQuestId] || completedMonthlyQuestId} selesai: +10 EXP per pet.${pointsText}`);
    } else if (repeatedMonthlyQuestId) {
      notify(`Quest bulanan ${QUEST_TITLES[repeatedMonthlyQuestId] || repeatedMonthlyQuestId} sudah selesai bulan ini; tidak ada EXP tambahan.${pointsText}`);
    } else if (completedQuestId) {
      notify(`Quest ${QUEST_TITLES[completedQuestId] || completedQuestId} selesai: +10 EXP per pet.${pointsText}`);
    } else if (repeatedQuestId) {
      notify(`Quest ${QUEST_TITLES[repeatedQuestId] || repeatedQuestId} sudah selesai hari ini; tidak ada EXP tambahan.${pointsText}`);
    } else if (event.activityCode === 'monitoring' && event.parameterCount < 2) {
      notify(`Catatan tersimpan. Quest kualitas air perlu minimal dua parameter manual.${pointsText}`);
    } else if (event.pointsAwarded > 0) {
      notify(`Aktivitas kolam tercatat.${pointsText}`);
    }
  }, [pondActivityEvents, currentUser?.id, kolamPet?.id, notify]);

  const readingsFor = (targetPet) => {
    const targetArea = areas.find((item) => item.id === targetPet?.appliedToAreaId);
    if (targetPet?.expMode === 'iot-daily') {
      return METRIC_KEYS.map((key) => {
        const device = devicesSaya.find((item) => item.areaId === targetPet.appliedToAreaId && item.metric?.key === key);
        const ambang = ambangUntuk(targetArea, categoryOf(device?.categoryId), key);
        const value = device?.status === 'online' ? device.metric?.value : null;
        return {
          key,
          label: METRIC_META[key].label.replace(' Air', ''),
          unit: METRIC_META[key].unit,
          value,
          ambang,
          threshold: ambang,
          ok: nilaiTerhadapAmbang(value, ambang) === 'dalam',
        };
      });
    }
    return devicesSaya
      .filter((device) => device.areaId === targetPet?.appliedToAreaId && METRIC_META[device.metric?.key])
      .map((device) => {
        const ambang = ambangUntuk(targetArea, categoryOf(device.categoryId), device.metric.key);
        return {
          key: device.metric.key,
          label: METRIC_META[device.metric.key].label.replace(' Air', ''),
          unit: METRIC_META[device.metric.key].unit,
          value: device.metric.value,
          ambang,
          ok: nilaiTerhadapAmbang(device.metric.value, ambang) === 'dalam',
        };
      })
      .sort((left, right) => URUTAN_PARAMETER.indexOf(left.key) - URUTAN_PARAMETER.indexOf(right.key));
  };

  const reactionFor = (targetPet) => {
    const targetReadings = readingsFor(targetPet);
    if (targetPet?.expMode === 'iot-daily') {
      const areaName = areas.find((item) => item.id === targetPet.appliedToAreaId)?.name || 'kolam';
      return kangkungSensorReaction(targetReadings, areaName);
    }
    return reaksiPet(targetReadings, {
      lapar: 100 - targetPet.hunger,
      kotor: 100 - targetPet.hygiene,
      sakit: 100 - targetPet.health,
    });
  };

  const readings = pet ? readingsFor(pet) : [];
  const reaksi = pet ? reactionFor(pet) : reaksiPet([], {});
  const ekspresiKarakter = !isSensorDrivenPet && pet?.happiness < 40
    && !['kepanasan', 'kedinginan'].includes(reaksi.ekspresi)
    ? 'sedih'
    : reaksi.ekspresi;
  const status = pet && !isSensorDrivenPet ? [
    { key: 'hunger', label: 'Kenyang', value: pet.hunger, icon: 'restaurant', low: 'Lapar, beri pakan' },
    { key: 'happiness', label: 'Kebahagiaan', value: pet.happiness, icon: 'mood', low: 'Murung, ajak bermain' },
    { key: 'hygiene', label: 'Kebersihan', value: pet.hygiene, icon: 'shower', low: 'Kotor, bersihkan kolam' },
    { key: 'health', label: 'Kesehatan', value: pet.health, icon: 'favorite', low: 'Lemah, butuh perawatan' },
  ] : [];
  const avgHealth = status.length
    ? Math.round(status.reduce((sum, row) => sum + row.value, 0) / status.length)
    : 0;
  const petLocation = pet?.appliedToAreaId
    ? area?.name || 'Area di luar akses Anda'
    : 'Lokasi belum ditentukan pengelola';

  const bukaDetailPet = (petId) => {
    selectPet(petId);
    setPetDialogId(petId);
  };

  const submitNewPet = (event) => {
    event.preventDefault();
    if (!kolamSaya.length) return;
    const petId = addPet(newPetForm);
    if (!petId) return;
    setAddPetOpen(false);
    setNewPetForm({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
    setPetDialogId(petId);
  };

  return (
    <div className="space-y-6">
      <section aria-label="Koleksi Virtual Pet">
        <SectionTitle
          eyebrow="Koleksi Virtual Pet"
          title="Pilih karakter pet"
          subtitle="Tekan kartu untuk melihat kondisi pet dan pembacaan sensor di lokasinya."
          action={<Button icon="add" onClick={() => setAddPetOpen(true)}>Tambah pet</Button>}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {petsSaya.map((item) => {
            const itemArea = areas.find((candidate) => candidate.id === item.appliedToAreaId);
            const itemLocation = item.appliedToAreaId
              ? itemArea?.name || 'Area di luar akses Anda'
              : 'Lokasi belum ditentukan pengelola';
            const isSelected = item.id === activePetId;
            const itemReaksi = reactionFor(item);
            const itemEkspresi = item.expMode === 'iot-daily'
              ? itemReaksi.ekspresi
              : item.happiness < 40 && !['kepanasan', 'kedinginan'].includes(itemReaksi.ekspresi)
                ? 'sedih'
                : itemReaksi.ekspresi;
            return (
              <div key={item.id} className="pet-collection-card-wrap">
                <Card className={`pet-collection-card ${isSelected ? 'pet-collection-card-active' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-28 shrink-0 sm:w-32">
                      <PetKarakter species={item.species} level={item.level} ekspresi={itemEkspresi} tinggi={142} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-on-surface">{item.name}</h3>
                        {isSelected && <Badge tone="brand">Aktif</Badge>}
                      </div>
                      <p className="text-xs text-on-surface-variant">{item.species} · Level {item.level}</p>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Lokasi: <strong className="text-on-surface">{itemLocation}</strong>
                      </p>
                      {item.expMode === 'iot-daily' ? (
                        <div className="mt-3 rounded-xl border border-outline-variant/40 px-3 py-2 panel-inset">
                          <div className="flex justify-between text-[10px] text-on-surface-variant">
                            <span>Sensor dalam ambang</span>
                            <span>{itemReaksi.readings.filter((reading) => reading.state === 'dalam').length}/3</span>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-on-surface-variant">EXP harian mengikuti pH, suhu, dan TDS.</p>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div>
                            <div className="mb-1 flex justify-between text-[10px] text-on-surface-variant"><span>Kenyang</span><span>{item.hunger}%</span></div>
                            <Bar value={item.hunger} label="Kenyang" />
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between text-[10px] text-on-surface-variant"><span>Kesehatan</span><span>{item.health}%</span></div>
                            <Bar value={item.health} tone={item.health < 40 ? 'bad' : 'brand'} label="Kesehatan" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                <button
                  type="button"
                  className="pet-card-trigger"
                  aria-label={`Buka detail ${item.name}, ${item.species}. Lokasi: ${itemLocation}.`}
                  onClick={() => bukaDetailPet(item.id)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <Modal open={addPetOpen} onClose={() => setAddPetOpen(false)} title="Tambah virtual pet" wide mobileFull>
        {kolamSaya.length === 0 ? (
          <Empty
            title="Belum ada kolam yang ditugaskan"
            icon="water"
            hint="Minta pengelola menugaskan akses ke kolam terlebih dahulu. Pet baru hanya dapat ditempatkan di kolam yang menjadi tanggung jawab Anda."
          />
        ) : (
          <form onSubmit={submitNewPet} className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Pet baru akan ditambahkan ke koleksi akun Anda. Pengelola dapat melihat dan mengatur karakter ini.
            </p>
            <Field label="Nama pet">
              <Input
                value={newPetForm.name}
                onChange={(value) => setNewPetForm({ ...newPetForm, name: value })}
                placeholder="cth. Gurame Kolam Baru"
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
                placeholder="Pilih kolam yang Anda kelola…"
                options={kolamSaya.map((item) => ({ value: item.id, label: item.name }))}
                required
              />
            </Field>
            <p className="text-[11px] text-on-surface-variant">
              Daftar kolam mengikuti hak akses area dari pengelola.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setAddPetOpen(false)}>Batal</Button>
              <Button type="submit" icon="add">Tambah pet</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(petDialogId && pet)}
        onClose={() => setPetDialogId(null)}
        title={pet ? `Detail ${pet.name}` : 'Detail virtual pet'}
        wide
        mobileFull
      >
        {pet && (
          <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
            <Card>
              <SectionTitle
                eyebrow={`${pet.species} · Level ${pet.level}`}
                title={`${pet.name}, ${pet.stage}`}
                subtitle={isSensorDrivenPet
                  ? `Lokasi: ${petLocation}. EXP dan ekspresi mengikuti pH, suhu, dan TDS.`
                  : `Lokasi: ${petLocation}. Reaksi sensor dan status perawatan dijelaskan di bawah; gambar karakter ditampilkan apa adanya.`}
              />
              <PetKarakter species={pet.species} level={pet.level} ekspresi={ekspresiKarakter} pesan={reaksi.pesan} tinggi={300} />
              <p className="mt-2 text-sm text-on-surface-variant">{reaksi.pesan}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto] sm:items-center">
                <p className="text-sm text-on-surface-variant">
                  {isSensorDrivenPet ? (
                    <>Sensor dalam ambang: <strong className="text-on-surface">{reaksi.readings.filter((reading) => reading.state === 'dalam').length}/3</strong></>
                  ) : (
                    <>
                      Kondisi rata-rata: <strong className="text-on-surface">{avgHealth}%</strong>
                      {reaksi.sebab && (
                        <>
                          {' · '}
                          <span className="font-semibold text-on-surface">Pemicu utama: {reaksi.sebab.label}</span>
                        </>
                      )}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <IkonSensor nama={reaksi.tingkat} size={22} />
                  <Badge tone={reaksi.tingkat === 'aman' ? 'ok' : reaksi.tingkat === 'bahaya' ? 'bad' : 'warn'}>
                    {reaksi.aksi}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 dark:mt-4 dark:rounded-xl dark:border dark:border-outline-variant/90 dark:bg-surface-variant dark:p-3">
                <div className="mb-1 flex justify-between text-[11px] font-semibold dark:mb-2 dark:flex-wrap dark:items-center dark:gap-2">
                  <span className="text-on-surface-variant">EXP menuju level {pet.level + 1}</span>
                  <span className="shrink-0 text-on-surface tabular-nums dark:rounded-lg dark:border dark:border-outline-variant/50 dark:bg-surface-container-highest dark:px-2 dark:py-1">
                    {pet.xp}/{pet.xpNext} EXP
                  </span>
                </div>
                <Bar value={pet.xp} max={pet.xpNext} label={`EXP menuju level ${pet.level + 1}`} />
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant dark:mt-2">
                  {isSensorDrivenPet
                    ? `EXP Kangkung: +${KANGKUNG_SENSOR_EXP_PER_DAY} sekali sehari saat pH, suhu, dan TDS semuanya dalam ambang.`
                    : 'Quest kolam yang selesai memberi +10 EXP kepada setiap pet di kolam tersebut. EXP quest terpisah dari poin farm akun.'}
                </p>
              </div>
              {!isSensorDrivenPet && (
                <p className="mt-3 text-[11px] text-on-surface-variant">
                  {pet.lastFed ? `Terakhir diberi pakan: ${pet.lastFed}` : 'Pet belum diberi pakan hari ini.'}
                </p>
              )}
            </Card>

            {isSensorDrivenPet ? (
              <KangkungSensorPanel summary={reaksi} awardedToday={kangkungSensorAwardedToday} />
            ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)]">
              <Card>
                <SectionTitle eyebrow="Status Pet" title="Kondisi perawatan" subtitle="Nilai ini milik pet ini saja." />
                <div id="pet-care-actions" className="mb-4 grid grid-cols-2 gap-2">
                  <Button icon="restaurant" onClick={() => feedPet(pet.id)} className="justify-center">Beri pakan</Button>
                  <Button icon="sports_esports" variant="soft" onClick={() => playPet(pet.id)} className="justify-center">Ajak main</Button>
                  <Button icon="cleaning_services" variant="soft" onClick={() => cleanPet(pet.id)} className="justify-center">Bersihkan</Button>
                  <Button icon="healing" variant="ghost" onClick={() => healPet(pet.id)} className="justify-center">Rawat</Button>
                </div>
                <p className="-mt-2 mb-4 text-[11px] text-on-surface-variant">Ajak main hanya menambah kebahagiaan; tidak memberi poin atau EXP.</p>
                <section aria-label="Quest harian kolam" className="mb-4 rounded-xl border border-outline-variant/40 bg-surface p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">Quest harian kolam</h3>
                      <p className="text-[11px] text-on-surface-variant">Reset otomatis tengah malam lokal · level/EXP tetap terkumpul</p>
                      <p className="text-[11px] text-on-surface-variant">Klik kotak untuk klaim +10 EXP per pet</p>
                    </div>
                    {kolamPet && (
                      <Badge tone={questRows.length > 0 && questRows.every((quest) => quest.done) ? 'ok' : 'brand'}>
                        {questRows.filter((quest) => quest.done).length}/{questRows.length}
                      </Badge>
                    )}
                  </div>
                  {kolamPet ? (
                    <ul className="space-y-1.5">
                      {questRows.map((quest) => (
                        <li key={quest.id} className="rounded-lg border border-outline-variant/40 px-2.5 py-2">
                          <label className="flex min-w-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={quest.done}
                              disabled={quest.done}
                              onChange={(event) => {
                                if (event.target.checked) claimPetQuest(quest.id, kolamPet.id, 'daily');
                              }}
                              aria-label={`Quest ${quest.title}: ${quest.done ? 'selesai hari ini' : 'belum selesai'}`}
                              className="h-4 w-4 shrink-0 accent-emerald-700 disabled:opacity-100"
                            />
                            <span className={`min-w-0 flex-1 text-xs font-semibold ${quest.done ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                              {quest.title}
                            </span>
                            <Badge tone={quest.done ? 'ok' : 'brand'}>+{quest.exp} EXP</Badge>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      {areaAccessTerbatas
                        ? 'Quest tidak tersedia karena kolam ini di luar akses Anda.'
                        : pet.appliedToAreaId
                          ? 'Quest harian hanya tersedia untuk pet yang ditempatkan di kolam.'
                          : 'Tempatkan pet di kolam yang Anda kelola untuk memulai quest harian.'}
                    </p>
                  )}
                </section>
                <section aria-label="Quest bulanan kolam" className="mb-4 rounded-xl border border-outline-variant/40 bg-surface p-3">
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-on-surface">Quest bulanan kolam</h3>
                    <p className="text-[11px] text-on-surface-variant">Reset awal bulan lokal · klik kotak untuk klaim +10 EXP per pet</p>
                  </div>
                  {kolamPet ? (
                    <ul className="space-y-1.5">
                      {monthlyQuestRows.map((quest) => (
                        <li key={quest.id} className="rounded-lg border border-outline-variant/40 px-2.5 py-2">
                          <label className="flex min-w-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={quest.done}
                              disabled={quest.done}
                              onChange={(event) => {
                                if (event.target.checked) claimPetQuest(quest.id, kolamPet.id, 'monthly');
                              }}
                              aria-label={`Quest bulanan ${quest.title}: ${quest.done ? 'selesai bulan ini' : 'belum selesai bulan ini'}`}
                              className="h-4 w-4 shrink-0 accent-emerald-700 disabled:opacity-100"
                            />
                            <span className={`min-w-0 flex-1 text-xs font-semibold ${quest.done ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                              {quest.title}
                            </span>
                            <Badge tone={quest.done ? 'ok' : 'brand'}>+{quest.exp} EXP</Badge>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      {areaAccessTerbatas
                        ? 'Quest tidak tersedia karena kolam ini di luar akses Anda.'
                        : pet.appliedToAreaId
                          ? 'Quest bulanan hanya tersedia untuk pet yang ditempatkan di kolam.'
                          : 'Tempatkan pet di kolam yang Anda kelola untuk memulai quest bulanan.'}
                    </p>
                  )}
                </section>
                <div className="space-y-3">
                  {status.map((row) => (
                    <div key={row.key}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[15px]">{row.icon}</span>
                          {row.label}
                        </span>
                        <span className={row.value < 40 ? 'font-bold text-red-600' : 'text-on-surface'}>{row.value}%</span>
                      </div>
                      <Bar value={row.value} tone={row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand'} label={row.label} />
                      {row.value < 40 && <p className="mt-1 text-[11px] text-red-600">{row.low}</p>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-outline-variant/40 pt-3">
                  <Button variant="ghost" icon="schedule" onClick={() => decayPet(pet.id)}>Lewati waktu (uji penurunan)</Button>
                  <p className="mt-2 text-[11px] text-on-surface-variant">Simulasi ini menurunkan kondisi pet untuk pengujian.</p>
                </div>
              </Card>

              <Card>
                <SectionTitle
                  eyebrow="Pemantauan IoT"
                  title="Kondisi air kolam"
                  subtitle="Setiap pembacaan dibandingkan dengan ambang area atau kategori yang ditetapkan pengelola."
                />
                <div className="mb-4 rounded-xl border border-outline-variant/40 p-3 panel-inset">
                  {kolamPet ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-on-surface-variant">Jumlah ikan tercatat</p>
                          <p className="text-lg font-extrabold text-on-surface">{Number(kolamPet.population || 0).toLocaleString('id-ID')} {kolamPet.populationUnit || 'ekor'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-on-surface-variant">Ikan mati hari ini</p>
                          <p className="text-lg font-extrabold text-on-surface">{ikanMatiHariIni} ekor</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-on-surface-variant">Data mengikuti populasi dan catatan kematian kolam yang sama pada kedua role.</p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      {areaAccessTerbatas ? 'Data populasi tidak tersedia untuk area ini.' : 'Tautkan pet ke kolam untuk melihat populasi dan kematian ikan.'}
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Lokasi pet</p>
                  <Select
                    value={areaAccessTerbatas ? '' : pet.appliedToAreaId || ''}
                    onChange={(areaId) => applyPetToArea(areaId, pet.id)}
                    placeholder={areaAccessTerbatas ? 'Lokasi di luar area akses' : 'Pilih kolam…'}
                    disabled={areaAccessTerbatas}
                    options={areas.filter((candidate) => candidate.type === 'kolam').map((candidate) => ({ value: candidate.id, label: candidate.name }))}
                  />
                </div>
                {readings.length === 0 ? (
                  <Empty
                    title={areaAccessTerbatas ? 'Data lokasi tidak tersedia' : 'Belum ada pembacaan sensor'}
                    icon="sensors_off"
                    hint={areaAccessTerbatas
                      ? 'Lokasi pet berada di luar area yang ditugaskan kepada akun ini.'
                      : 'Belum ada sensor air di kolam ini. Pet tetap dapat dirawat, tetapi reaksinya belum dapat mengikuti kualitas air.'}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {readings.map((read) => {
                      const evaluated = reaksi.parameter.find((item) => item.key === read.key);
                      const assessable = read.value != null && Boolean(read.ambang);
                      const level = assessable ? evaluated?.tingkat || (read.ok ? 'aman' : 'waspada') : 'unknown';
                      const tone = level === 'aman' ? 'ok' : level === 'bahaya' ? 'bad' : level === 'waspada' ? 'warn' : 'muted';
                      const statusLabel = level === 'unknown'
                        ? read.value == null ? 'Belum ada data' : 'Ambang belum diatur'
                        : level === 'aman' ? 'Dalam ambang' : level === 'bahaya' ? 'Jauh di luar ambang' : 'Mendekati batas';
                      return (
                        <div key={read.key} className="rounded-xl border border-outline-variant/40 p-3 panel-inset">
                          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                              <IkonSensor nama={read.key} size={18} />
                              <span className="truncate">{read.label}</span>
                            </span>
                            <Badge className="max-w-full shrink-0" tone={tone}>{statusLabel}</Badge>
                          </div>
                          <p className="text-lg font-extrabold text-on-surface">
                            {read.value} <small className="text-[11px] font-semibold text-on-surface-variant">{read.unit}</small>
                          </p>
                          {read.ambang && (
                            <p className="text-[10px] text-on-surface-variant">Rentang ideal {read.ambang[0]}–{read.ambang[1]} {read.unit}</p>
                          )}
                          <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{penjelasanKondisiAir(read)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 rounded-xl border border-outline-variant/40 p-3 panel-inset">
                  <p className="text-xs font-bold text-on-surface">Dampak pada karakter</p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{reaksi.pesan}</p>
                  {reaksi.sebab && (
                    <p className="mt-2 text-[11px] text-on-surface-variant">
                      Reaksi utama dipicu oleh <strong className="text-on-surface">{reaksi.sebab.label}</strong>.
                    </p>
                  )}
                </div>
              </Card>
            </div>
            )}

            <Card>
              <SectionTitle eyebrow="Riwayat Perawatan" title={`Jurnal ${pet.name}`} />
              {pet.log.length === 0 ? (
                <Empty title="Belum ada aktivitas" icon="pets" hint="Aktivitas perawatan pet ini akan tercatat di sini." />
              ) : (
                <Table head={['Waktu', 'Aktivitas', 'Perubahan']}>
                  {pet.log.map((row) => (
                    <tr key={row.id} className="hover:bg-primary/5">
                      <td className="whitespace-nowrap px-3 py-2 text-on-surface-variant">{row.at}</td>
                      <td className="px-3 py-2 text-on-surface">{row.text}</td>
                      <td className="px-3 py-2 font-semibold text-primary">{row.delta}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
