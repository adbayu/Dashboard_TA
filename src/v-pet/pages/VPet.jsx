import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ambangUntuk, METRIC_KEYS, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { localDateKey, localMonthKey, millisecondsUntilNextLocalMidnight } from '../../shared/model/localDate.js';
import { Bar, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatusPill, Table } from '../../shared/components/ui';
import { FOKUS } from '../../shared/components/ui/tones.js';
import AreaSection from '../../components/iot/AreaSection.jsx';
import SensorReading from '../../components/iot/SensorReading.jsx';
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

// Status pembacaan sensor (dalam | bawah | atas | tanpa-ambang | tanpa-data)
// ke status SensorReading: selalu teks + ikon lewat komponen bersama.
const STATUS_SENSOR = { dalam: 'normal', bawah: 'low', atas: 'high' };
const IKON_SENSOR = { ph: 'flask-conical', temp: 'thermometer', tds: 'droplet' };
const DESIMAL = { ph: 1, temp: 1, tds: 0 };

function KangkungSensorPanel({ summary, awardedToday }) {
  return (
    <div className="space-y-4">
      <AreaSection area="leaf" title="Kondisi hidroponik" meta="EXP Kangkung hanya mengikuti sensor pH, suhu, dan TDS di kolam ini.">
        {summary.readings.map((reading) => (
          <SensorReading
            key={reading.key}
            name={reading.label}
            icon={IKON_SENSOR[reading.key]}
            value={reading.value == null ? null : Number(reading.value)}
            decimals={DESIMAL[reading.key] ?? 1}
            unit={reading.unit}
            min={reading.threshold?.[0]}
            max={reading.threshold?.[1]}
            status={STATUS_SENSOR[reading.state]}
            emptyText={reading.state === 'tanpa-data' ? 'Belum ada data dari sensor ini.' : undefined}
          />
        ))}
      </AreaSection>
      <Card pad="sm" area="leaf">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-text">EXP sensor harian</p>
          {awardedToday ? (
            <StatusPill tone="ok" icon="circle-check">+{KANGKUNG_SENSOR_EXP_PER_DAY} EXP diterima hari ini</StatusPill>
          ) : (
            <StatusPill tone={summary.allSafe ? 'info' : 'muted'} icon="clock">Maksimal sekali per hari</StatusPill>
          )}
        </div>
        <p className="mt-1 text-sm text-text-2">
          {awardedToday
            ? 'Reward hari ini sudah dicatat; pembacaan berikutnya tidak menggandakan EXP.'
            : summary.allSafe
              ? 'Semua parameter aman; EXP akan dicatat pada pembaruan telemetri berikutnya.'
              : `+${KANGKUNG_SENSOR_EXP_PER_DAY} EXP diberikan saat ketiga sensor tersedia dan berada dalam ambang area.`}
        </p>
        <p className="mt-2 text-sm text-text-2">{summary.message}</p>
      </Card>
    </div>
  );
}

// Daftar quest (harian/bulanan) dengan kotak centang asli: klaim satu arah,
// quest yang sudah selesai dinonaktifkan supaya tidak bisa dibatalkan.
function DaftarQuest({ rows, onClaim, labelFor }) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((quest) => (
        <li key={quest.id} className="border-t border-border first:border-t-0">
          <label className="flex min-w-0 cursor-pointer items-center gap-2.5 py-2 text-sm leading-5 has-[:disabled]:cursor-default">
            <input
              type="checkbox"
              checked={quest.done}
              disabled={quest.done}
              onChange={(event) => {
                if (event.target.checked) onClaim(quest.id);
              }}
              aria-label={labelFor(quest)}
              className={`h-[18px] w-[18px] shrink-0 accent-primary disabled:opacity-100 ${FOKUS}`}
            />
            <span className={`min-w-0 flex-1 ${quest.done ? 'text-text-2 line-through' : 'text-text'}`}>{quest.title}</span>
            <span className="shrink-0 font-num text-sm text-text-2">+{quest.exp} EXP</span>
          </label>
        </li>
      ))}
    </ul>
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
          device: device?.code,
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
          device: device.code,
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
    { key: 'hunger', label: 'Kenyang', value: pet.hunger, icon: 'utensils', low: 'Lapar, beri pakan' },
    { key: 'happiness', label: 'Kebahagiaan', value: pet.happiness, icon: 'smile', low: 'Murung, ajak bermain' },
    { key: 'hygiene', label: 'Kebersihan', value: pet.hygiene, icon: 'shower-head', low: 'Kotor, bersihkan kolam' },
    { key: 'health', label: 'Kesehatan', value: pet.health, icon: 'heart', low: 'Lemah, butuh perawatan' },
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

  const tonePet = reaksi.tingkat === 'aman' ? 'ok' : reaksi.tingkat === 'bahaya' ? 'bad' : 'warn';
  const ikonTone = { ok: 'circle-check', warn: 'triangle-alert', bad: 'circle-alert' };
  const questHarianSelesai = questRows.filter((quest) => quest.done).length;
  const pesanTanpaQuest = (jenis) => (areaAccessTerbatas
    ? 'Quest tidak tersedia karena kolam ini di luar akses Anda.'
    : pet?.appliedToAreaId
      ? `Quest ${jenis} hanya tersedia untuk pet yang ditempatkan di kolam.`
      : `Tempatkan pet di kolam yang Anda kelola untuk memulai quest ${jenis}.`);

  return (
    <div>
      <PageHeader
        title="V-Pet"
        subtitle="Rawat pet Anda dan pantau air kolamnya. Quest harian menambah EXP."
        actions={<Button icon="plus" onClick={() => setAddPetOpen(true)}>Tambah pet</Button>}
      />

      <section aria-label="Koleksi Virtual Pet">
        <div className="mb-3">
          <h2 className="font-head text-[19px] font-bold leading-[26px] text-text">Pilih karakter pet</h2>
          <p className="mt-1 text-sm text-text-2">Tekan kartu untuk melihat kondisi pet dan pembacaan sensor di lokasinya.</p>
        </div>
        {petsSaya.length === 0 ? (
          <EmptyState title="Belum ada pet" icon="paw-print">
            Tambahkan pet di kolam yang Anda kelola, atau minta pengelola menempatkan pet di area Anda.
          </EmptyState>
        ) : (
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
                  <Card
                    pad="sm"
                    area={item.expMode === 'iot-daily' ? 'leaf' : 'water'}
                    className={`pet-collection-card ${isSelected ? 'pet-collection-card-active' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-28 shrink-0 sm:w-32">
                        <PetKarakter species={item.species} level={item.level} ekspresi={itemEkspresi} tinggi={142} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-head text-base font-bold text-text">{item.name}</h3>
                          {isSelected && <StatusPill tone="info" icon="circle-check">Aktif</StatusPill>}
                        </div>
                        <p className="text-sm text-text-2">{item.species} · Level {item.level}</p>
                        <p className="mt-2 text-sm text-text-2">
                          Lokasi: <span className="font-semibold text-text">{itemLocation}</span>
                        </p>
                        {item.expMode === 'iot-daily' ? (
                          <div className="mt-3">
                            <div className="flex justify-between gap-2 text-sm text-text-2">
                              <span>Sensor dalam ambang</span>
                              <span className="font-num">{itemReaksi.readings.filter((reading) => reading.state === 'dalam').length}/3</span>
                            </div>
                            <p className="mt-1 text-sm text-text-2">EXP harian mengikuti pH, suhu, dan TDS.</p>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <div>
                              <div className="mb-1 flex justify-between text-sm text-text-2"><span>Kenyang</span><span className="font-num">{item.hunger}%</span></div>
                              <Bar value={item.hunger} label="Kenyang" />
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-sm text-text-2"><span>Kesehatan</span><span className="font-num">{item.health}%</span></div>
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
        )}
      </section>

      <Modal open={addPetOpen} onClose={() => setAddPetOpen(false)} title="Tambah virtual pet" wide mobileFull>
        {kolamSaya.length === 0 ? (
          <EmptyState
            title="Belum ada kolam yang ditugaskan"
            icon="waves"
            hint="Minta pengelola menugaskan akses ke kolam terlebih dahulu. Pet baru hanya dapat ditempatkan di kolam yang menjadi tanggung jawab Anda."
          />
        ) : (
          <form onSubmit={submitNewPet} className="space-y-3">
            <p className="text-sm text-text-2">
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
            <Field label="Kolam" hint="Daftar kolam mengikuti hak akses area dari pengelola.">
              <Select
                value={newPetForm.appliedToAreaId}
                onChange={(value) => setNewPetForm({ ...newPetForm, appliedToAreaId: value })}
                placeholder="Pilih kolam yang Anda kelola…"
                options={kolamSaya.map((item) => ({ value: item.id, label: item.name }))}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setAddPetOpen(false)}>Batal</Button>
              <Button type="submit" icon="plus">Tambah pet</Button>
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
          <div className="custom-scrollbar max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto pr-1">
            <Card
              area={isSensorDrivenPet ? 'leaf' : 'water'}
              title={`${pet.name}, ${pet.stage}`}
              subtitle={`${pet.species} · Level ${pet.level} · Lokasi: ${petLocation}`}
            >
              <div className="grid items-start gap-6 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-3">
                  <PetKarakter species={pet.species} level={pet.level} ekspresi={ekspresiKarakter} pesan={reaksi.pesan} tinggi={300} />
                  <p className="text-[15px] leading-[22px] text-text">
                    <span className="font-semibold">Kata {pet.name}:</span> {reaksi.pesan}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <IkonSensor nama={reaksi.tingkat} size={22} />
                    <StatusPill tone={tonePet} icon={ikonTone[tonePet]}>{reaksi.aksi}</StatusPill>
                  </div>
                  <p className="text-sm text-text-2">
                    {isSensorDrivenPet ? (
                      <>Sensor dalam ambang: <span className="font-num font-semibold text-text">{reaksi.readings.filter((reading) => reading.state === 'dalam').length}/3</span></>
                    ) : (
                      <>
                        Kondisi rata-rata: <span className="font-num font-semibold text-text">{avgHealth}%</span>
                        {reaksi.sebab && (
                          <>
                            {' · '}
                            <span className="font-semibold text-text">Pemicu utama: {reaksi.sebab.label}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>

                {isSensorDrivenPet ? (
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="font-head text-base font-bold text-text">Mengikuti sensor</h3>
                    <p className="text-sm text-text-2">
                      EXP dan ekspresi mengikuti pH, suhu, dan TDS. Pet ini tidak perlu diberi pakan atau dibersihkan.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-4">
                    <div>
                      <h3 className="font-head text-base font-bold text-text">Kebutuhan hari ini</h3>
                      <p className="text-sm text-text-2">Nilai ini milik pet ini saja.</p>
                    </div>
                    {status.map((row) => {
                      const nada = row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand';
                      return (
                        <div key={row.key} className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                            <span className="font-semibold text-text">{row.label}</span>
                            <span className="flex items-center gap-2.5">
                              {row.value < 40 && <StatusPill tone="bad" icon={row.icon}>{row.low}</StatusPill>}
                              <span className="font-num text-text">{row.value}%</span>
                            </span>
                          </div>
                          <Bar value={row.value} tone={nada} label={row.label} />
                        </div>
                      );
                    })}
                    <div id="pet-care-actions" className="flex flex-wrap gap-2">
                      <Button icon="utensils" onClick={() => feedPet(pet.id)}>Beri pakan</Button>
                      <Button icon="gamepad-2" variant="secondary" onClick={() => playPet(pet.id)}>Ajak main</Button>
                      <Button icon="brush-cleaning" variant="secondary" onClick={() => cleanPet(pet.id)}>Bersihkan</Button>
                      <Button icon="bandage" variant="ghost" onClick={() => healPet(pet.id)}>Rawat</Button>
                    </div>
                    <p className="-mt-1.5 text-sm text-text-2">Ajak main hanya menambah kebahagiaan; tidak memberi poin atau EXP.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm font-semibold text-text">
                  <span>EXP menuju level {pet.level + 1}</span>
                  <span className="font-num">{pet.xp} / {pet.xpNext} EXP</span>
                </div>
                <Bar value={pet.xp} max={pet.xpNext} label={`EXP menuju level ${pet.level + 1}`} />
                <p className="text-sm text-text-2">
                  {isSensorDrivenPet
                    ? `EXP Kangkung: +${KANGKUNG_SENSOR_EXP_PER_DAY} sekali sehari saat pH, suhu, dan TDS semuanya dalam ambang.`
                    : 'Quest kolam yang selesai memberi +10 EXP kepada setiap pet di kolam tersebut. EXP quest terpisah dari poin farm akun.'}
                </p>
                {!isSensorDrivenPet && (
                  <p className="text-sm text-text-2">
                    {pet.lastFed ? `Terakhir diberi pakan: ${pet.lastFed}` : 'Pet belum diberi pakan hari ini.'}
                  </p>
                )}
              </div>
            </Card>

            {isSensorDrivenPet ? (
              <KangkungSensorPanel summary={reaksi} awardedToday={kangkungSensorAwardedToday} />
            ) : (
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex min-w-0 flex-col gap-4">
                  {readings.length === 0 ? (
                    <EmptyState
                      title={areaAccessTerbatas ? 'Data lokasi tidak tersedia' : 'Belum ada pembacaan sensor'}
                      icon="sensors_off"
                      hint={areaAccessTerbatas
                        ? 'Lokasi pet berada di luar area yang ditugaskan kepada akun ini.'
                        : 'Belum ada sensor air di kolam ini. Pet tetap dapat dirawat, tetapi reaksinya belum dapat mengikuti kualitas air.'}
                    />
                  ) : (
                    <AreaSection area="water" title={`Kondisi air ${kolamPet?.name || area?.name || 'kolam'}`} meta={`Menentukan ekspresi ${pet.name}`}>
                      {readings.map((read) => {
                        const evaluated = reaksi.parameter.find((item) => item.key === read.key);
                        const assessable = read.value != null && Boolean(read.ambang);
                        const level = assessable ? evaluated?.tingkat || (read.ok ? 'aman' : 'waspada') : 'unknown';
                        const posisi = nilaiTerhadapAmbang(read.value, read.ambang);
                        const statusBaca = !read.ambang ? 'no-range' : posisi === 'atas' ? 'high' : posisi === 'bawah' ? 'low' : 'normal';
                        const tingkatTeks = level === 'bahaya' ? 'Jauh di luar ambang. ' : level === 'waspada' ? 'Mendekati batas. ' : '';
                        return (
                          <div key={read.key} className="flex min-w-0 flex-col gap-1.5">
                            <SensorReading
                              name={read.label}
                              icon={IKON_SENSOR[read.key]}
                              device={read.device}
                              value={read.value == null ? null : Number(read.value)}
                              decimals={DESIMAL[read.key] ?? 1}
                              unit={read.unit}
                              min={read.ambang?.[0]}
                              max={read.ambang?.[1]}
                              status={statusBaca}
                            />
                            <p className="text-sm text-text-2">{tingkatTeks}{penjelasanKondisiAir(read)}</p>
                          </div>
                        );
                      })}
                    </AreaSection>
                  )}

                  <Card pad="sm" title="Dampak pada karakter">
                    <p className="text-sm text-text-2">{reaksi.pesan}</p>
                    {reaksi.sebab && (
                      <p className="mt-2 text-sm text-text-2">
                        Reaksi utama dipicu oleh <span className="font-semibold text-text">{reaksi.sebab.label}</span>.
                      </p>
                    )}
                  </Card>

                  <Card pad="sm" title="Kolam dan lokasi pet">
                    {kolamPet ? (
                      <>
                        <dl className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-sm text-text-2">Jumlah ikan tercatat</dt>
                            <dd className="font-num text-lg font-semibold text-text">{Number(kolamPet.population || 0).toLocaleString('id-ID')} {kolamPet.populationUnit || 'ekor'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-text-2">Ikan mati hari ini</dt>
                            <dd className="font-num text-lg font-semibold text-text">{ikanMatiHariIni} ekor</dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-sm text-text-2">Data mengikuti populasi dan catatan kematian kolam yang sama pada kedua role.</p>
                      </>
                    ) : (
                      <p className="text-sm text-text-2">
                        {areaAccessTerbatas ? 'Data populasi tidak tersedia untuk area ini.' : 'Tautkan pet ke kolam untuk melihat populasi dan kematian ikan.'}
                      </p>
                    )}
                    <Field label="Lokasi pet" className="mt-4">
                      <Select
                        value={areaAccessTerbatas ? '' : pet.appliedToAreaId || ''}
                        onChange={(areaId) => applyPetToArea(areaId, pet.id)}
                        placeholder={areaAccessTerbatas ? 'Lokasi di luar area akses' : 'Pilih kolam…'}
                        disabled={areaAccessTerbatas}
                        options={areas.filter((candidate) => candidate.type === 'kolam').map((candidate) => ({ value: candidate.id, label: candidate.name }))}
                      />
                    </Field>
                  </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                  <div className="grid items-start gap-4 md:grid-cols-2">
                    <section aria-label="Quest harian kolam">
                      <Card
                        as="div"
                        title="Quest harian kolam"
                        subtitle={kolamPet
                          ? `${questHarianSelesai} dari ${questRows.length} selesai. Reset otomatis tengah malam lokal; level dan EXP tetap terkumpul.`
                          : 'Reset otomatis tengah malam lokal; level dan EXP tetap terkumpul.'}
                      >
                        {kolamPet ? (
                          <DaftarQuest
                            rows={questRows}
                            onClaim={(questId) => claimPetQuest(questId, kolamPet.id, 'daily')}
                            labelFor={(quest) => `Quest ${quest.title}: ${quest.done ? 'selesai hari ini' : 'belum selesai'}`}
                          />
                        ) : (
                          <p className="text-sm text-text-2">{pesanTanpaQuest('harian')}</p>
                        )}
                      </Card>
                    </section>
                    <section aria-label="Quest bulanan kolam">
                      <Card as="div" title="Quest bulanan kolam" subtitle="Reset awal bulan lokal.">
                        {kolamPet ? (
                          <DaftarQuest
                            rows={monthlyQuestRows}
                            onClaim={(questId) => claimPetQuest(questId, kolamPet.id, 'monthly')}
                            labelFor={(quest) => `Quest bulanan ${quest.title}: ${quest.done ? 'selesai bulan ini' : 'belum selesai bulan ini'}`}
                          />
                        ) : (
                          <p className="text-sm text-text-2">{pesanTanpaQuest('bulanan')}</p>
                        )}
                      </Card>
                    </section>
                  </div>
                  <p className="text-sm text-text-2">
                    Klik kotak quest untuk klaim +10 EXP per pet. Poin farm Anda ada di{' '}
                    <Link to="/gamifikasi" className={`rounded-sm font-semibold text-primary underline decoration-1 underline-offset-[3px] hover:text-primary-hover ${FOKUS}`}>
                      Misi &amp; poin
                    </Link>
                    .
                  </p>
                  <div className="border-t border-border pt-3">
                    <Button variant="ghost" icon="clock" onClick={() => decayPet(pet.id)}>Lewati waktu (uji penurunan)</Button>
                    <p className="mt-2 text-sm text-text-2">Simulasi ini menurunkan kondisi pet untuk pengujian.</p>
                  </div>
                </div>
              </div>
            )}

            <Card title={`Jurnal ${pet.name}`} subtitle="Riwayat perawatan pet ini.">
              {pet.log.length === 0 ? (
                <EmptyState title="Belum ada aktivitas" icon="paw-print" hint="Aktivitas perawatan pet ini akan tercatat di sini." />
              ) : (
                <Table head={['Waktu', 'Aktivitas', 'Perubahan']}>
                  {pet.log.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-2">
                      <td className="whitespace-nowrap px-3 py-2 text-text-2">{row.at}</td>
                      <td className="px-3 py-2">{row.text}</td>
                      <td className="px-3 py-2 font-num font-semibold">{row.delta}</td>
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
