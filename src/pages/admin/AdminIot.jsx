import { useMemo, useState } from 'react';
import { useSmart } from '../../store/SmartStore';
import QrCode from '../../components/QrCode';
import { Badge, Button, Card, Empty, Field, Input, Modal, NumberInput, SectionTitle, Select, StatCard, Table, STATUS_LABEL, STATUS_TONE } from '../../components/ui';

const empty = { code: '', name: '', categoryId: '', areaId: '', model: '', firmware: 'v1.0.0', status: 'online', battery: 100, signal: 'LoRaWAN 95%', metricKey: 'ph', metricValue: 7 };

export default function AdminIot() {
  const { devices, categories, areas, saveDevice, removeDevice, calibrateDevice, setDeviceStatus, categoryOf, areaOf } = useSmart();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [qrDevice, setQrDevice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('');

  const open = editing !== null || form !== empty;
  const closeModal = () => { setEditing(null); setForm(empty); };

  const category = categories.find((c) => c.id === form.categoryId) || categories[0];

  const startEdit = (device) => {
    setEditing(device);
    setForm({
      ...empty,
      ...device,
      metricKey: device.metric?.key || categoryOf(device.categoryId)?.metrics[0].key || 'ph',
      metricValue: device.metric?.value ?? 7,
    });
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name || !form.code || !form.categoryId) return;
    const { metricKey, metricValue, ...rest } = form;
    saveDevice({ ...rest, metric: { key: metricKey, value: Number(metricValue) || 0 } });
    closeModal();
  };

  const filtered = useMemo(
    () =>
      devices.filter((device) =>
        !filter ||
        [device.name, device.code, device.model, categoryOf(device.categoryId)?.name].join(' ').toLowerCase().includes(filter.toLowerCase()),
      ),
    [devices, filter, categoryOf],
  );

  const unplaced = devices.filter((d) => !d.areaId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Perangkat" value={devices.length} icon="devices" hint="Terdaftar di sistem" />
        <StatCard label="Terhubung" value={devices.filter((d) => d.status === 'online').length} icon="wifi" hint="Mengirim telemetri" />
        <StatCard label="Butuh Tindakan" value={devices.filter((d) => d.status !== 'online').length} icon="build" tone="warn" hint="Kalibrasi / offline" />
        <StatCard label="Belum Ditempatkan" value={unplaced.length} icon="wrong_location" tone={unplaced.length ? 'warn' : 'ok'} hint="Belum ditautkan ke area" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="Kelola IoT"
          title="Registrasi & pemeliharaan perangkat"
          subtitle="Setiap alat memiliki kode QR. Saat dipindai, aplikasi menampilkan nama alat, kategori, fungsi, dan lokasinya."
          action={<Button icon="add" onClick={() => { setEditing(null); setForm({ ...empty, categoryId: categories[0]?.id || '' }); }}>Tambah device</Button>}
        />

        <div className="mb-4 max-w-md">
          <Field label="Cari perangkat">
            <Input placeholder="Nama, kode, model, atau kategori…" value={filter} onChange={setFilter} />
          </Field>
        </div>

        {filtered.length === 0 ? (
          <Empty title="Tidak ada perangkat cocok" icon="search_off" hint="Ubah kata kunci pencarian." />
        ) : (
          <Table head={['Kode', 'Perangkat', 'Kategori', 'Area', 'Status', 'Baterai', 'Kalibrasi', '']}>
            {filtered.map((device) => (
              <tr key={device.id} className="hover:bg-primary/5">
                <td className="px-3 py-2">
                  <p className="font-mono text-xs font-bold text-on-surface">{device.code}</p>
                  <button onClick={() => setQrDevice(device)} className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">qr_code_2</span> QR
                  </button>
                </td>
                <td className="px-3 py-2">
                  <p className="font-semibold text-on-surface">{device.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{device.model} · fw {device.firmware}</p>
                </td>
                <td className="px-3 py-2 text-on-surface-variant">{categoryOf(device.categoryId)?.name || '—'}</td>
                <td className="px-3 py-2">
                  <Select
                    className="min-w-[150px]"
                    value={device.areaId || ''}
                    onChange={(value) => saveDevice({ ...device, areaId: value || null })}
                    placeholder="Belum ditempatkan"
                    options={areas.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    className="min-w-[140px]"
                    value={device.status}
                    onChange={(value) => setDeviceStatus(device.id, value)}
                    options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                  />
                </td>
                <td className={`px-3 py-2 font-semibold ${device.battery < 40 ? 'text-red-600' : 'text-on-surface-variant'}`}>{device.battery}%</td>
                <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{device.lastCalibration}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => calibrateDevice(device.id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Kalibrasi ulang">
                      <span className="material-symbols-outlined text-[18px]">build_circle</span>
                    </button>
                    <button onClick={() => startEdit(device)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Ubah perangkat">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setConfirm(device)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus perangkat">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-3 text-[11px] text-on-surface-variant">
          Mengubah status ke <strong>Siap</strong> atau menekan tombol kalibrasi akan memperbarui tanggal kalibrasi terakhir perangkat.
        </p>
      </Card>

      <Modal open={open} onClose={closeModal} title={editing ? `Ubah perangkat — ${editing.name}` : 'Tambah perangkat IoT'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kode alat" hint="Dipakai sebagai isi QR, mis. AQ-PH-011">
              <Input value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="AQ-PH-011" required disabled={!!editing} />
            </Field>
            <Field label="Nama perangkat">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="cth. pH Probe Kolam Nila A" required />
            </Field>
            <Field label="Kategori device">
              <Select
                value={form.categoryId}
                onChange={(v) => setForm({ ...form, categoryId: v, metricKey: categories.find((c) => c.id === v)?.metrics[0].key || 'ph' })}
                placeholder="Pilih kategori"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                required
              />
            </Field>
            <Field label="Area penempatan">
              <Select value={form.areaId || ''} onChange={(v) => setForm({ ...form, areaId: v })} placeholder="Belum ditempatkan" options={areas.map((a) => ({ value: a.id, label: a.name }))} />
            </Field>
            <Field label="Model perangkat">
              <Input value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="cth. Atlas EZO-pH" />
            </Field>
            <Field label="Versi firmware">
              <Input value={form.firmware} onChange={(v) => setForm({ ...form, firmware: v })} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
            </Field>
            <Field label="Baterai (%)">
              <NumberInput min="0" max="100" value={form.battery} onChange={(v) => setForm({ ...form, battery: v })} />
            </Field>
            <Field label="Parameter yang diukur">
              <Select
                value={form.metricKey}
                onChange={(v) => setForm({ ...form, metricKey: v })}
                options={(category?.metrics || []).map((m) => ({ value: m.key, label: `${m.label} (${m.unit})` }))}
              />
            </Field>
            <Field label="Nilai awal">
              <NumberInput step="any" value={form.metricValue} onChange={(v) => setForm({ ...form, metricValue: v })} />
            </Field>
            <Field label="Sinyal / koneksi" className="sm:col-span-2">
              <Input value={form.signal} onChange={(v) => setForm({ ...form, signal: v })} placeholder="LoRaWAN 95% / WiFi -58 dBm" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" icon="save">{editing ? 'Simpan perubahan' : 'Tambah perangkat'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!qrDevice} onClose={() => setQrDevice(null)} title={qrDevice ? `QR alat — ${qrDevice.code}` : ''}>
        {qrDevice && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <QrCode value={`JAGOFARM|${qrDevice.code}|${qrDevice.id}`} size={220} />
            </div>
            <div className="rounded-xl border border-outline-variant/40 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="font-bold text-on-surface">Yang tampil saat QR dipindai</p>
              </div>
              <p className="text-on-surface-variant">
                <strong className="text-on-surface">{qrDevice.name}</strong> · kategori{' '}
                <strong className="text-on-surface">{categoryOf(qrDevice.categoryId)?.name}</strong> · model {qrDevice.model}
              </p>
              <p className="text-on-surface-variant">{categoryOf(qrDevice.categoryId)?.description}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant pt-1">Fungsi alat</p>
              <ul className="space-y-1">
                {qrDevice.functions?.map((fn) => (
                  <li key={fn} className="flex gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">chevron_right</span>
                    {fn}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone="info">Lokasi: {areaOf(qrDevice.areaId)?.name || 'belum ditempatkan'}</Badge>
                <Badge tone={STATUS_TONE[qrDevice.status]}>{STATUS_LABEL[qrDevice.status]}</Badge>
                <Badge>Baterai {qrDevice.battery}%</Badge>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus perangkat">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Perangkat <strong className="text-on-surface">{confirm.name}</strong> ({confirm.code}) akan dihapus dari sistem beserta QR-nya. Riwayat
              pembacaan pada area tetap tersimpan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
              <Button variant="danger" icon="delete" onClick={() => { removeDevice(confirm.id); setConfirm(null); }}>
                Hapus perangkat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
