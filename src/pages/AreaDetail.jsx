import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatRupiah, METRIC_META, useSmart } from '../store/SmartStore';
import { IconButton,
  Badge, Button, Card, Empty, Field, Input, NumberInput, SectionTitle, StatCard, STATUS_LABEL,
  STATUS_TONE, Select, Table, TextArea,
} from '../components/ui';

const emptyHpp = { name: '', qty: 1, unit: 'unit', unitPrice: '' };
// Pemantauan manual memakai tiga parameter yang sama dengan sensor: pH, suhu, TDS.
const emptyNote = { ph: '', temp: '', tds: '', note: '' };
const emptyMati = { jumlah: '', catatan: '' };

const WARNA_STATUS = { aman: 'ok', waspada: 'warn', bahaya: 'bad', 'tanpa-ambang': 'muted' };
const TEKS_STATUS = { aman: 'Aman', waspada: 'Waspada', bahaya: 'Keluar ambang', 'tanpa-ambang': 'Tanpa ambang' };
const angka = (value, digit) => (value == null ? '·' : Number(value).toFixed(digit));

export default function AreaDetail() {
  const { id } = useParams();
  const {
    areasSaya, bolehAksesArea, devicesByArea, hppTotal, monitoring, harvests, saveHpp, removeHpp, addMonitoring,
    removeMonitoring, addHarvest, statistikArea, kematian, catatKematian, removeKematian, currentUser,
  } = useSmart();
  const [hppForm, setHppForm] = useState(emptyHpp);
  const [editingHpp, setEditingHpp] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [matiForm, setMatiForm] = useState(emptyMati);
  const [harvest, setHarvest] = useState({ qty: '', unit: 'kg', revenue: '', note: '', date: new Date().toISOString().slice(0, 10) });

  const area = areasSaya.find((a) => a.id === id);

  // Periksa HAK AKSES lebih dulu, sebelum mencari areanya. Kalau urutannya
  // dibalik, area milik operator lain tidak ditemukan di `areasSaya` sehingga
  // yang muncul justru pesan "area tidak ditemukan" — padahal masalahnya izin.
  if (!bolehAksesArea(id)) {
    return (
      <Card>
        <Empty title="Area ini bukan tanggung jawab Anda" icon="lock" hint="Hubungi pengelola bila Anda perlu akses ke area ini." />
        <Link to="/area" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke Kelola Area
        </Link>
      </Card>
    );
  }

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

  const stats = statistikArea(area.id);
  const catatanMati = kematian.filter((k) => k.areaId === area.id);
  const matiHariIni = catatanMati.reduce((sum, k) => sum + Number(k.jumlah || 0), 0);
  const punyaSensor = areaDevices.some((d) => d.metric);
  // Ikan mati hanya relevan untuk kolam ikan; growbed dan tandon tidak berisi ikan.
  const isKolam = area.type === 'kolam';
  const satuanPopulasi = area.populationUnit || 'ekor';

  const submitHpp = (event) => {
    event.preventDefault();
    if (!hppForm.name || !hppForm.unitPrice) return;
    saveHpp(area.id, { ...hppForm, qty: Number(hppForm.qty) || 0, unitPrice: Number(hppForm.unitPrice) || 0 });
    setHppForm(emptyHpp);
    setEditingHpp(null);
  };

  const submitNote = (event) => {
    event.preventDefault();
    const entry = { areaId: area.id, areaName: area.name, by: currentUser?.name || 'Pengguna' };
    for (const key of ['ph', 'temp', 'tds']) {
      if (noteForm[key] !== '' && noteForm[key] != null) entry[key] = Number(noteForm[key]);
    }
    entry.note = noteForm.note;
    addMonitoring(entry);
    setNoteForm(emptyNote);
  };

  const submitMati = (event) => {
    event.preventDefault();
    if (matiForm.jumlah === '') return;
    catatKematian(area.id, matiForm.jumlah, matiForm.catatan);
    setMatiForm(emptyMati);
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">{area.type} · {area.location}</p>
            <h2 className="text-2xl font-extrabold text-on-surface">{area.name}</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {area.commodity} · {Number(area.population).toLocaleString('id-ID')} {area.populationUnit} ·{' '}
              {Number(area.volume).toLocaleString('id-ID')} {area.unit} air
            </p>
            {area.note && <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">{area.note}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone={area.status === 'aktif' ? 'ok' : 'muted'}>{area.status === 'aktif' ? 'Area aktif' : 'Tidak aktif'}</Badge>
            {isKolam && <Badge tone={matiHariIni > 0 ? 'bad' : 'ok'}>Mati hari ini: {matiHariIni} ekor</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total HPP" value={formatRupiah(total)} icon="payments" hint={`${area.hpp.length} item biaya`} />
        <StatCard label="HPP / Unit" value={perUnit ? formatRupiah(perUnit) : '·'} icon="calculate" hint={`per ${area.populationUnit}`} />
        <StatCard label="Pendapatan" value={formatRupiah(revenue)} icon="savings" hint={`${crops.length} catatan panen`} />
        <StatCard
          label="Margin"
          value={formatRupiah(margin)}
          icon={margin >= 0 ? 'trending_up' : 'trending_down'}
          tone={margin >= 0 ? 'ok' : 'bad'}
          hint={revenue ? (margin >= 0 ? 'Untung dari biaya tercatat' : 'Masih di bawah biaya') : 'Belum ada panen tercatat'}
        />
      </div>

      {/* ── Statistik harian kolam dari sensor ── */}
      <Card>
        <SectionTitle
          eyebrow="Statistik Harian"
          title="Rekap sensor hari ini"
          subtitle="Terendah, rata-rata, dan tertinggi hari ini dari sensor pH, suhu air, dan TDS yang terpasang di area ini."
        />
        {!punyaSensor ? (
          <Empty
            title="Area ini belum dipasangi sensor"
            hint="Statistik harian hanya muncul untuk area yang punya perangkat pH, suhu, atau TDS."
            icon="sensors_off"
          />
        ) : (
          <>
            <p className="text-[11px] text-on-surface-variant mb-3">
              {stats.jumlah} pembacaan hari ini{stats.jam ? ` · pembacaan terakhir ${stats.jam}` : ''}
            </p>
            <div className="grid gap-3 sm:grid-cols-3 items-stretch">
              {stats.banding.map((row) => {
                const meta = METRIC_META[row.key];
                const s = row.stats;
                return (
                  <div key={row.key} className="rounded-2xl border border-outline-variant/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{meta.label}</span>
                      {s && <Badge tone={WARNA_STATUS[row.status]}>{TEKS_STATUS[row.status]}</Badge>}
                    </div>
                    {s ? (
                      <>
                        <p className="mt-1 text-3xl font-extrabold text-on-surface">
                          {angka(s.avg, meta.precision)}{' '}
                          <small className="text-xs font-semibold text-on-surface-variant">{meta.unit} rata-rata</small>
                        </p>
                        <dl className="mt-2 space-y-1 text-[11px] text-on-surface-variant">
                          <div className="flex justify-between">
                            <dt>Terendah</dt>
                            <dd className="font-semibold text-on-surface">{angka(s.min, meta.precision)} {meta.unit}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Tertinggi</dt>
                            <dd className="font-semibold text-on-surface">{angka(s.max, meta.precision)} {meta.unit}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>Jumlah pembacaan</dt>
                            <dd className="font-semibold text-on-surface">{s.n}</dd>
                          </div>
                        </dl>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-on-surface-variant">Belum ada pembacaan sensor ini hari ini.</p>
                    )}
                    {row.ambang && (
                      <p className="text-[11px] text-outline mt-2">
                        Ambang ideal {row.ambang[0]}–{row.ambang[1]} {meta.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {isKolam && (
        <Card>
          <SectionTitle
            eyebrow="Kematian Ikan"
            title="Catat jumlah ikan mati hari ini"
            subtitle="Diisi manual sesuai hitungan di kolam. Satu kolam satu catatan per hari: mengisi ulang di hari yang sama memperbarui angkanya, dan populasi kolam ikut disesuaikan."
          />
          <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
            <form onSubmit={submitMati} className="space-y-3">
              <Field label="Jumlah ikan mati (ekor)" hint={`Tanggal hari ini. Populasi tercatat: ${Number(area.population).toLocaleString('id-ID')} ${satuanPopulasi}`}>
                <NumberInput min="0" step="1" placeholder="0" value={matiForm.jumlah} onChange={(v) => setMatiForm({ ...matiForm, jumlah: v })} required />
              </Field>
              <Field label="Catatan (opsional)" hint="cth. ditemukan pagi, diduga kekurangan oksigen">
                <Input placeholder="Sebab atau temuan di lapangan" value={matiForm.catatan} onChange={(v) => setMatiForm({ ...matiForm, catatan: v })} />
              </Field>
              <Button type="submit" icon="save" className="w-full justify-center">Simpan catatan hari ini</Button>
              {matiHariIni > 0 && (
                <p className="text-[11px] text-on-surface-variant">
                  Tercatat hari ini: <strong className="text-on-surface">{matiHariIni} ekor</strong> untuk {area.name}.
                </p>
              )}
            </form>

            <div>
              {catatanMati.length === 0 ? (
                <Empty title="Belum ada catatan kematian" hint="Isi formulir di samping untuk mencatat hari ini." icon="heart_broken" />
              ) : (
                <Table head={['Tanggal', 'Jumlah', 'Catatan', '']}>
                  {catatanMati.map((row) => (
                    <tr key={row.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">{row.tanggal}</td>
                      <td className="px-3 py-2 font-bold text-on-surface">{row.jumlah} ekor</td>
                      <td className="px-3 py-2 text-on-surface-variant">{row.catatan || '·'}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <IconButton icon="delete" tone="bad" size="sm" onClick={() => removeKematian(row.id)} title="Hapus catatan (populasi dikembalikan)" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        {/* ── HPP ── */}
        <Card>
          <SectionTitle
            eyebrow="Harga Pokok Produksi"
            title="Item biaya area ini"
            subtitle="Masukkan setiap komponen biaya; sistem menjumlahkan dan menghitung HPP per unit secara otomatis."
          />
          <form onSubmit={submitHpp} className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr,1fr,auto] items-start mb-4">
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
            <Field label="Harga">
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
                      <IconButton icon="edit" size="sm" onClick={() => { setEditingHpp(item); setHppForm({ name: item.name, qty: item.qty, unit: item.unit, unitPrice: item.unitPrice, id: item.id }); }} title="Ubah item" />
                      <IconButton icon="delete" tone="bad" size="sm" onClick={() => removeHpp(area.id, item.id)} title="Hapus item" />
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
                  {perUnit ? ` (${formatRupiah(perUnit)} / ${area.populationUnit})` : ''}
                </td>
              </tr>
            </Table>
          )}
        </Card>

        {/* ── Pemantauan manual ── */}
        <Card>
          <SectionTitle eyebrow="Pemantauan" title="Catat kondisi kolam" subtitle="Isi minimal satu parameter. Setiap catatan memberi +15 point." />
          <form onSubmit={submitNote} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="pH air">
                <NumberInput step="0.01" placeholder="6.80" value={noteForm.ph} onChange={(v) => setNoteForm({ ...noteForm, ph: v })} />
              </Field>
              <Field label="Suhu air (°C)">
                <NumberInput step="0.1" placeholder="25.8" value={noteForm.temp} onChange={(v) => setNoteForm({ ...noteForm, temp: v })} />
              </Field>
              <Field label="TDS (ppm)">
                <NumberInput step="1" placeholder="780" value={noteForm.tds} onChange={(v) => setNoteForm({ ...noteForm, tds: v })} />
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
                        {note.temp != null && <Badge tone="info">{note.temp} °C</Badge>}
                        {note.tds != null && <Badge tone="info">TDS {note.tds} ppm</Badge>}
                      </div>
                    </div>
                    <IconButton icon="delete" tone="bad" size="sm" onClick={() => removeMonitoring(note.id)} title="Hapus catatan" />
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
