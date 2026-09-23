import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatRupiah, useSmart } from '../store/SmartStore';
import {
  Badge, Button, Card, Empty, Field, Input, NumberInput, SectionTitle, StatCard, STATUS_LABEL,
  STATUS_TONE, Select, Table, TextArea,
} from '../components/ui';

const emptyHpp = { name: '', qty: 1, unit: 'unit', unitPrice: '' };
const emptyNote = { ph: '', doVal: '', temp: '', ec: '', note: '' };

export default function AreaDetail() {
  const { id } = useParams();
  const {
    areas, devicesByArea, hppTotal, monitoring, harvests, saveHpp, removeHpp, addMonitoring, removeMonitoring, addHarvest,
  } = useSmart();
  const [hppForm, setHppForm] = useState(emptyHpp);
  const [editingHpp, setEditingHpp] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [harvest, setHarvest] = useState({ qty: '', unit: 'kg', revenue: '', note: '', date: new Date().toISOString().slice(0, 10) });

  const area = areas.find((a) => a.id === id);
  if (!area) {
    return (
      <Card>
        <Empty title="Area tidak ditemukan" icon="water_off" hint="Area mungkin sudah dihapus oleh pengelola." />
        <Link to="/area" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke Kelola Area
        </Link>
      </Card>
    );
  }

  const { total, perUnit } = hppTotal(area.id);
  const areaDevices = devicesByArea(area.id);
  const notes = monitoring.filter((m) => m.areaId === area.id);
  const crops = harvests.filter((h) => h.areaId === area.id);
  const revenue = crops.reduce((sum, h) => sum + Number(h.revenue || 0), 0);
  const margin = revenue - total;

  const submitHpp = (event) => {
    event.preventDefault();
    if (!hppForm.name || !hppForm.unitPrice) return;
    saveHpp(area.id, { ...hppForm, qty: Number(hppForm.qty) || 0, unitPrice: Number(hppForm.unitPrice) || 0 });
    setHppForm(emptyHpp);
    setEditingHpp(null);
  };

  const submitNote = (event) => {
    event.preventDefault();
    const entry = { areaId: area.id, areaName: area.name, by: 'Budi Santoso' };
    for (const key of ['ph', 'doVal', 'temp', 'ec']) {
      if (noteForm[key] !== '' && noteForm[key] != null) entry[key] = Number(noteForm[key]);
    }
    entry.note = noteForm.note;
    addMonitoring(entry);
    setNoteForm(emptyNote);
  };

  const submitHarvest = (event) => {
    event.preventDefault();
    if (!harvest.qty) return;
    addHarvest({ areaId: area.id, areaName: area.name, at: harvest.date, qty: Number(harvest.qty), unit: harvest.unit, revenue: Number(harvest.revenue) || 0, note: harvest.note });
    setHarvest({ qty: '', unit: 'kg', revenue: '', note: '', date: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6">
      <Link to="/area" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Semua area
      </Link>

      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">{area.type} · {area.location}</p>
            <h2 className="text-2xl font-extrabold text-on-surface">{area.name}</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {area.commodity} · {Number(area.population).toLocaleString('id-ID')} {area.populationUnit} ·{' '}
              {Number(area.volume).toLocaleString('id-ID')} {area.unit} air
            </p>
            {area.note && <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">{area.note}</p>}
          </div>
          <Badge tone={area.status === 'aktif' ? 'ok' : 'muted'}>{area.status === 'aktif' ? 'Area aktif' : 'Tidak aktif'}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total HPP" value={formatRupiah(total)} icon="payments" hint={`${area.hpp.length} item biaya`} />
        <StatCard label="HPP / Unit" value={perUnit ? formatRupiah(perUnit) : '—'} icon="calculate" hint={`per ${area.populationUnit}`} />
        <StatCard label="Pendapatan" value={formatRupiah(revenue)} icon="savings" hint={`${crops.length} catatan panen`} />
        <StatCard
          label="Margin"
          value={formatRupiah(margin)}
          icon={margin >= 0 ? 'trending_up' : 'trending_down'}
          tone={margin >= 0 ? 'ok' : 'bad'}
          hint={revenue ? (margin >= 0 ? 'Untung dari biaya tercatat' : 'Masih di bawah biaya') : 'Belum ada panen tercatat'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        {/* ── HPP ── */}
        <Card>
          <SectionTitle
            eyebrow="Harga Pokok Produksi"
            title="Item biaya area ini"
            subtitle="Masukkan setiap komponen biaya; sistem menjumlahkan dan menghitung HPP per unit secara otomatis."
          />
          <form onSubmit={submitHpp} className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr,1fr,auto] items-end mb-4">
            <Field label="Nama item biaya">
              <Input
                placeholder="cth. Pakan apung 781-2"
                value={hppForm.name}
                onChange={(v) => setHppForm({ ...hppForm, name: v })}
                required
              />
            </Field>
            <Field label="Jumlah">
              <NumberInput min="0" step="any" value={hppForm.qty} onChange={(v) => setHppForm({ ...hppForm, qty: v })} />
            </Field>
            <Field label="Satuan">
              <Input placeholder="kg / ekor" value={hppForm.unit} onChange={(v) => setHppForm({ ...hppForm, unit: v })} />
            </Field>
            <Field label="Harga satuan">
              <NumberInput min="0" step="any" placeholder="Rp" value={hppForm.unitPrice} onChange={(v) => setHppForm({ ...hppForm, unitPrice: v })} required />
            </Field>
            <Button type="submit" icon="add">{editingHpp ? 'Simpan' : 'Tambah'}</Button>
          </form>

          {area.hpp.length === 0 ? (
            <Empty title="Belum ada item biaya" hint="Tambahkan benih, pakan, listrik, atau tenaga kerja." icon="receipt_long" />
          ) : (
            <Table head={['Item', 'Jumlah', 'Harga Satuan', 'Subtotal', '']}>
              {area.hpp.map((item) => (
                <tr key={item.id} className="hover:bg-primary/5">
                  <td className="px-3 py-2 font-semibold text-on-surface">{item.name}</td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {Number(item.qty).toLocaleString('id-ID')} {item.unit}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">{formatRupiah(item.unitPrice)}</td>
                  <td className="px-3 py-2 font-bold text-on-surface">{formatRupiah(item.qty * item.unitPrice)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingHpp(item); setHppForm({ name: item.name, qty: item.qty, unit: item.unit, unitPrice: item.unitPrice, id: item.id }); }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                        title="Ubah item"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHpp(area.id, item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600"
                        title="Hapus item"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5">
                <td className="px-3 py-2 font-extrabold text-on-surface" colSpan={3}>
                  Total HPP {area.name}
                </td>
                <td className="px-3 py-2 font-extrabold text-primary" colSpan={2}>
                  {formatRupiah(total)}
                  {perUnit ? ` — ${formatRupiah(perUnit)} / ${area.populationUnit}` : ''}
                </td>
              </tr>
            </Table>
          )}
        </Card>

        {/* ── Pemantauan ── */}
        <Card>
          <SectionTitle eyebrow="Pemantauan" title="Catat kondisi kolam" subtitle="Isi minimal satu parameter. Setiap catatan memberi +15 point." />
          <form onSubmit={submitNote} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="pH air">
                <NumberInput step="0.1" placeholder="6.8" value={noteForm.ph} onChange={(v) => setNoteForm({ ...noteForm, ph: v })} />
              </Field>
              <Field label="Oksigen (mg/L)">
                <NumberInput step="0.1" placeholder="6.9" value={noteForm.doVal} onChange={(v) => setNoteForm({ ...noteForm, doVal: v })} />
              </Field>
              <Field label="Suhu air (°C)">
                <NumberInput step="0.1" placeholder="25.8" value={noteForm.temp} onChange={(v) => setNoteForm({ ...noteForm, temp: v })} />
              </Field>
              <Field label="EC (mS/cm)">
                <NumberInput step="0.01" placeholder="1.8" value={noteForm.ec} onChange={(v) => setNoteForm({ ...noteForm, ec: v })} />
              </Field>
            </div>
            <Field label="Catatan kondisi">
              <TextArea
                placeholder="cth. Air jernih, nafsu makan ikan normal, daun mulai lebat…"
                value={noteForm.note}
                onChange={(v) => setNoteForm({ ...noteForm, note: v })}
              />
            </Field>
            <Button type="submit" icon="save" className="w-full justify-center">Simpan pemantauan</Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Riwayat" title="Catatan pemantauan area" />
          {notes.length === 0 ? (
            <Empty title="Belum ada catatan" icon="history" />
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-outline-variant/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{note.note || 'Catatan pemantauan'}</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        {note.at} · {note.by}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.ph != null && <Badge tone="info">pH {note.ph}</Badge>}
                        {note.doVal != null && <Badge tone="info">DO {note.doVal}</Badge>}
                        {note.temp != null && <Badge tone="info">{note.temp} °C</Badge>}
                        {note.ec != null && <Badge tone="info">EC {note.ec}</Badge>}
                      </div>
                    </div>
                    <button onClick={() => removeMonitoring(note.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600" title="Hapus catatan">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Panen" title="Catat hasil panen" subtitle="Panen tercatat memberi +100 point." />
            <form onSubmit={submitHarvest} className="grid grid-cols-2 gap-3">
              <Field label="Jumlah">
                <NumberInput step="any" placeholder="42" value={harvest.qty} onChange={(v) => setHarvest({ ...harvest, qty: v })} required />
              </Field>
              <Field label="Satuan">
                <Select value={harvest.unit} onChange={(v) => setHarvest({ ...harvest, unit: v })} options={[{ value: 'kg', label: 'kg' }, { value: 'ekor', label: 'ekor' }, { value: 'ikat', label: 'ikat' }]} />
              </Field>
              <Field label="Nilai jual (Rp)">
                <NumberInput step="any" placeholder="1470000" value={harvest.revenue} onChange={(v) => setHarvest({ ...harvest, revenue: v })} />
              </Field>
              <Field label="Tanggal">
                <Input type="date" value={harvest.date} onChange={(v) => setHarvest({ ...harvest, date: v })} />
              </Field>
              <Field label="Catatan" className="col-span-2">
                <Input placeholder="cth. Panen parsial nila ukuran 250 g" value={harvest.note} onChange={(v) => setHarvest({ ...harvest, note: v })} />
              </Field>
              <div className="col-span-2">
                <Button type="submit" icon="agriculture" className="w-full justify-center">Catat panen</Button>
              </div>
            </form>
            {crops.length > 0 && (
              <ul className="mt-4 space-y-2">
                {crops.map((crop) => (
                  <li key={crop.id} className="flex items-center justify-between rounded-xl border border-outline-variant/40 px-3 py-2 text-sm">
                    <span className="font-semibold text-on-surface">
                      {crop.qty} {crop.unit} · {crop.at}
                    </span>
                    <span className="text-on-surface-variant">{formatRupiah(crop.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Perangkat" title="Device IoT di area ini" />
            {areaDevices.length === 0 ? (
              <Empty title="Belum ada device" hint="Minta pengelola memasang unit IoT di area ini." icon="devices_other" />
            ) : (
              <ul className="space-y-2">
                {areaDevices.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 rounded-xl border border-outline-variant/40 p-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">sensors</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">{device.name}</p>
                      <p className="text-[11px] text-on-surface-variant">{device.code} · baterai {device.battery}%</p>
                    </div>
                    <Badge tone={STATUS_TONE[device.status]}>{STATUS_LABEL[device.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
