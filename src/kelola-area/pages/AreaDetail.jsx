import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ambangSah, ambangUntuk, formatRupiah, METRIC_KEYS, METRIC_META, nilaiMetrik, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { localDateKey, localMonthKey } from '../../shared/model/localDate.js';
import { monthlyQuestChecklist } from '../../v-pet/model/petQuests.js';
import {
  Button, Card, EmptyState, Field, IconButton, Input, NumberInput, PageHeader, Select, STATUS_LABEL, STATUS_TONE,
  StatusPill, Table, Tautan, TautanTombol, TextArea,
} from '../../shared/components/ui';
import AreaSection from '../../components/iot/AreaSection.jsx';
import SensorReading from '../../components/iot/SensorReading.jsx';
import { formatSensorNumber } from '../../utils/iotPresentation.js';
import { areaTone } from '../model/areaTone.js';
import { formatNilaiSensor, labelJenisArea } from '../model/areaTampil.js';

const emptyHpp = { name: '', qty: 1, unit: 'unit', unitPrice: '' };
// Pemantauan manual memakai tiga parameter yang sama dengan sensor: pH, suhu, TDS.
const emptyNote = { ph: '', temp: '', tds: '', note: '' };
const emptyMati = { jumlah: '', catatan: '' };

// Status rekap harian dari store: selalu teks + ikon, tidak pernah hanya warna.
const STATUS_REKAP = {
  aman: { tone: 'ok', icon: 'circle-check', text: 'Aman' },
  waspada: { tone: 'warn', icon: 'triangle-alert', text: 'Waspada' },
  bahaya: { tone: 'bad', icon: 'circle-alert', text: 'Di luar batas' },
  'tanpa-ambang': { tone: 'muted', icon: 'circle-minus', text: 'Tanpa ambang' },
};
const IKON_SENSOR = { ph: 'flask-conical', temp: 'thermometer', tds: 'droplet' };
const IKON_STATUS_ALAT = { online: 'wifi', warning: 'triangle-alert', maintenance: 'wrench', offline: 'wifi-off' };
const angka = (value, digit) => (value == null ? '·' : formatSensorNumber(value, digit));

function TidakTersedia({ judul, isi, ikon }) {
  return (
    <div>
      <PageHeader title="Detail area" />
      <Card>
        <EmptyState
          title={judul}
          icon={ikon}
          action={<Tautan to="/area" icon="arrow-left">Kembali ke Area &amp; kolam</Tautan>}
        >
          {isi}
        </EmptyState>
      </Card>
    </div>
  );
}

function BarisRingkas({ label, children, awal = false }) {
  return (
    <div className={`flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2.5 ${awal ? '' : 'border-t border-border'}`}>
      <dt className="text-text-2">{label}</dt>
      <dd className="m-0 text-right font-semibold">{children}</dd>
    </div>
  );
}

export default function AreaDetail() {
  const { id } = useParams();
  const location = useLocation();
  const {
    areasSaya, bolehAksesArea, devicesByArea, categories, hppTotal, monitoring, harvests, saveHpp, removeHpp, addMonitoring,
    removeMonitoring, addHarvest, statistikArea, kematian, catatKematian, removeKematian, currentUser,
    catatPembersihanKolam, pondActivityEvents, petQuestCompletions,
  } = useSmart();
  const [hppForm, setHppForm] = useState(emptyHpp);
  const [editingHpp, setEditingHpp] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [matiForm, setMatiForm] = useState(emptyMati);
  const [harvest, setHarvest] = useState({ qty: '', unit: 'kg', revenue: '', note: '', date: localDateKey() });
  const [cleaningNote, setCleaningNote] = useState('');

  const area = areasSaya.find((a) => a.id === id);

  useEffect(() => {
    if (location.hash !== '#form-pemantauan') return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById('form-pemantauan')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, id]);

  // Periksa HAK AKSES lebih dulu, sebelum mencari areanya. Kalau urutannya
  // dibalik, area milik operator lain tidak ditemukan di `areasSaya` sehingga
  // yang muncul justru pesan "area tidak ditemukan", padahal masalahnya izin.
  if (!bolehAksesArea(id)) {
    return (
      <TidakTersedia
        judul="Area ini bukan tanggung jawab Anda"
        ikon="lock"
        isi="Hubungi pengelola bila Anda perlu akses ke area ini."
      />
    );
  }

  if (!area) {
    return (
      <TidakTersedia
        judul="Area tidak ditemukan"
        ikon="droplet-off"
        isi="Area mungkin sudah dihapus oleh pengelola."
      />
    );
  }

  const tone = areaTone(area.type);
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
  const monthlyCleaningQuest = isKolam
    ? monthlyQuestChecklist(petQuestCompletions, area.id, localMonthKey())[0]
    : null;
  const cleaningRecords = isKolam
    ? pondActivityEvents.filter((item) => item.areaId === area.id && item.activityCode === 'pond-cleaning').slice(0, 5)
    : [];

  // Satu pembacaan per sensor di area ini. Ambang lewat helper bersama di store
  // supaya penilaiannya sama dengan Pantauan dan Daftar alat. `min`/`max` hanya
  // dikirim untuk ambang yang valid dan tidak terbalik.
  const bacaan = areaDevices
    .filter((d) => d.metric && METRIC_KEYS.includes(d.metric.key))
    .map((device) => {
      const kategori = categories.find((c) => c.id === device.categoryId);
      const ambang = ambangUntuk(area, kategori, device.metric.key);
      const value = nilaiMetrik(device.metric);
      const posisi = nilaiTerhadapAmbang(value, ambang);
      const status = device.status !== 'online'
        ? 'stale'
        : !ambangSah(ambang) ? 'no-range' : posisi === 'atas' ? 'high' : posisi === 'bawah' ? 'low' : 'normal';
      return { device, ambang: ambangSah(ambang) ? ambang : null, value, status };
    });

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

  const submitPembersihan = (event) => {
    event.preventDefault();
    catatPembersihanKolam(area.id, cleaningNote);
    setCleaningNote('');
  };

  const submitHarvest = (event) => {
    event.preventDefault();
    if (!harvest.qty) return;
    addHarvest({ areaId: area.id, areaName: area.name, at: harvest.date, qty: Number(harvest.qty), unit: harvest.unit, revenue: Number(harvest.revenue) || 0, note: harvest.note });
    setHarvest({ qty: '', unit: 'kg', revenue: '', note: '', date: localDateKey() });
  };

  const rekapKolom = [
    { key: 'parameter', label: 'Parameter' },
    { key: 'status', label: 'Status' },
    { key: 'avg', label: 'Rata-rata', align: 'end', num: true },
    { key: 'min', label: 'Terendah', align: 'end', num: true },
    { key: 'max', label: 'Tertinggi', align: 'end', num: true },
    { key: 'n', label: 'Pembacaan', align: 'end', num: true },
    { key: 'ambang', label: 'Ambang ideal', align: 'end', num: true },
  ];
  const rekapBaris = stats.banding.map((row) => {
    const meta = METRIC_META[row.key];
    const s = row.stats;
    const st = STATUS_REKAP[row.status];
    return {
      id: row.key,
      parameter: `${meta.label} (${meta.unit})`,
      status: s ? <StatusPill tone={st.tone} icon={st.icon}>{st.text}</StatusPill> : <StatusPill tone="muted" icon="circle-minus">Tanpa data</StatusPill>,
      avg: s ? angka(s.avg, meta.precision) : 'Belum ada pembacaan hari ini',
      min: s ? angka(s.min, meta.precision) : '·',
      max: s ? angka(s.max, meta.precision) : '·',
      n: s ? s.n : '·',
      ambang: row.ambang ? `${formatNilaiSensor(row.ambang[0], meta.precision)}–${formatNilaiSensor(row.ambang[1], meta.precision)}` : '·',
    };
  });

  return (
    <div>
      <Tautan to="/area" icon="arrow-left" className="mb-3.5 text-sm">Kembali ke Area &amp; kolam</Tautan>

      <PageHeader
        title={area.name}
        subtitle={(
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>{labelJenisArea(area.type)} · {area.location}</span>
            <StatusPill tone={area.status === 'aktif' ? 'ok' : 'muted'} icon={area.status === 'aktif' ? 'circle-check' : 'circle-pause'}>
              {area.status === 'aktif' ? 'Area aktif' : 'Tidak aktif'}
            </StatusPill>
            {isKolam && (
              <StatusPill tone={matiHariIni > 0 ? 'bad' : 'ok'} icon={matiHariIni > 0 ? 'heart-crack' : 'circle-check'}>
                Mati hari ini: {matiHariIni} ekor
              </StatusPill>
            )}
          </span>
        )}
        actions={<TautanTombol to="#form-pemantauan" icon="plus">Catat pemantauan</TautanTombol>}
      />
      {area.note && <p className="-mt-2 mb-7 max-w-[70ch] text-text-2">{area.note}</p>}

      <div className="grid items-start gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* ── Sensor terpasang dan rekap harian ── */}
          {!punyaSensor ? (
            <Card area={tone} title="Rekap sensor hari ini">
              <EmptyState title="Area ini belum dipasangi sensor" icon="wifi-off">
                Statistik harian hanya muncul untuk area yang punya perangkat pH, suhu, atau TDS.
              </EmptyState>
            </Card>
          ) : (
            <>
              <AreaSection area={tone} title="Sensor terpasang" meta={`${areaDevices.length} alat`}>
                {bacaan.map(({ device, ambang, value, status }) => {
                  const meta = METRIC_META[device.metric.key];
                  return (
                    <SensorReading
                      key={device.id}
                      name={meta.label}
                      icon={IKON_SENSOR[device.metric.key]}
                      device={device.code}
                      value={value}
                      decimals={meta.precision}
                      unit={meta.unit}
                      min={ambang ? ambang[0] : undefined}
                      max={ambang ? ambang[1] : undefined}
                      status={status}
                    />
                  );
                })}
              </AreaSection>

              <Card
                area={tone}
                title="Rekap sensor hari ini"
                subtitle={`Terendah, rata-rata, dan tertinggi hari ini dari sensor pH, suhu air, dan TDS yang terpasang di area ini. ${stats.jumlah} pembacaan hari ini${stats.jam ? `, pembacaan terakhir ${stats.jam}` : ''}.`}
              >
                <Table columns={rekapKolom} rows={rekapBaris} />
              </Card>
            </>
          )}

          {/* ── Pemantauan manual dan riwayatnya ── */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-5">
            <Card
              title="Catat kondisi kolam"
              subtitle="Satu parameter cukup untuk menyimpan catatan. Misi Gamifikasi kualitas air tercentang jika minimal dua parameter manual tercatat hari ini. Setiap catatan memberi +15 poin."
            >
              <form id="form-pemantauan" onSubmit={submitNote} className="flex scroll-mt-24 flex-col gap-3">
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
                <div>
                  <Button type="submit" icon="save">Simpan pemantauan</Button>
                </div>
              </form>
            </Card>

            <Card title="Catatan pemantauan area">
              {notes.length === 0 ? (
                <EmptyState title="Belum ada catatan" icon="history" />
              ) : (
                <ul className="m-0 list-none p-0">
                  {notes.map((note, index) => (
                    <li key={note.id} className={`py-3 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{note.note || 'Catatan pemantauan'}</p>
                          <p className="mt-0.5 text-sm text-text-2">{note.at} · {note.by}</p>
                          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-num text-sm tabular-nums">
                            {note.ph != null && <span>pH {formatNilaiSensor(note.ph, METRIC_META.ph.precision)}</span>}
                            {note.temp != null && <span>{formatNilaiSensor(note.temp, METRIC_META.temp.precision)} °C</span>}
                            {note.tds != null && <span>TDS {formatNilaiSensor(note.tds, METRIC_META.tds.precision)} ppm</span>}
                          </p>
                        </div>
                        <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => removeMonitoring(note.id)} label="Hapus catatan" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ── Kematian ikan ── */}
          {isKolam && (
            <Card
              area={tone}
              title="Catat jumlah ikan mati hari ini"
              subtitle="Diisi manual sesuai hitungan di kolam. Satu kolam satu catatan per hari: mengisi ulang di hari yang sama memperbarui angkanya, dan populasi kolam ikut disesuaikan."
            >
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
                <form onSubmit={submitMati} className="flex flex-col gap-3">
                  <Field label="Jumlah ikan mati (ekor)" hint={`Tanggal hari ini. Populasi tercatat: ${Number(area.population).toLocaleString('id-ID')} ${satuanPopulasi}`}>
                    <NumberInput min="0" step="1" placeholder="0" value={matiForm.jumlah} onChange={(v) => setMatiForm({ ...matiForm, jumlah: v })} required />
                  </Field>
                  <Field label="Catatan" optional hint="cth. ditemukan pagi, diduga kekurangan oksigen">
                    <Input placeholder="Sebab atau temuan di lapangan" value={matiForm.catatan} onChange={(v) => setMatiForm({ ...matiForm, catatan: v })} />
                  </Field>
                  <div>
                    <Button type="submit" variant="secondary" icon="save">Simpan catatan hari ini</Button>
                  </div>
                  {matiHariIni > 0 && (
                    <p className="text-sm text-text-2">
                      Tercatat hari ini: <strong className="text-text">{matiHariIni} ekor</strong> untuk {area.name}.
                    </p>
                  )}
                </form>

                <div className="min-w-0">
                  {catatanMati.length === 0 ? (
                    <EmptyState title="Belum ada catatan kematian" icon="heart-crack">
                      Isi formulir untuk mencatat hari ini.
                    </EmptyState>
                  ) : (
                    <Table
                      columns={[
                        { key: 'tanggal', label: 'Tanggal' },
                        { key: 'jumlah', label: 'Jumlah', align: 'end', num: true },
                        { key: 'catatan', label: 'Catatan' },
                        { key: 'aksi', label: 'Aksi', align: 'end' },
                      ]}
                      rows={catatanMati.map((row) => ({
                        id: row.id,
                        tanggal: row.tanggal,
                        jumlah: `${row.jumlah} ekor`,
                        catatan: row.catatan || '·',
                        aksi: <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => removeKematian(row.id)} label="Hapus catatan (populasi dikembalikan)" />,
                      }))}
                    />
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── Misi bulanan: pembersihan kolam ── */}
          {isKolam && (
            <Card
              area={tone}
              title="Pembersihan area kolam ikan"
              subtitle="Quest bulanan: catat pembersihan fisik di sini. Penyimpanan menyelesaikan quest bulanan jika belum diklaim; kotak di detail V-Pet juga bisa diklik untuk klaim +10 EXP."
              action={monthlyCleaningQuest?.done
                ? <StatusPill tone="ok" icon="circle-check">Selesai bulan ini</StatusPill>
                : <StatusPill tone="muted" icon="clock">Belum selesai bulan ini</StatusPill>}
            >
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
                <form onSubmit={submitPembersihan} className="flex flex-col gap-3">
                  <Field label="Catatan pembersihan" optional hint="cth. buang sisa pakan dan bersihkan dinding kolam">
                    <Input
                      value={cleaningNote}
                      onChange={setCleaningNote}
                      placeholder="Ringkasan pekerjaan yang dilakukan"
                      maxLength={200}
                    />
                  </Field>
                  <div>
                    <Button type="submit" variant="secondary" icon="brush-cleaning">Catat pembersihan kolam</Button>
                  </div>
                  <p className="text-sm text-text-2">+10 EXP per pet di kolam, tanpa poin akun.</p>
                  <p className="text-sm text-text-2">Reward EXP tersedia jika ada V-Pet yang ditempatkan di kolam.</p>
                </form>
                <div className="min-w-0">
                  {cleaningRecords.length === 0 ? (
                    <EmptyState title="Belum ada catatan pembersihan" icon="brush-cleaning">
                      Catatan fisik yang disimpan akan muncul di sini.
                    </EmptyState>
                  ) : (
                    <ul className="m-0 list-none p-0">
                      {cleaningRecords.map((record, index) => (
                        <li key={record.id} className={`py-2.5 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}>
                          <p className="text-sm font-semibold">{record.at || 'Pembersihan kolam'}</p>
                          <p className="mt-0.5 text-sm text-text-2">{record.note || 'Pembersihan area kolam ikan'}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── HPP ── */}
          <Card
            title="Item biaya (HPP)"
            subtitle="Masukkan setiap komponen biaya; sistem menjumlahkan dan menghitung HPP per unit secara otomatis."
          >
            <div className="flex flex-col gap-3.5">
              <form onSubmit={submitHpp} className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] items-end gap-3">
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
                <Button type="submit" variant="secondary" icon={editingHpp ? 'save' : 'plus'}>{editingHpp ? 'Simpan' : 'Tambah'}</Button>
              </form>

              {area.hpp.length === 0 ? (
                <EmptyState title="Belum ada item biaya" icon="receipt-text">
                  Tambahkan benih, pakan, listrik, atau tenaga kerja.
                </EmptyState>
              ) : (
                <Table head={['Item', 'Jumlah', 'Harga satuan', 'Subtotal', 'Aksi']}>
                  {area.hpp.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-2">
                      <td className="px-3 py-2 font-semibold">{item.name}</td>
                      <td className="px-3 py-2">{Number(item.qty).toLocaleString('id-ID')} {item.unit}</td>
                      <td className="px-3 py-2 font-num tabular-nums">{formatRupiah(item.unitPrice)}</td>
                      <td className="px-3 py-2 font-num font-semibold tabular-nums">{formatRupiah(item.qty * item.unitPrice)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <IconButton icon="pencil" size="sm" onClick={() => { setEditingHpp(item); setHppForm({ name: item.name, qty: item.qty, unit: item.unit, unitPrice: item.unitPrice, id: item.id }); }} label="Ubah item" />
                          <IconButton icon="trash-2" variant="danger" size="sm" onClick={() => removeHpp(area.id, item.id)} label="Hapus item" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-2">
                    <td className="px-3 py-2 font-bold" colSpan={3}>
                      Total HPP {area.name}
                    </td>
                    <td className="px-3 py-2 font-num font-bold tabular-nums" colSpan={2}>
                      {formatRupiah(total)}
                      {perUnit ? ` (${formatRupiah(perUnit)} / ${area.populationUnit})` : ''}
                    </td>
                  </tr>
                </Table>
              )}

              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
                <span>Pendapatan <span className="font-num tabular-nums">{formatRupiah(revenue)}</span> dari {crops.length} catatan panen.</span>
                {revenue > 0 ? (
                  <StatusPill tone={margin >= 0 ? 'ok' : 'bad'} icon={margin >= 0 ? 'trending-up' : 'trending-down'}>
                    Margin {formatRupiah(margin)}: {margin >= 0 ? 'untung dari biaya tercatat' : 'masih di bawah biaya'}
                  </StatusPill>
                ) : (
                  <span>Margin dihitung setelah panen tercatat.</span>
                )}
              </p>
            </div>
          </Card>

          {/* ── Panen ── */}
          <Card title="Catat hasil panen" subtitle="Panen tercatat memberi +100 point.">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-5">
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
                  <Button type="submit" variant="secondary" icon="tractor">Catat panen</Button>
                </div>
              </form>
              {crops.length === 0 ? (
                <EmptyState title="Belum ada catatan panen" icon="tractor">
                  Panen yang dicatat akan muncul di sini.
                </EmptyState>
              ) : (
                <ul className="m-0 list-none p-0">
                  {crops.map((crop, index) => (
                    <li key={crop.id} className={`flex flex-wrap items-center justify-between gap-x-3 py-2.5 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}>
                      <span className="font-semibold">{crop.qty} {crop.unit} · {crop.at}</span>
                      <span className="font-num tabular-nums text-text-2">{formatRupiah(crop.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Populasi dan air" subtitle="Ambang area diatur pengelola.">
            <dl className="m-0">
              <BarisRingkas label="Komoditas" awal>{area.commodity}</BarisRingkas>
              <BarisRingkas label="Populasi">
                <span className="font-num tabular-nums">{Number(area.population).toLocaleString('id-ID')}</span> {area.populationUnit}
              </BarisRingkas>
              <BarisRingkas label="Volume air">
                <span className="font-num tabular-nums">{Number(area.volume).toLocaleString('id-ID')}</span> {area.unit}
              </BarisRingkas>
              <BarisRingkas label="Lokasi">{area.location}</BarisRingkas>
            </dl>
          </Card>

          <Card area={tone} title="Alat IoT di area ini">
            {areaDevices.length === 0 ? (
              <EmptyState title="Belum ada alat" icon="cpu">
                Minta pengelola memasang unit IoT di area ini.
              </EmptyState>
            ) : (
              <ul className="m-0 list-none p-0">
                {areaDevices.map((device, index) => (
                  <li key={device.id} className={`flex flex-col gap-1 py-2.5 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}>
                    <Tautan to={`/iot/${encodeURIComponent(device.id)}`} className="self-start">{device.name}</Tautan>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-num text-sm text-text-2">{device.code} · baterai {device.battery}%</span>
                      <StatusPill tone={STATUS_TONE[device.status]} icon={IKON_STATUS_ALAT[device.status]}>
                        {STATUS_LABEL[device.status]}
                      </StatusPill>
                    </span>
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
