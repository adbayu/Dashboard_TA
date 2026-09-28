import { useState } from 'react';
import { formatRupiah, METRIC_KEYS, METRIC_META, METRIC_RANGE, useSmart } from '../../store/SmartStore';
import { IconButton, Badge, Button, Card, Empty, Field, Input, Modal, NumberInput, SectionTitle, Select, StatCard, Table } from '../../components/ui';

const TYPES = [
  { value: 'kolam', label: 'Kolam Ikan' },
  { value: 'growbed', label: 'Growbed Sayur' },
  { value: 'tandon', label: 'Tandon Nutrisi' },
];
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
  // bawaan kategori — supaya tidak ada setengah ambang yang membingungkan.
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total Area" value={areas.length} icon="water" hint="Kolam, growbed & tandon" />
        <StatCard label="Sudah Dipasangi IoT" value={areas.filter((a) => a.deviceIds.length > 0).length} unit={`/ ${areas.length}`} icon="sensors" hint="Punya minimal 1 sensor" />
        <StatCard label="Volume Air Sistem" value={totalVolume.toLocaleString('id-ID')} unit="L" icon="opacity" hint="Kapasitas gabungan" />
        <StatCard
          label="Ambang Khusus Area"
          value={pakaiAmbangKhusus}
          unit={`/ ${areas.length}`}
          icon="tune"
          tone={pakaiAmbangKhusus ? 'brand' : 'ok'}
          hint={pakaiAmbangKhusus ? 'Menyimpang dari bawaan kategori' : 'Semua pakai bawaan kategori'}
        />
        <StatCard label="Nilai HPP" value={formatRupiah(totalHpp)} icon="payments" hint="Diinput pengguna" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kelola Area"
          title="Area yang sudah dipasangi IoT"
          subtitle="Area menghubungkan kolam/growbed dengan perangkat sensor. Pengguna mengisi HPP dan mencatat pemantauan di area masing-masing."
          action={<Button icon="add" onClick={() => { setEditing(null); setForm(empty); setTerbuka(true); }}>Tambah area</Button>}
        />
        {areas.length === 0 ? (
          <Empty title="Belum ada area" icon="water" hint="Daftarkan kolam pertama beserta perangkatnya." />
        ) : (
          <Table head={['Area', 'Tipe', 'Komoditas', 'Populasi', 'Ambang', 'IoT', 'HPP', 'Penanggung Jawab', '']}>
            {areas.map((area) => {
              const { total, perUnit } = hppTotal(area.id);
              const owners = users.filter((u) => u.areaIds?.includes(area.id));
              return (
                <tr key={area.id} className="hover:bg-primary/5">
                  <td className="px-3 py-2">
                    <p className="font-bold text-on-surface">{area.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {area.location} · {Number(area.volume).toLocaleString('id-ID')} {area.unit}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={area.type === 'kolam' ? 'info' : area.type === 'growbed' ? 'ok' : 'brand'}>
                      {TYPES.find((t) => t.value === area.type)?.label || area.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">{area.commodity}</td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {Number(area.population).toLocaleString('id-ID')} {area.populationUnit}
                  </td>
                  <td className="px-3 py-2">
                    {/* Ambang khusus area terlihat di sini supaya pengelola tahu
                        area mana yang menyimpang dari ambang bawaan kategori. */}
                    {METRIC_KEYS.some((k) => area.targets?.[k]) ? (
                      <div className="flex flex-wrap gap-1">
                        {METRIC_KEYS.filter((k) => area.targets?.[k]).map((k) => (
                          <Badge key={k} tone="brand">
                            {METRIC_META[k].label.replace(' Air', '')} {area.targets[k][0]}–{area.targets[k][1]}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">Bawaan kategori</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {area.deviceIds.length === 0 ? (
                      <Badge tone="warn">Belum ada</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {area.deviceIds.slice(0, 3).map((id) => (
                          <Badge key={id} tone="info">
                            {devices.find((d) => d.id === id)?.code || id}
                          </Badge>
                        ))}
                        {area.deviceIds.length > 3 && <Badge>+{area.deviceIds.length - 3}</Badge>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-on-surface">{formatRupiah(total)}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {perUnit ? `${formatRupiah(perUnit)} / ${area.populationUnit}` : `${area.hpp.length} item`}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {owners.length ? owners.map((o) => o.name).join(', ') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton icon="edit" size="sm" onClick={() => startEdit(area)} title="Ubah area" />
                    <IconButton icon="delete" tone="bad" size="sm" onClick={() => setConfirm(area)} title="Hapus area" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah area — ${editing.name}` : 'Tambah area baru'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama area">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. Kolam Nila C" required />
            </Field>
            <Field label="Tipe area">
              <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
            </Field>
            <Field label="Lokasi / blok">
              <Input value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="cth. Blok Barat — Unit 3" />
            </Field>
            <Field label="Komoditas">
              <Input value={form.commodity} onChange={(v) => setForm({ ...form, commodity: v })} placeholder="cth. Ikan Nila / Kangkung" />
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
                  { value: 'istirahat', label: 'Istirahat / kosong' },
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

          <div className="rounded-2xl border border-outline-variant/40 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Ambang ideal khusus area ini (opsional)
            </p>
            <p className="text-[11px] text-on-surface-variant mb-3">
              Kosongkan bila area ini cukup memakai ambang bawaan kategori device. Isi bila kolam ini punya
              target sendiri — nilai di sini yang dipakai dashboard dan statistik harian.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 items-stretch">
              {METRIC_KEYS.map((key) => {
                const meta = METRIC_META[key];
                const nilai = form.targets?.[key];
                return (
                  <div key={key}>
                    <p className="text-[11px] font-bold text-on-surface mb-1">
                      {meta.label} <span className="font-normal text-on-surface-variant">({meta.unit})</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        step="any"
                        placeholder={String(METRIC_RANGE[key][0])}
                        value={nilai ? nilai[0] : ''}
                        onChange={(v) => setAmbangArea(key, 0, v)}
                      />
                      <span className="text-on-surface-variant text-sm">–</span>
                      <NumberInput
                        step="any"
                        placeholder={String(METRIC_RANGE[key][1])}
                        value={nilai ? nilai[1] : ''}
                        onChange={(v) => setAmbangArea(key, 1, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Perangkat IoT di area ini ({form.deviceIds?.length || 0} dipilih)
            </p>
            <div className="flex flex-wrap gap-2">
              {devices.map((device) => {
                const picked = form.deviceIds?.includes(device.id);
                const others = device.areaId && device.areaId !== form.id;
                return (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => toggleDevice(device.id)}
                    className={`inline-flex items-center h-7 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                      picked ? 'bg-primary text-white border-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    {device.code}
                    {others && <span className="ml-1 opacity-70">(dipindah)</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Perangkat yang ditandai <strong>(dipindah)</strong> sebelumnya berada di area lain dan akan dipindahkan ke area ini.
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
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Area <strong className="text-on-surface">{confirm.name}</strong> akan dihapus. {confirm.deviceIds.length} perangkat pada area ini akan
              berstatus <strong>belum ditempatkan</strong> dan dapat dipindahkan ke area lain.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="danger" icon="delete" onClick={() => { removeArea(confirm.id); setConfirm(null); }}>
                Hapus area
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
