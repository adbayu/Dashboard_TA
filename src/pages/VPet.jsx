import { useState } from 'react';
import { ambangUntuk, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, Field, Input, Modal, SectionTitle, Table, Select } from '../components/ui';
import PetKarakter, { IkonSensor } from '../components/PetKarakter';
import { SEED_PETS } from '../data/seed';
import { penjelasanKondisiAir, reaksiPet, URUTAN_PARAMETER } from '../data/reaksiPet';
import '../pet.css';

const SPECIES = [...new Set(SEED_PETS.map((item) => item.species))];

export default function VPet() {
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
    areasSaya,
    applyPetToArea,
    kematianArea,
    devices,
    categoryOf,
  } = useSmart();
  const [petDialogId, setPetDialogId] = useState(null);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [newPetForm, setNewPetForm] = useState({ name: '', species: SPECIES[0] || '', appliedToAreaId: '' });
  const areas = areasSaya;
  const kolamSaya = areas.filter((item) => item.type === 'kolam');
  const petsSaya = pets.filter((item) => !item.ownerUserId || item.ownerUserId === currentUser?.id);
  const activePetId = petsSaya.some((item) => item.id === selectedPetId) ? selectedPetId : petsSaya[0]?.id;
  const requestedPetId = petsSaya.some((item) => item.id === petDialogId) ? petDialogId : activePetId;
  const pet = petsSaya.find((item) => item.id === requestedPetId) || null;
  const area = areas.find((item) => item.id === pet?.appliedToAreaId);
  const areaAccessTerbatas = Boolean(pet?.appliedToAreaId) && !area;
  const kolamPet = area?.type === 'kolam' ? area : null;
  const ikanMatiHariIni = kolamPet
    ? kematianArea(kolamPet.id).reduce((total, row) => total + Number(row.jumlah || 0), 0)
    : 0;

  const readingsFor = (targetPet) => {
    const targetArea = areas.find((item) => item.id === targetPet?.appliedToAreaId);
    return devices
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
    return reaksiPet(targetReadings, {
      lapar: 100 - targetPet.hunger,
      kotor: 100 - targetPet.hygiene,
      sakit: 100 - targetPet.health,
    });
  };

  const readings = pet ? readingsFor(pet) : [];
  const reaksi = pet ? reactionFor(pet) : reaksiPet([], {});
  const ekspresiKarakter = pet?.happiness < 40
    && !['kepanasan', 'kedinginan'].includes(reaksi.ekspresi)
    ? 'sedih'
    : reaksi.ekspresi;
  const status = pet ? [
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
            const itemEkspresi = item.happiness < 40
              && !['kepanasan', 'kedinginan'].includes(itemReaksi.ekspresi)
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
                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="mb-1 flex justify-between text-[10px] text-on-surface-variant"><span>Kenyang</span><span>{item.hunger}%</span></div>
                          <Bar value={item.hunger} />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-[10px] text-on-surface-variant"><span>Kesehatan</span><span>{item.health}%</span></div>
                          <Bar value={item.health} tone={item.health < 40 ? 'bad' : 'brand'} />
                        </div>
                      </div>
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
                subtitle={`Lokasi: ${petLocation}. Reaksi sensor dan status perawatan dijelaskan di bawah; gambar karakter ditampilkan apa adanya.`}
              />
              <PetKarakter species={pet.species} level={pet.level} ekspresi={ekspresiKarakter} pesan={reaksi.pesan} tinggi={300} />
              <p className="mt-2 text-sm text-on-surface-variant">{reaksi.pesan}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto] sm:items-center">
                <p className="text-sm text-on-surface-variant">
                  Kondisi rata-rata: <strong className="text-on-surface">{avgHealth}%</strong>
                  {reaksi.sebab && (
                    <>
                      {' · '}
                      <span className="font-semibold text-on-surface">Pemicu utama: {reaksi.sebab.label}</span>
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
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] font-semibold">
                  <span className="text-on-surface-variant">EXP menuju level {pet.level + 1}</span>
                  <span className="text-on-surface">{pet.xp}/{pet.xpNext} EXP</span>
                </div>
                <Bar value={pet.xp} max={pet.xpNext} />
                <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                  1 EXP tiap 2 poin peningkatan bersih pada Kenyang, Kebersihan, atau Kesehatan (dibulatkan ke atas). Ajak main hanya menaikkan Kebahagiaan, tanpa EXP.
                </p>
              </div>
              <p className="mt-3 text-[11px] text-on-surface-variant">
                {pet.lastFed ? `Terakhir diberi pakan: ${pet.lastFed}` : 'Pet belum diberi pakan hari ini.'}
              </p>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1.2fr)]">
              <Card>
                <SectionTitle eyebrow="Status Pet" title="Kondisi perawatan" subtitle="Nilai ini milik pet ini saja." />
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Button icon="restaurant" onClick={() => feedPet(pet.id)} className="justify-center">Beri pakan</Button>
                  <Button icon="sports_esports" variant="soft" onClick={() => playPet(pet.id)} className="justify-center">Ajak main</Button>
                  <Button icon="cleaning_services" variant="soft" onClick={() => cleanPet(pet.id)} className="justify-center">Bersihkan</Button>
                  <Button icon="healing" variant="ghost" onClick={() => healPet(pet.id)} className="justify-center">Rawat</Button>
                </div>
                <p className="-mt-2 mb-4 text-[11px] text-on-surface-variant">Ajak main hanya menambah kebahagiaan; tidak memberi EXP.</p>
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
                      <Bar value={row.value} tone={row.value < 40 ? 'bad' : row.value < 65 ? 'warn' : 'brand'} />
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
