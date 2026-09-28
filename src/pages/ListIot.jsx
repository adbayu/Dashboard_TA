import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ambangUntuk, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../store/SmartStore';
import PanelInfoAlat from '../components/PanelInfoAlat';
import { Badge, Button, Card, Empty, Field, Input, Modal, SectionTitle, Select, StatCard, STATUS_LABEL, STATUS_TONE } from '../components/ui';

// Pengguna hanya boleh melihat perangkat di area yang menjadi tanggung jawabnya
// (diatur pengelola di Kelola User). Perangkat yang BELUM ditempatkan juga tidak
// terlihat oleh pengguna — bukan barang siapa pun sampai pengelola menugaskannya.
// Pengelola melihat semuanya.
const deviceTerlihat = (device, role, areaIds) =>
  role === 'pengelola' || (!!device.areaId && (areaIds || []).includes(device.areaId));

export default function ListIot() {
  const { devices, categories, areas, categoryOf, areaOf, role, currentUser } = useSmart();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('');

  const areaSaya = role === 'pengelola' ? areas : areas.filter((a) => (currentUser?.areaIds || []).includes(a.id));
  const devicesSaya = useMemo(
    () => devices.filter((d) => deviceTerlihat(d, role, currentUser?.areaIds)),
    [devices, role, currentUser],
  );

  const filtered = useMemo(
    () =>
      devicesSaya.filter((device) => {
        const matchQuery =
          !query ||
          [device.name, device.code, device.model].join(' ').toLowerCase().includes(query.toLowerCase());
        return (
          matchQuery &&
          (!category || device.categoryId === category) &&
          (!area || device.areaId === area) &&
          (!status || device.status === status)
        );
      }),
    [devicesSaya, query, category, area, status],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Total Device" value={devicesSaya.length} icon="devices" hint={role === 'pengelola' ? 'Terdaftar di sistem' : 'Di area yang Anda ampu'} />
        <StatCard label="Terhubung" value={devicesSaya.filter((d) => d.status === 'online').length} icon="wifi" hint="Mengirim data aktif" />
        <StatCard label="Perlu Perhatian" value={devicesSaya.filter((d) => d.status === 'warning').length} icon="warning" tone="warn" hint="Nilai atau baterai menyimpang" />
        <StatCard label="Perawatan" value={devicesSaya.filter((d) => d.status !== 'online' && d.status !== 'warning').length} icon="build" tone="bad" hint="Kalibrasi atau offline" />
      </div>

      <Card>
        <SectionTitle
          eyebrow="List IoT"
          title="Perangkat terpasang di farm"
          subtitle={
            role === 'pengelola'
              ? 'Setiap alat punya halaman detail berisi fungsi, parameter ukur, baterai, sinyal, dan jadwal kalibrasi.'
              : 'Menampilkan perangkat di area yang menjadi tanggung jawab Anda. Detail berisi fungsi alat, parameter ukur, baterai, sinyal, dan jadwal kalibrasi.'
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          <Field label="Cari device">
            <Input placeholder="Nama, kode, atau model…" value={query} onChange={setQuery} />
          </Field>
          <Field label="Kategori">
            <Select
              value={category}
              onChange={setCategory}
              placeholder="Semua kategori"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field label="Area">
            <Select value={area} onChange={setArea} placeholder="Semua area" options={areaSaya.map((a) => ({ value: a.id, label: a.name }))} />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={setStatus}
              placeholder="Semua status"
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </div>

        {filtered.length === 0 ? (
          <Empty title="Tidak ada device cocok" hint="Ubah kata kunci atau filter kategori/area." icon="search_off" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((device) => {
              const cat = categoryOf(device.categoryId);
              return (
                <Link
                  key={device.id}
                  to={`/iot/${device.id}`}
                  className="glass-card rounded-2xl p-4 hover:shadow-glass-elevated transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="material-symbols-outlined text-[24px] kat-icon"
                      style={{ '--kat': cat?.color || '#0f5238' }}
                    >
                      {cat?.icon || 'sensors'}
                    </span>
                    <Badge tone={STATUS_TONE[device.status]}>{STATUS_LABEL[device.status]}</Badge>
                  </div>
                  <h3 className="mt-3 font-bold text-on-surface leading-tight group-hover:text-primary">{device.name}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {device.code} · {device.model}
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-extrabold text-on-surface">
                        {device.metric?.value ?? '—'}
                        <small className="text-[11px] font-semibold text-on-surface-variant ml-1">{device.metric?.key}</small>
                      </p>
                      <p className="text-[11px] text-on-surface-variant">{areaOf(device.areaId)?.name || 'Belum ditempatkan'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-on-surface-variant flex items-center gap-1 justify-end">
                        <span className="material-symbols-outlined text-[13px]">battery_full</span>
                        {device.battery}%
                      </p>
                      <p className="text-[11px] text-outline">{cat?.name}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Detail informasi device ───────────────────────────────────────────────────
export function DeviceDetail() {
  const { id } = useParams();
  const { devices, areas, categoryOf, areaOf, calibrateDevice, assignDeviceArea, monitoring, role, currentUser } = useSmart();
  const [showQr, setShowQr] = useState(false);
  const device = devices.find((d) => d.id === id);

  // Perangkat di luar area yang diampu tidak boleh dibuka oleh pengguna —
  // samakan dengan aturan yang berlaku di halaman List IoT.
  // Untuk perangkat yang tidak ada sama sekali, biarkan jatuh ke pesan
  // "tidak ditemukan" di bawah supaya pesannya tidak menyesatkan.
  if (device && !deviceTerlihat(device, role, currentUser?.areaIds)) {
    return (
      <Card>
        <Empty title="Perangkat ini bukan di area Anda" icon="lock" hint="Hubungi pengelola bila Anda perlu akses ke perangkat ini." />
        <Link to="/iot" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke List IoT
        </Link>
      </Card>
    );
  }

  if (!device) {
    return (
      <Card>
        <Empty title="Device tidak ditemukan" hint="Perangkat mungkin sudah dihapus oleh pengelola." icon="devices_other" />
        <Link to="/iot" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Kembali ke List IoT
        </Link>
      </Card>
    );
  }

  const cat = categoryOf(device.categoryId);
  const area = areaOf(device.areaId);
  // Ambang memakai helper bersama supaya label di halaman ini tidak berbeda
  // dari dashboard dan statistik harian.
  const ambang = ambangUntuk(area, cat, device.metric?.key);
  const posisi = nilaiTerhadapAmbang(device.metric?.value, ambang);
  const relatedNotes = monitoring.filter((m) => m.areaId === device.areaId).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/iot" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Semua device
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" icon="qr_code_2" onClick={() => setShowQr(true)}>
            Kode QR alat
          </Button>
          <Button icon="build" onClick={() => calibrateDevice(device.id)}>
            Kalibrasi sekarang
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="w-14 h-14 rounded-2xl flex items-center justify-center panel-inset kat-icon"
              style={{ '--kat': cat?.color || '#0f5238' }}
            >
              <span className="material-symbols-outlined text-[28px]">{cat?.icon || 'sensors'}</span>
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80 dark:text-inverse-primary/75">{cat?.name}</p>
              <h2 className="text-2xl font-extrabold text-on-surface">{device.name}</h2>
              <p className="text-sm text-on-surface-variant">
                {device.code} · {device.model} · Firmware {device.firmware}
              </p>
            </div>
          </div>
          <Badge tone={STATUS_TONE[device.status]} icon="circle">
            {STATUS_LABEL[device.status]}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-on-surface-variant max-w-3xl">{device.description}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Fungsi Alat" title="Yang dilakukan device ini" subtitle="Penjelasan ini juga tampil saat QR alat dipindai di lapangan." />
            <ul className="space-y-2">
              {device.functions.map((fn) => (
                <li key={fn} className="flex items-start gap-2 text-sm text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">check_circle</span>
                  {fn}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle eyebrow="Pembacaan" title="Nilai sensor saat ini" subtitle="Diperbarui otomatis setiap 5 detik (simulasi)." />
            <div className="grid gap-3 sm:grid-cols-3 items-stretch">
              <div className="rounded-2xl border border-outline-variant/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {METRIC_META[device.metric?.key]?.label || device.metric?.key}
                </p>
                <p className="text-3xl font-extrabold text-on-surface mt-1">
                  {device.metric?.value ?? '—'} <small className="text-xs text-on-surface-variant">{METRIC_META[device.metric?.key]?.unit}</small>
                </p>
                <Badge
                  tone={posisi === null ? 'muted' : posisi === 'dalam' ? 'ok' : 'bad'}
                  className="mt-2"
                >
                  {posisi === null
                    ? 'Tanpa ambang'
                    : posisi === 'dalam'
                      ? 'Dalam ambang ideal'
                      : posisi === 'atas'
                        ? 'Di atas ambang ideal'
                        : 'Di bawah ambang ideal'}
                </Badge>
              </div>
              <div className="rounded-2xl border border-outline-variant/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Rentang ideal</p>
                <p className="text-lg font-extrabold text-on-surface mt-1">
                  {ambang ? `${ambang[0]} – ${ambang[1]} ${METRIC_META[device.metric?.key]?.unit || ''}` : '—'}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  {area?.targets?.[device.metric?.key]
                    ? 'Ambang khusus area ini (diatur pengelola lewat Kelola Area).'
                    : 'Ambang bawaan kategori device.'}
                </p>
              </div>
              <div className="rounded-2xl border border-outline-variant/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Penempatan</p>
                <div className="mt-2">
                  <Select
                    value={device.areaId || ''}
                    onChange={(value) => assignDeviceArea(device.id, value || null)}
                    placeholder="Belum ditempatkan"
                    options={areas.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  {area ? `${area.location} · ${area.commodity}` : 'Pindahkan alat ke area lain bila perlu.'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Kontekstual" title="Catatan area terkait" subtitle="Pemantauan manual terakhir di area tempat alat ini dipasang." />
            {relatedNotes.length === 0 ? (
              <Empty title="Belum ada catatan manual" hint="Catatan ditambahkan dari menu Kelola Area." icon="history" />
            ) : (
              <div className="space-y-2">
                {relatedNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-outline-variant/40 p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-semibold text-on-surface">{note.note || 'Catatan pemantauan'}</p>
                      <span className="text-[11px] text-outline">{note.at}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      oleh {note.by}
                      {note.ph != null && ` · pH ${note.ph}`}
                      {note.temp != null && ` · ${note.temp} °C`}
                      {note.tds != null && ` · TDS ${note.tds} ppm`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Kesehatan Unit" title="Diagnostik" />
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Baterai', value: `${device.battery}%`, icon: 'battery_full' },
                { label: 'Sinyal', value: device.signal, icon: 'signal_cellular_alt' },
                { label: 'Terpasang', value: device.installedAt, icon: 'event_available' },
                { label: 'Kalibrasi terakhir', value: device.lastCalibration, icon: 'build_circle' },
                { label: 'Area', value: area?.name || 'Belum ditempatkan', icon: 'water' },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">{row.icon}</span>
                    {row.label}
                  </dt>
                  <dd className="font-semibold text-on-surface text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {device.battery < 40 && (
              <p className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300/60 p-2 text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                Baterai rendah — ganti atau isi ulang sebelum unit berhenti mengirim data.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Kategori" title="Parameter yang diukur" />
            <div className="flex flex-wrap gap-2">
              {(cat?.metrics || []).map((m) => (
                <Badge key={m.key} tone={m.key === device.metric?.key ? 'brand' : 'muted'}>
                  {m.label} ({m.unit})
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-3">
              Kategori menentukan ambang ideal, daftar parameter, dan ikon alat di seluruh dashboard.
            </p>
          </Card>
        </div>
      </div>

      <Modal open={showQr} onClose={() => setShowQr(false)} title={`QR alat — ${device.code}`} wide>
        {/* Panel penjelasan BERSAMA: isi yang sama dengan yang dibaca pengguna di
            menu Detail Information dan dengan yang dipakai pengelola di Kelola IoT.
            Sebelumnya halaman ini punya QrPanel sendiri, sehingga penjelasan alat
            hidup di TIGA tempat dengan isi yang berbeda-beda. */}
        <PanelInfoAlat device={device} kategori={cat} area={area} />
      </Modal>
    </div>
  );
}
