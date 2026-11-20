import clsx from 'clsx';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ambangSah, ambangUntuk, formatRupiah, METRIC_KEYS, METRIC_META, nilaiMetrik, nilaiTerhadapAmbang, useSmart } from '../../shared/store/SmartStore';
import { Alert, Card, EmptyState, PageHeader, STATUS_LABEL, STATUS_TONE, StatusPill, Table, TautanTombol } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';
import AreaSection from '../../components/iot/AreaSection.jsx';
import ReadingChart from '../../components/iot/ReadingChart.jsx';
import SensorReading from '../../components/iot/SensorReading.jsx';
import TaskList from '../../components/iot/TaskList.jsx';
import { formatRentangAmbang, formatSensorNumber } from '../../utils/iotPresentation.js';
import { areaTone } from '../../kelola-area/model/areaTone.js';
import { missionActivityDestination } from '../../gamifikasi/model/missionNavigation.js';

// Status rekap harian dari store (aman | waspada | bahaya | tanpa-ambang | tanpa-data):
// selalu teks + ikon, tidak pernah hanya warna.
const STATUS_REKAP = {
  aman: { tone: 'ok', icon: 'circle-check', text: 'Aman' },
  waspada: { tone: 'warn', icon: 'triangle-alert', text: 'Waspada' },
  bahaya: { tone: 'bad', icon: 'circle-alert', text: 'Di luar batas' },
  'tanpa-ambang': { tone: 'muted', icon: 'circle-minus', text: 'Tanpa ambang' },
  'tanpa-data': { tone: 'muted', icon: 'circle-minus', text: 'Tanpa data' },
};
const IKON_SENSOR = { ph: 'flask-conical', temp: 'thermometer', tds: 'droplet' };
const STATUS_ALAT_IKON = { online: 'wifi', warning: 'triangle-alert', maintenance: 'wrench', offline: 'wifi-off' };

const angka = (value, digit) => (value == null ? '·' : formatSensorNumber(value, digit));
const labelPendek = (key) => METRIC_META[key].label.replace(' Air', '').replace(' Nutrisi', '');

const TAUTAN = clsx('rounded-sm font-semibold text-primary underline decoration-1 underline-offset-[3px] hover:text-primary-hover', FOKUS);

const tanggalHariIni = () =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

// Titik 24 jam terakhir dari riwayat pembacaan (satu titik tiap 30 menit).
// `at` disimpan sebagai waktu lokal "YYYY-MM-DDTHH:MM", jadi batasnya dibuat
// dengan format yang sama dan dibandingkan sebagai teks.
function titik24Jam(readings, areaId, key) {
  const batas = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const mulai = `${batas.getFullYear()}-${pad(batas.getMonth() + 1)}-${pad(batas.getDate())}T${pad(batas.getHours())}:${pad(batas.getMinutes())}`;
  return (readings || [])
    .filter((r) => r.areaId === areaId && r.at >= mulai && Number.isFinite(Number(r.readings?.[key])))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
    .map((r) => {
      const v = Number(r.readings[key]);
      return { t: r.at, min: v, max: v, avg: v };
    });
}

export default function Dashboard() {
  const {
    areasSaya, devices, categories, monitoring, hppTotal, pet, points, activeAlerts, missions, readings,
    statistikArea, kematianArea, historiArea,
  } = useSmart();
  const areas = areasSaya;

  // Catatan dan sensor yang tampil hanya dari area yang diampu pengguna ini.
  // Sebelumnya sensor diambil dari seluruh device, sehingga operator bisa
  // melihat pembacaan kolam milik operator lain di dashboardnya.
  const idAreaSaya = useMemo(() => new Set(areas.map((a) => a.id)), [areas]);
  const monitoringSaya = monitoring.filter((m) => idAreaSaya.has(m.areaId));
  const areaBerSensor = areas.filter((a) => devices.some((d) => d.areaId === a.id && d.metric));
  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const waterVolume = areas.reduce((sum, a) => sum + Number(a.volume || 0), 0);
  const doneMissions = missions.filter((m) => m.done).length;

  // Satu bacaan per sensor di area saya. Ambang memakai helper bersama di
  // store, jangan membuat daftar ambang sendiri di sini, supaya halaman ini
  // menilai "dalam/luar batas" sama dengan List IoT dan statistik harian.
  const bacaan = useMemo(
    () =>
      devices
        .filter((d) => d.metric && METRIC_KEYS.includes(d.metric.key) && idAreaSaya.has(d.areaId))
        .map((device) => {
          const area = areas.find((a) => a.id === device.areaId);
          const mentah = ambangUntuk(area, categories.find((c) => c.id === device.categoryId), device.metric.key);
          const ambang = ambangSah(mentah) ? mentah : null;
          const value = nilaiMetrik(device.metric);
          return { device, area, key: device.metric.key, value, ambang, posisi: nilaiTerhadapAmbang(value, ambang) };
        }),
    [devices, areas, categories, idAreaSaya],
  );
  const diLuarBatas = bacaan.filter((b) => b.posisi === 'atas' || b.posisi === 'bawah');

  // ── Ringkasan: semua angka dihitung dari data, bukan teks tetap ──────────────
  const alatOnline = devices.filter((d) => d.status === 'online').length;
  const perStatus = activeAlerts.reduce((acc, d) => ({ ...acc, [d.status]: (acc[d.status] || 0) + 1 }), {});
  const metaRingkasan = [
    `${alatOnline} dari ${devices.length} alat mengirim data`,
    ...Object.entries(perStatus).map(([status, jumlah]) => `${jumlah} ${(STATUS_LABEL[status] || status).toLowerCase()}`),
  ].join(' · ');

  const kalimatBacaan = (b) => {
    const meta = METRIC_META[b.key];
    const batas = b.posisi === 'atas' ? b.ambang[1] : b.ambang[0];
    return `${meta.label} di ${b.area?.name || b.device.code} ${formatSensorNumber(b.value, meta.precision)} ${meta.unit}, ${b.posisi === 'atas' ? 'di atas' : 'di bawah'} batas ${formatSensorNumber(batas, meta.precision)} ${meta.unit}.`;
  };

  let ringkasan;
  if (diLuarBatas.length > 0) {
    const utama = diLuarBatas[0];
    ringkasan = {
      tone: 'warn',
      title: `${diLuarBatas.length} parameter perlu dicek.`,
      body: `${kalimatBacaan(utama)}${diLuarBatas.length > 1 ? ` Lainnya: ${diLuarBatas.slice(1).map((b) => `${labelPendek(b.key)} di ${b.area?.name}`).join(', ')}.` : ''}`,
      action: { to: `/iot/${encodeURIComponent(utama.device.id)}/log`, label: `Lihat log ${labelPendek(utama.key)}` },
    };
  } else if (activeAlerts.length > 0) {
    ringkasan = {
      tone: 'warn',
      title: `${activeAlerts.length} alat perlu dicek.`,
      body: activeAlerts.map((d) => `${d.name} (${(STATUS_LABEL[d.status] || d.status).toLowerCase()})`).join(', ') + '.',
      action: { to: '/iot', label: 'Lihat alat' },
    };
  } else if (bacaan.length > 0) {
    ringkasan = {
      tone: 'ok',
      title: 'Semua parameter dalam batas.',
      body: `${bacaan.length} sensor di ${areaBerSensor.length} area terbaca di dalam ambang ideal.`,
      action: { to: '/iot', label: 'Lihat semua alat' },
    };
  } else {
    ringkasan = {
      tone: 'info',
      title: 'Belum ada sensor di area Anda.',
      body: 'Pasang alat pH, suhu, atau TDS di sebuah area agar pantauan terisi.',
      action: { to: '/iot', label: 'Lihat semua alat' },
    };
  }

  // Grafik: parameter yang keluar batas lebih dulu, selain itu sensor pertama.
  const fokus = diLuarBatas[0] || bacaan[0] || null;
  const fokusMeta = fokus ? METRIC_META[fokus.key] : null;
  const titikFokus = fokus ? titik24Jam(readings, fokus.device.areaId, fokus.key) : [];

  // Status misi berasal dari aktivitas yang disimpan, jadi tiap baris adalah
  // tautan ke aktivitasnya (bukan kotak centang yang bisa dicentang di sini).
  const tugas = missions.map((m) => {
    const tujuan = missionActivityDestination(m, areas);
    return { id: m.id, label: m.title, done: m.done, to: tujuan.path, state: tujuan.state };
  });

  return (
    <div>
      <PageHeader title="Pantauan hari ini" subtitle={tanggalHariIni()} />

      <Alert
        tone={ringkasan.tone}
        title={ringkasan.title}
        className="mb-7"
        meta={(
          <>
            <Icon name="clock" size={16} />
            {metaRingkasan}
          </>
        )}
        action={(
          <TautanTombol to={ringkasan.action.to}>
            {ringkasan.action.label}
          </TautanTombol>
        )}
      >
        {ringkasan.body}
      </Alert>

      <div className="grid items-start gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          {areaBerSensor.length === 0 ? (
            <EmptyState title="Belum ada kolam dengan sensor" icon="wifi-off">
              Pembacaan muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area.
            </EmptyState>
          ) : (
            areaBerSensor.map((area) => {
              const stats = statistikArea(area.id);
              const mati = kematianArea(area.id);
              const matiJumlah = mati.reduce((sum, k) => sum + Number(k.jumlah || 0), 0);
              const metaArea = [
                `${Number(area.population).toLocaleString('id-ID')} ${area.populationUnit}`,
                `mati hari ini ${matiJumlah} ekor`,
                `${stats.jumlah} pembacaan hari ini${stats.jam ? `, terakhir ${stats.jam}` : ''}`,
              ].join(' · ');
              return (
                <div key={area.id} className="min-w-0">
                  <AreaSection area={areaTone(area?.type)} title={area.name} meta={metaArea}>
                    {METRIC_KEYS.map((key) => {
                      const b = bacaan.find((item) => item.device.areaId === area.id && item.key === key);
                      if (!b) return null;
                      const meta = METRIC_META[key];
                      const status = b.device.status !== 'online'
                        ? 'stale'
                        : !b.ambang ? 'no-range' : b.posisi === 'atas' ? 'high' : b.posisi === 'bawah' ? 'low' : 'normal';
                      return (
                        <SensorReading
                          key={key}
                          name={meta.label}
                          icon={IKON_SENSOR[key]}
                          device={b.device.code}
                          value={b.value}
                          decimals={meta.precision}
                          unit={meta.unit}
                          min={b.ambang ? b.ambang[0] : undefined}
                          max={b.ambang ? b.ambang[1] : undefined}
                          status={status}
                        />
                      );
                    })}
                  </AreaSection>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-2">
                    {mati[0]?.catatan && (
                      <span>
                        Catatan kematian: <span className="text-text">{mati[0].catatan}</span>
                      </span>
                    )}
                    <Link to={`/area/${area.id}`} className={TAUTAN}>
                      Kelola {area.name}
                    </Link>
                  </div>
                </div>
              );
            })
          )}

          {/* Statistik harian kolam */}
          <Card
            title="Rekap kondisi kolam hari ini"
            subtitle="Nilai terendah, rata-rata, dan tertinggi tiap parameter, dihitung dari pembacaan sensor pH, suhu air, dan TDS hari ini."
          >
            {areaBerSensor.length === 0 ? (
              <EmptyState
                title="Belum ada kolam dengan sensor"
                hint="Statistik harian muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area."
                icon="wifi-off"
              />
            ) : (
              <>
                <Table head={['Area', 'Parameter', 'Rata-rata', 'Rentang', 'Ambang', 'Status']}>
                  {areaBerSensor.flatMap((area) =>
                    statistikArea(area.id).banding.map((row) => {
                      const meta = METRIC_META[row.key];
                      const s = row.stats;
                      const status = STATUS_REKAP[s ? row.status : 'tanpa-data'] || STATUS_REKAP['tanpa-data'];
                      return (
                        <tr key={`${area.id}-${row.key}`} className="hover:bg-surface-2">
                          <td className="whitespace-nowrap px-3 py-2 font-semibold">{area.name}</td>
                          <td className="whitespace-nowrap px-3 py-2">{meta.label}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-num tabular-nums">
                            {s ? `${angka(s.avg, meta.precision)} ${meta.unit}` : 'Belum ada pembacaan hari ini'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-num tabular-nums text-text-2">
                            {s ? `${angka(s.min, meta.precision)}–${angka(s.max, meta.precision)}` : '·'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-num tabular-nums text-text-2">
                            {row.ambang ? formatRentangAmbang(row.ambang, meta.unit, meta.precision) : 'Belum diatur'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <StatusPill tone={status.tone} icon={status.icon}>{status.text}</StatusPill>
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </Table>
                <p className="mt-3 text-sm text-text-2">
                  Angka kematian ikan diisi manual melalui Detail Kolam oleh pengguna atau V-Pet pengelola, bukan dari sensor.
                </p>
              </>
            )}
          </Card>

          {/* Histori harian kolam */}
          <Card
            title="Riwayat kondisi kolam per tanggal"
            subtitle="Ringkasan tiap hari: rata-rata, terendah, dan tertinggi dari sensor pH, suhu air, dan TDS, lengkap dengan tanggal, bulan, dan tahunnya."
          >
            {areaBerSensor.length === 0 ? (
              <EmptyState
                title="Belum ada kolam dengan sensor"
                hint="Histori harian muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area."
                icon="wifi-off"
              />
            ) : (
              <div className="space-y-6">
                {areaBerSensor.map((area) => {
                  const histori = historiArea(area.id, 14);
                  return (
                    <div key={area.id}>
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-head text-base font-bold text-text">{area.name}</h3>
                        <span className="text-sm text-text-2">
                          {histori.filter((h) => h.adaData).length} hari tercatat ·{' '}
                          {angka(histori.reduce((s, h) => s + h.jumlah, 0), 0)} pembacaan tersimpan
                        </span>
                      </div>
                      <Table head={['Tanggal', 'pH rata-rata', 'Suhu rata-rata', 'TDS rata-rata', 'Rentang hari ini', 'Ikan mati']}>
                        {histori.map((h) => (
                          <tr key={h.tanggal} className={h.hariIni ? 'bg-surface-2' : 'hover:bg-surface-2'}>
                            <td className="whitespace-nowrap px-3 py-2">
                              <span className="font-semibold">{h.label}</span>
                              {h.hariIni && (
                                <StatusPill tone="info" icon="calendar-days" className="ml-2">
                                  Hari ini
                                </StatusPill>
                              )}
                            </td>
                            {h.metrik.map((row) => {
                              const meta = METRIC_META[row.key];
                              const s = row.stats;
                              return (
                                <td key={row.key} className="whitespace-nowrap px-3 py-2 font-num tabular-nums">
                                  {s ? (
                                    <>
                                      <span className="font-semibold">{angka(s.avg, meta.precision)}</span>{' '}
                                      <span className="text-sm text-text-2">{meta.unit}</span>
                                      <span className="block text-sm text-text-2">
                                        {angka(s.min, meta.precision)}–{angka(s.max, meta.precision)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-text-2">·</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-2">
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {h.metrik.map((row) => {
                                  const status = STATUS_REKAP[row.status] || STATUS_REKAP['tanpa-data'];
                                  return (
                                    <StatusPill key={row.key} tone={status.tone} icon={status.icon}>
                                      {labelPendek(row.key)} {status.text}
                                    </StatusPill>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {h.matiEkor > 0 ? (
                                <StatusPill tone="warn" icon="heart-crack">{h.matiEkor} ekor</StatusPill>
                              ) : (
                                <span className="text-text-2">·</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Table>
                    </div>
                  );
                })}
                <p className="text-sm text-text-2">
                  Rentang hari ini = nilai terendah–tertinggi sepanjang hari itu. Statusnya memakai ambang
                  ideal yang sama dengan rekap di atas. Angka kematian diisi manual melalui
                  Detail Kolam oleh pengguna atau V-Pet pengelola, bukan dari sensor.
                </p>
              </div>
            )}
          </Card>

          {/* Area & HPP */}
          <Card
            title="Area produksi dan HPP"
            subtitle="Harga pokok dihitung otomatis dari item biaya yang Anda input."
            action={<Link to="/area" className={TAUTAN}>Kelola area</Link>}
          >
            {areas.length === 0 ? (
              <EmptyState title="Belum ada area" hint="Tambahkan kolam atau growbed di menu Kelola Area." icon="waves" />
            ) : (
              <Table head={['Area', 'Komoditas', 'Sensor', 'HPP', 'Per unit']}>
                {areas.map((area) => {
                  const { total, perUnit } = hppTotal(area.id);
                  const sensor = devices.filter((d) => d.areaId === area.id && d.metric);
                  return (
                    <tr key={area.id} className="hover:bg-surface-2">
                      <td className="px-3 py-2">
                        <Link to={`/area/${area.id}`} className={clsx('font-semibold text-text hover:text-primary', FOKUS)}>
                          {area.name}
                        </Link>
                        <p className="text-sm text-text-2">{area.location}</p>
                      </td>
                      <td className="px-3 py-2 text-text-2">{area.commodity}</td>
                      <td className="px-3 py-2">
                        {sensor.length
                          ? <StatusPill tone="info" icon="radio">{sensor.length} sensor</StatusPill>
                          : <StatusPill tone="muted" icon="circle-minus">Belum ada</StatusPill>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-num font-semibold tabular-nums">{formatRupiah(total)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-num tabular-nums text-text-2">
                        {perUnit ? `${formatRupiah(perUnit)} / ${area.populationUnit}` : '·'}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2">
              <span>
                Total biaya tercatat: <span className="font-num font-semibold text-text">{formatRupiah(totalHpp)}</span>
              </span>
              <span>
                Volume air dikelola: <span className="font-num font-semibold text-text">{waterVolume.toLocaleString('id-ID')} L</span>
              </span>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {fokus && (
            <Card area={areaTone(fokus.area?.type)}>
              <ReadingChart
                area={areaTone(fokus.area?.type)}
                sensor={{ name: `${fokusMeta.label} ${fokus.area?.name || ''}`.trim(), unit: fokusMeta.unit, decimals: fokusMeta.precision }}
                points={titikFokus}
                threshold={fokus.ambang ? { low: fokus.ambang[0], high: fokus.ambang[1] } : undefined}
              />
            </Card>
          )}

          <Card title="Tugas hari ini" subtitle={`${doneMissions} dari ${missions.length} selesai · ${points.toLocaleString('id-ID')} poin`}>
            {tugas.length === 0 ? (
              <p className="text-sm text-text-2">Belum ada misi hari ini.</p>
            ) : (
              <TaskList items={tugas} label="Tugas hari ini" />
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-border pt-3 text-sm text-text-2">
            <Icon name="heart" className="text-primary" />
            <span>
              <span className="font-semibold text-text">{pet.name}</span> · level {pet.level} · kenyang{' '}
              <span className="font-num">{pet.hunger}%</span> · bahagia <span className="font-num">{pet.happiness}%</span> · bersih{' '}
              <span className="font-num">{pet.hygiene}%</span> · sehat <span className="font-num">{pet.health}%</span>
            </span>
            <Link to="/v-pet" className={TAUTAN}>Rawat V-Pet</Link>
          </div>

          <Card title="Pemantauan dan kondisi alat">
            <div className="space-y-3">
              {activeAlerts.map((device) => (
                <div key={device.id} className="flex items-start gap-2.5 border-b border-border pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{device.name}</p>
                    <p className="font-mono text-xs text-text-2">{device.code}</p>
                  </div>
                  <StatusPill tone={STATUS_TONE[device.status]} icon={STATUS_ALAT_IKON[device.status] || 'circle-alert'}>
                    {STATUS_LABEL[device.status]} · {device.battery}%
                  </StatusPill>
                </div>
              ))}
              {monitoringSaya.slice(0, 4).map((entry) => (
                <div key={entry.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-text">{entry.note || 'Catatan pemantauan'}</p>
                    <span className="shrink-0 text-xs text-text-2">{entry.at}</span>
                  </div>
                  <p className="mt-0.5 font-num text-sm text-text-2">
                    {entry.ph != null && `pH ${entry.ph}`}
                    {entry.temp != null && ` · ${entry.temp} °C`}
                    {entry.tds != null && ` · TDS ${entry.tds} ppm`}
                  </p>
                </div>
              ))}
              {monitoringSaya.length === 0 && (
                <EmptyState title="Belum ada catatan" hint="Catat pemantauan dari menu Kelola Area." icon="history" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
