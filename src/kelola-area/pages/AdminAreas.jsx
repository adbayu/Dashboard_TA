import { useState } from 'react';
import { formatRupiah, METRIC_KEYS, METRIC_META, METRIC_RANGE, useSmart } from '../../shared/store/SmartStore';
import {
  Alert, Button, EmptyState, Field, FilterChip, IconButton, Input, Modal, NumberInput, PageHeader, Select, StatusPill, Table,
} from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { areaTone } from '../model/areaTone.js';
import { formatAngka, ikonJenisArea, LABEL_JENIS_AREA } from '../model/areaTampil.js';

const TYPES = Object.entries(LABEL_JENIS_AREA).map(([value, label]) => ({ value, label }));
const labelAmbang = (key) => METRIC_META[key].label.replace(' Air', '').replace(' Nutrisi', '');
const empty = { name: '', type: 'kolam', location: '', volume: '', unit: 'liter', commodity: '', population: '', populationUnit: 'ekor', status: 'aktif', note: '', deviceIds: [], targets: {} };

export default function AdminAreas() {
  const { areas, devices, users, saveArea, removeArea, hppTotal, saveDevice } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Pintu modal "tambah" tidak bisa memakai `form !== empty`: saat menambah, form
  // di-set ke objek `empty` itu sendiri, sehingga perbandingannya SELALU false dan
  // modal tidak pernah terbuka. Dipakai state khusus supaya tidak ada ketergantungan
  // pada identitas objek.
  const [terbuka, setTerbuka] = useState(false);
  const open = terbuka;
  const closeModal = () => { setEditing(null); setForm(empty); setTerbuka(false); };
  const bukaTambah = () => { setEditing(null); setForm(empty); setTerbuka(true); };

  const startEdit = (area) => {
    setEditing(area);
    setForm({ ...empty, ...area, deviceIds: [...(area.deviceIds || [])] });
    setTerbuka(true);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name) return;
    const deviceIds = form.deviceIds || [];
    const savedId = form.id || null;
    saveArea({ ...form, deviceIds, volume: Number(form.volume) || 0, population: Number(form.population) || 0 });
    // Sinkronkan penempatan device: yang dipilih masuk area ini, yang dilepas keluar.
    if (savedId) {
      devices.forEach((device) => {
        const shouldBelong = deviceIds.includes(device.id);
        if (shouldBelong && device.areaId !== savedId) saveDevice({ ...device, areaId: savedId });
        if (!shouldBelong && device.areaId === savedId) saveDevice({ ...device, areaId: null });
      });
    }
    closeModal();
  };

  const toggleDevice = (id) => {
    setForm((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(id) ? prev.deviceIds.filter((x) => x !== id) : [...prev.deviceIds, id],
    }));
  };

  // Ambang khusus area. Dua sisi (min/max) harus terisi; kalau salah satu
  // dikosongkan, ambang area itu dilepas dan dashboard kembali memakai ambang
  // bawaan kategori, supaya tidak ada setengah ambang yang membingungkan.
  const setAmbangArea = (key, sisi, nilai) => {
    setForm((prev) => {
      const kini = prev.targets?.[key] ? [...prev.targets[key]] : ['', ''];
      kini[sisi] = nilai === '' ? '' : Number(nilai);
      const targets = { ...(prev.targets || {}) };
      if (kini[0] === '' || kini[1] === '') delete targets[key];
      else targets[key] = kini;
      return { ...prev, targets };
    });
  };

  const totalVolume = areas.reduce((n, a) => n + Number(a.volume || 0), 0);
  const totalHpp = areas.reduce((n, a) => n + hppTotal(a.id).total, 0);
  const pakaiAmbangKhusus = areas.filter((a) => METRIC_KEYS.some((k) => a.targets?.[k])).length;
  const sudahBerAlat = areas.filter((a) => a.deviceIds.length > 0).length;
  const areaTanpaAlat = areas.filter((a) => a.deviceIds.length === 0);
  const alatBelumDitempatkan = devices.filter((d) => !d.areaId);
  const adaCatatan = areaTanpaAlat.length > 0 || alatBelumDitempatkan.length > 0;

  return (
    <div>
      <PageHeader
        title="Kelola area"
        subtitle="Area menghubungkan kolam, growbed, dan tandon dengan alat sensor. Ambang per area menggantikan ambang bawaan kategori."
        actions={<Button icon="plus" onClick={bukaTambah}>Tambah area</Button>}
      />

      <div className="flex flex-col gap-4">
        {adaCatatan && (
          <Alert
            tone="warn"
            title={alatBelumDitempatkan.length > 0
              ? `${alatBelumDitempatkan.length} alat belum ditempatkan.`
              : `${areaTanpaAlat.length} area belum punya alat.`}
            action={areaTanpaAlat.length > 0
              ? <Button variant="secondary" icon="pencil" onClick={() => startEdit(areaTanpaAlat[0])}>Ubah {areaTanpaAlat[0].name}</Button>
              : null}
          >
            {alatBelumDitempatkan.length > 0 && (
              <>
                {alatBelumDitempatkan.map((d, i) => (
                  <span key={d.id}>{i > 0 && ', '}<span className="font-num">{d.code}</span> {d.name}</span>
                ))}
                {' '}sudah terdaftar, tetapi belum dipasang ke area mana pun.{' '}
              </>
            )}
            {areaTanpaAlat.length > 0 && `${areaTanpaAlat.map((a) => a.name).join(', ')} belum punya alat.`}
          </Alert>
        )}

        {areas.length === 0 ? (
          <EmptyState title="Belum ada area" icon="waves">
            Daftarkan kolam pertama beserta perangkatnya.
          </EmptyState>
        ) : (
          <Table head={['Area', 'Tipe', 'Komoditas dan populasi', 'Ambang per area', 'Alat IoT', 'HPP', 'Penanggung jawab', 'Aksi']}>
            {areas.map((area) => {
              const { total, perUnit } = hppTotal(area.id);
              const owners = users.filter((u) => u.areaIds?.includes(area.id));
              const kunciAmbang = METRIC_KEYS.filter((k) => area.targets?.[k]);
              return (
                <tr key={area.id} className="align-top hover:bg-surface-2">
                  <td className="min-w-[11rem] px-3 py-2.5">
                    <p className="font-semibold">{area.name}</p>
                    <p className="text-sm text-text-2">
                      {area.location} · {Number(area.volume).toLocaleString('id-ID')} {area.unit}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span data-area={areaTone(area.type)} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span data-ui="area-icon" className="inline-flex"><IkonSlot icon={ikonJenisArea(area.type)} size={16} /></span>
                      {TYPES.find((t) => t.value === area.type)?.label || area.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{area.commodity}</p>
                    <p className="text-text-2">{Number(area.population).toLocaleString('id-ID')} {area.populationUnit}</p>
                  </td>
                  <td className="min-w-[9rem] px-3 py-2.5">
                    {/* Ambang khusus area terlihat di sini supaya pengelola tahu
                        area mana yang menyimpang dari ambang bawaan kategori. */}
                    {kunciAmbang.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {kunciAmbang.map((k) => (
                          <span key={k}>
                            {labelAmbang(k)}{' '}
                            <span className="whitespace-nowrap font-num tabular-nums">{formatAngka(area.targets[k][0])}–{formatAngka(area.targets[k][1])}</span>
                            {METRIC_META[k].unit !== 'pH' && ` ${METRIC_META[k].unit}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-2">Bawaan kategori</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {area.deviceIds.length === 0 ? (
                      <StatusPill tone="warn" icon="triangle-alert">Belum ada alat</StatusPill>
                    ) : (
                      <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                        {area.deviceIds.slice(0, 3).map((id) => (
                          <span key={id} className="font-num text-sm">{devices.find((d) => d.id === id)?.code || id}</span>
                        ))}
                        {area.deviceIds.length > 3 && <span className="text-sm text-text-2">+{area.deviceIds.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-num font-semibold tabular-nums">{formatRupiah(total)}</p>
                    <p className="text-sm text-text-2">
                      {perUnit ? `${formatRupiah(perUnit)} / ${area.populationUnit}` : `${area.hpp.length} item`}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    {owners.length ? owners.map((o) => o.name).join(', ') : <span className="text-text-2">Belum ada</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <IconButton icon="pencil" size="sm" onClick={() => startEdit(area)} label={`Ubah area ${area.name}`} />
                      <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => setConfirm(area)} label={`Hapus area ${area.name}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        {areas.length > 0 && (
          <p className="text-text-2">
            {pakaiAmbangKhusus} dari {areas.length} area memakai ambang sendiri. Area tanpa ambang sendiri memakai ambang ideal dari Kategori alat.{' '}
            {sudahBerAlat} dari {areas.length} area sudah dipasangi alat IoT. Volume air sistem {totalVolume.toLocaleString('id-ID')} L, total HPP {formatRupiah(totalHpp)} (diinput pengguna).
          </p>
        )}
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah area: ${editing.name}` : 'Tambah area baru'} wide>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama area">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Kolam Nila C" required />
            </Field>
            <Field label="Tipe area">
              <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
            </Field>
            <Field label="Lokasi atau blok">
              <Input value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="cth. Blok Barat, Unit 3" />
            </Field>
            <Field label="Komoditas">
              <Input value={form.commodity} onChange={(v) => setForm({ ...form, commodity: v })} placeholder="cth. Ikan nila atau kangkung" />
            </Field>
            <Field label="Volume air (liter)">
              <NumberInput step="any" value={form.volume} onChange={(v) => setForm({ ...form, volume: v })} placeholder="12000" />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'aktif', label: 'Aktif' },
                  { value: 'istirahat', label: 'Istirahat atau kosong' },
                ]}
              />
            </Field>
            <Field label="Populasi">
              <NumberInput step="any" value={form.population} onChange={(v) => setForm({ ...form, population: v })} placeholder="500" />
            </Field>
            <Field label="Satuan populasi">
              <Select
                value={form.populationUnit}
                onChange={(v) => setForm({ ...form, populationUnit: v })}
                options={[
                  { value: 'ekor', label: 'ekor (ikan)' },
                  { value: 'lubang tanam', label: 'lubang tanam' },
                  { value: 'liter', label: 'liter' },
                ]}
              />
            </Field>
            <Field label="Catatan area" className="sm:col-span-2">
              <Input value={form.note} onChange={(v) => setForm({ ...form, note: v })} placeholder="cth. Siklus panen 4 bulan." />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-border p-3">
            <p className="font-head text-base font-bold leading-[22px]">Ambang khusus area ini (opsional)</p>
            <p className="text-text-2">
              Kosongkan bila area ini cukup memakai ambang bawaan kategori alat. Isi bila kolam ini punya
              target sendiri. Nilai di sini yang dipakai dashboard dan statistik harian.
            </p>
            <div className="grid items-stretch gap-4 sm:grid-cols-3">
              {METRIC_KEYS.map((key) => {
                const meta = METRIC_META[key];
                const nilai = form.targets?.[key];
                return (
                  <div key={key} className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-semibold leading-5">
                      {meta.label} <span className="font-normal text-text-2">({meta.unit})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        step="any"
                        placeholder={String(METRIC_RANGE[key][0])}
                        aria-label={`${meta.label} minimum`}
                        value={nilai ? nilai[0] : ''}
                        onChange={(v) => setAmbangArea(key, 0, v)}
                      />
                      <span aria-hidden="true" className="text-text-2">–</span>
                      <NumberInput
                        step="any"
                        placeholder={String(METRIC_RANGE[key][1])}
                        aria-label={`${meta.label} maksimum`}
                        value={nilai ? nilai[1] : ''}
                        onChange={(v) => setAmbangArea(key, 1, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold leading-5">
              Alat IoT di area ini ({form.deviceIds?.length || 0} dipilih)
            </span>
            <div className="flex flex-wrap gap-2">
              {devices.map((device) => {
                const picked = form.deviceIds?.includes(device.id);
                const others = device.areaId && device.areaId !== form.id;
                return (
                  <FilterChip key={device.id} active={Boolean(picked)} onClick={() => toggleDevice(device.id)}>
                    {device.code}
                    {others && ' (dipindah)'}
                  </FilterChip>
                );
              })}
            </div>
            <p className="text-text-2">
              Alat yang ditandai <strong className="text-text">(dipindah)</strong> sebelumnya berada di area lain dan akan dipindahkan ke area ini.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" icon="save">{editing ? 'Simpan perubahan' : 'Tambah area'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus area">
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="text-text-2">
              Area <strong className="text-text">{confirm.name}</strong> akan dihapus. {confirm.deviceIds.length} alat pada area ini akan
              berstatus <strong className="text-text">belum ditempatkan</strong> dan dapat dipindahkan ke area lain.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="danger" icon="trash-2" onClick={() => { removeArea(confirm.id); setConfirm(null); }}>
                Hapus area
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
