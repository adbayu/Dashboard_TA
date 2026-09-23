import { useState } from 'react';
import { formatRupiah, useSmart } from '../../store/SmartStore';
import { Badge, Button, Card, Empty, Field, Input, Modal, NumberInput, SectionTitle, Select, StatCard, Table } from '../../components/ui';

const TYPES = [
  { value: 'kolam', label: 'Kolam Ikan' },
  { value: 'growbed', label: 'Growbed Sayur' },
  { value: 'tandon', label: 'Tandon Nutrisi' },
];
const empty = { name: '', type: 'kolam', location: '', volume: '', unit: 'liter', commodity: '', population: '', populationUnit: 'ekor', status: 'aktif', note: '', deviceIds: [] };

export default function AdminAreas() {
  const { areas, devices, users, saveArea, removeArea, hppTotal, saveDevice } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const open = editing !== null || form !== empty;
  const closeModal = () => { setEditing(null); setForm(empty); };

  const startEdit = (area) => {
    setEditing(area);
    setForm({ ...empty, ...area, deviceIds: [...(area.deviceIds || [])] });
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

  const totalVolume = areas.reduce((n, a) => n + Number(a.volume || 0), 0);
  const totalHpp = areas.reduce((n, a) => n + hppTotal(a.id).total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Area" value={areas.length} icon="water" hint="Kolam, growbed & tandon" />
        <StatCard label="Sudah Dipasangi IoT" value={areas.filter((a) => a.deviceIds.length > 0).length} unit={`/ ${areas.length}`} icon="sensors" hint="Punya minimal 1 sensor" />
        <StatCard label="Volume Air Sistem" value={totalVolume.toLocaleString('id-ID')} unit="L" icon="opacity" hint="Kapasitas gabungan" />
        <StatCard label="Nilai HPP" value={formatRupiah(totalHpp)} icon="payments" hint="Diinput pengguna" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kelola Area"
          title="Area yang sudah dipasangi IoT"
          subtitle="Area menghubungkan kolam/growbed dengan perangkat sensor. Pengguna mengisi HPP dan mencatat pemantauan di area masing-masing."
          action={<Button icon="add" onClick={() => { setEditing(null); setForm(empty); }}>Tambah area</Button>}
        />
        {areas.length === 0 ? (
          <Empty title="Belum ada area" icon="water" hint="Daftarkan kolam pertama beserta perangkatnya." />
        ) : (
          <Table head={['Area', 'Tipe', 'Komoditas', 'Populasi', 'IoT', 'HPP', 'Penanggung Jawab', '']}>
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
                      <button onClick={() => startEdit(area)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Ubah area">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => setConfirm(area)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus area">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
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
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
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
