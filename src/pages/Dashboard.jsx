import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ambangUntuk, formatRupiah, METRIC_KEYS, METRIC_META, nilaiTerhadapAmbang, useSmart } from '../store/SmartStore';
import { Badge, Bar, Card, Empty, SectionTitle, StatCard, STATUS_LABEL, STATUS_TONE, Table } from '../components/ui';

const WARNA_STATUS = { aman: 'ok', waspada: 'warn', bahaya: 'bad', 'tanpa-ambang': 'muted' };
const TEKS_STATUS = { aman: 'Aman', waspada: 'Waspada', bahaya: 'Keluar ambang', 'tanpa-ambang': 'Tanpa ambang' };
const angka = (value, digit) => (value == null ? '·' : Number(value).toFixed(digit));

export default function Dashboard() {
  const {
    areasSaya, devices, categories, monitoring, hppTotal, pet, points, activeAlerts, missions,
    statistikArea, totalKematianHariIni, kematianArea, historiArea,
  } = useSmart();
  const areas = areasSaya;

  const metrics = useMemo(() => {
    // Ambil sensor dari AREA YANG DIAMPU pengguna saja. Sebelumnya diambil dari
    // seluruh device, sehingga operator bisa melihat pembacaan kolam milik
    // operator lain di dashboardnya.
    const byKey = {};
    for (const key of METRIC_KEYS) {
      byKey[key] = devices.find((d) => d.metric?.key === key && areas.some((a) => a.id === d.areaId));
    }
    return byKey;
  }, [devices, areas]);

  const totalHpp = areas.reduce((sum, area) => sum + hppTotal(area.id).total, 0);
  const doneMissions = missions.filter((m) => m.done).length;
  const waterVolume = areas.reduce((sum, a) => sum + Number(a.volume || 0), 0);
  const matiHariIni = totalKematianHariIni();
  const areaBerSensor = areas.filter((a) => devices.some((d) => d.areaId === a.id && d.metric));
  // Catatan yang tampil hanya dari area yang diampu pengguna ini.
  const idAreaSaya = new Set(areas.map((a) => a.id));
  const monitoringSaya = monitoring.filter((m) => idAreaSaya.has(m.areaId));

  // Ambang memakai helper bersama di store — jangan membuat daftar ambang
  // sendiri di sini, karena itu membuat halaman ini menilai "Ideal/Keluar
  // ambang" berbeda dari List IoT dan statistik harian.
  const nilaiTelemetri = (device) => {
    if (!device?.metric) return { tone: 'muted', text: 'Belum ada data' };
    const { value, key } = device.metric;
    const ambang = ambangUntuk(
      areas.find((a) => a.id === device.areaId),
      categories.find((c) => c.id === device.categoryId),
      key,
    );
    if (!ambang) return { tone: 'muted', text: 'Tanpa ambang' };
    const posisi = nilaiTerhadapAmbang(value, ambang);
    if (posisi === 'dalam') return { tone: 'ok', text: 'Ideal' };
    return { tone: 'warn', text: posisi === 'atas' ? 'Di atas ambang' : 'Di bawah ambang' };
  };

  return (
    <div className="space-y-6">
      {/* Sambutan + kondisi utama */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <SectionTitle
            eyebrow="Ringkasan Hari Ini"
            title="Kondisi farm aquaponik Anda"
            subtitle="Sistem kolam + IoT yang menyatukan budidaya ikan dan sayur dalam satu siklus air."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Area Aktif" value={areas.filter((a) => a.status === 'aktif').length} unit={`/ ${areas.length}`} icon="water" hint="Kolam, growbed, tandon" />
            <StatCard label="Device Online" value={devices.filter((d) => d.status === 'online').length} unit={`/ ${devices.length}`} icon="sensors" hint="Telemetri 5 detik" />
            <StatCard label="Total Poin" value={points.toLocaleString('id-ID')} icon="stars" hint={`${doneMissions}/${missions.length} misi selesai`} />
            <StatCard
              label="Ikan Mati Hari Ini"
              value={matiHariIni}
              unit="ekor"
              icon="heart_broken"
              tone={matiHariIni > 0 ? 'bad' : 'ok'}
              hint={matiHariIni > 0 ? 'Diisi manual di Kelola Area' : 'Belum ada laporan hari ini'}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Virtual Pet" title={pet.name} subtitle={`${pet.species} · Level ${pet.level} (${pet.stage})`} />
          <div className="space-y-3">
            {[
              { label: 'Kenyang', value: pet.hunger, tone: pet.hunger < 40 ? 'bad' : 'brand' },
              { label: 'Kebahagiaan', value: pet.happiness, tone: 'info' },
              { label: 'Kebersihan', value: pet.hygiene, tone: pet.hygiene < 40 ? 'warn' : 'brand' },
              { label: 'Kesehatan', value: pet.health, tone: pet.health < 50 ? 'bad' : 'brand' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-on-surface-variant">{row.label}</span>
                  <span className="text-on-surface">{row.value}%</span>
                </div>
                <Bar value={row.value} tone={row.tone} />
              </div>
            ))}
          </div>
          <Link to="/v-pet" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Rawat pet sekarang <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </Card>
      </div>

      {/* Pembacaan sensor kunci — hanya 3 parameter yang benar-benar diukur */}
      <Card>
        <SectionTitle
          eyebrow="Telemetri Kunci"
          title="Parameter air kolam"
          subtitle="Tiga sensor terpasang di farm ini: pH, suhu air, dan TDS. Nilai bergerak otomatis tiap 5 detik (simulasi)."
          action={
            <Link to="/iot" className="text-sm font-bold text-primary hover:underline">
              Lihat semua device
            </Link>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {METRIC_KEYS.map((key) => {
            const device = metrics[key];
            const meta = METRIC_META[key];
            const health = nilaiTelemetri(device);
            const ambang = device
              ? ambangUntuk(
                  areas.find((a) => a.id === device.areaId),
                  categories.find((c) => c.id === device.categoryId),
                  key,
                )
              : null;
            return (
              <div key={key} className="rounded-2xl panel-inset p-4">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary text-[22px]">{meta.icon}</span>
                  <Badge tone={health.tone}>{health.text}</Badge>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-on-surface">
                  {device?.metric?.value ?? '·'} <small className="text-xs font-semibold text-on-surface-variant">{meta.unit}</small>
                </p>
                <p className="text-xs font-semibold text-on-surface-variant">{meta.label}</p>
                <p className="text-[11px] text-outline mt-1">{device ? device.code : 'Belum terpasang'}</p>
                {/* Ambang ditampilkan supaya label Ideal/Keluar ambang bisa dicek
                    sendiri oleh pengguna, bukan angka yang muncul tiba-tiba. */}
                <p className="text-[11px] text-outline mt-1">
                  {ambang
                    ? `Ambang ideal ${ambang[0]}–${ambang[1]} ${meta.unit}${device?.areaId ? '' : ' (belum ditempatkan)'}`
                    : 'Ambang belum diatur'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Statistik harian kolam */}
      <Card>
        <SectionTitle
          eyebrow="Statistik Harian"
          title="Rekap kondisi kolam hari ini"
          subtitle="Nilai terendah, rata-rata, dan tertinggi tiap parameter, dihitung dari pembacaan sensor pH, suhu air, dan TDS hari ini."
        />
        {areaBerSensor.length === 0 ? (
          <Empty
            title="Belum ada kolam dengan sensor"
            hint="Statistik harian muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area."
            icon="sensors_off"
          />
        ) : (
          <div className="space-y-4">
            {areaBerSensor.map((area) => {
              const stats = statistikArea(area.id);
              const mati = kematianArea(area.id);
              const matiJumlah = mati.reduce((sum, k) => sum + Number(k.jumlah || 0), 0);
              return (
                <div key={area.id} className="rounded-2xl border border-outline-variant/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-on-surface">{area.name}</h3>
                      <p className="text-[11px] text-on-surface-variant">
                        {area.location} · {stats.jumlah} pembacaan hari ini
                        {stats.jam ? ` · terakhir ${stats.jam}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone={matiJumlah > 0 ? 'bad' : 'ok'} icon="heart_broken">
                        Mati hari ini: {matiJumlah} ekor
                      </Badge>
                      <Link to={`/area/${area.id}`} className="text-sm font-bold text-primary hover:underline">
                        Kelola
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3 items-stretch">
                    {stats.banding.map((row) => {
                      const meta = METRIC_META[row.key];
                      const s = row.stats;
                      return (
                        <div key={row.key} className="rounded-xl border border-outline-variant/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                              {meta.label}
                            </span>
                            {s && <Badge tone={WARNA_STATUS[row.status]}>{TEKS_STATUS[row.status]}</Badge>}
                          </div>
                          {s ? (
                            <>
                              <p className="mt-1 text-2xl font-extrabold text-on-surface">
                                {angka(s.avg, meta.precision)}{' '}
                                <small className="text-xs font-semibold text-on-surface-variant">{meta.unit} rata-rata</small>
                              </p>
                              <p className="text-[11px] text-on-surface-variant">
                                Terendah {angka(s.min, meta.precision)} · Tertinggi {angka(s.max, meta.precision)}
                              </p>
                            </>
                          ) : (
                            <p className="mt-1 text-sm text-on-surface-variant">Belum ada pembacaan sensor ini hari ini.</p>
                          )}
                          {row.ambang && (
                            <p className="text-[11px] text-outline mt-1">
                              Ambang ideal {row.ambang[0]}–{row.ambang[1]} {meta.unit}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant">
                    <span>
                      Populasi sekarang:{' '}
                      <strong className="text-on-surface">
                        {Number(area.population).toLocaleString('id-ID')} {area.populationUnit}
                      </strong>
                    </span>
                    {mati[0]?.catatan && (
                      <span>
                        Catatan kematian: <strong className="text-on-surface">{mati[0].catatan}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-on-surface-variant">
              Angka kematian ikan diisi manual dari menu Kelola Area → detail kolam, bukan berasal dari sensor.
            </p>
          </div>
        )}
      </Card>

      {/* ── Histori harian kolam ── */}
      <Card>
        <SectionTitle
          eyebrow="Histori Harian"
          title="Riwayat kondisi kolam per tanggal"
          subtitle="Ringkasan tiap hari: rata-rata, terendah, dan tertinggi dari sensor pH, suhu air, dan TDS, lengkap dengan tanggal, bulan, dan tahunnya."
        />
        {areaBerSensor.length === 0 ? (
          <Empty
            title="Belum ada kolam dengan sensor"
            hint="Histori harian muncul setelah perangkat pH, suhu, atau TDS dipasang di sebuah area."
            icon="sensors_off"
          />
        ) : (
          <div className="space-y-6">
            {areaBerSensor.map((area) => {
              const histori = historiArea(area.id, 14);
              return (
                <div key={area.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-on-surface">{area.name}</h3>
                    <span className="text-[11px] text-on-surface-variant">
                      {histori.filter((h) => h.adaData).length} hari tercatat ·{' '}
                      {angka(histori.reduce((s, h) => s + h.jumlah, 0), 0)} pembacaan tersimpan
                    </span>
                  </div>
                  <Table head={['Tanggal', 'pH rata-rata', 'Suhu rata-rata', 'TDS rata-rata', 'Rentang hari ini', 'Ikan mati']}>
                    {histori.map((h) => (
                      <tr
                        key={h.tanggal}
                        className={h.hariIni ? 'bg-primary/5' : 'hover:bg-primary/5'}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-semibold text-on-surface">{h.label}</span>
                          {h.hariIni && (
                            <Badge tone="brand" className="ml-2">
                              Hari ini
                            </Badge>
                          )}
                        </td>
                        {h.metrik.map((row) => {
                          const meta = METRIC_META[row.key];
                          const s = row.stats;
                          return (
                            <td key={row.key} className="px-3 py-2 whitespace-nowrap">
                              {s ? (
                                <>
                                  <span className="font-semibold text-on-surface">
                                    {angka(s.avg, meta.precision)}
                                  </span>{' '}
                                  <span className="text-[11px] text-on-surface-variant">{meta.unit}</span>
                                  <span className="block text-[11px] text-on-surface-variant">
                                    {angka(s.min, meta.precision)}–{angka(s.max, meta.precision)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] text-on-surface-variant">·</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {h.metrik.map((row) => (
                              <Badge key={row.key} tone={WARNA_STATUS[row.status] || 'muted'}>
                                {METRIC_META[row.key].label.replace(' Air', '').replace(' Nutrisi', '')}{' '}
                                {TEKS_STATUS[row.status] || 'Tanpa data'}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {h.matiEkor > 0 ? (
                            <span className="font-bold text-amber-600">{h.matiEkor} ekor</span>
                          ) : (
                            <span className="text-[11px] text-on-surface-variant">·</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
              );
            })}
            <p className="text-[11px] text-on-surface-variant">
              Rentang hari ini = nilai terendah–tertinggi sepanjang hari itu. Statusnya memakai ambang
              ideal yang sama dengan kartu statistik di atas. Angka kematian diisi manual dari menu
              Kelola Area, bukan dari sensor.
            </p>
          </div>
        )}
      </Card>

      {/* Area & HPP */}
      <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        <Card>
          <SectionTitle
            eyebrow="Kelola Area"
            title="Area produksi & HPP"
            subtitle="Harga pokok dihitung otomatis dari item biaya yang Anda input."
            action={
              <Link to="/area" className="text-sm font-bold text-primary hover:underline">
                Kelola area
              </Link>
            }
          />
          {areas.length === 0 ? (
            <Empty title="Belum ada area" hint="Tambahkan kolam atau growbed di menu Kelola Area." icon="water" />
          ) : (
            <Table head={['Area', 'Komoditas', 'Sensor', 'HPP', 'Per Unit']}>
              {areas.map((area) => {
                const { total, perUnit } = hppTotal(area.id);
                const sensor = devices.filter((d) => d.areaId === area.id && d.metric);
                return (
                  <tr key={area.id} className="hover:bg-primary/5">
                    <td className="px-3 py-2">
                      <Link to={`/area/${area.id}`} className="font-bold text-on-surface hover:text-primary">
                        {area.name}
                      </Link>
                      <p className="text-[11px] text-on-surface-variant">{area.location}</p>
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant">{area.commodity}</td>
                    <td className="px-3 py-2">
                      <Badge tone={sensor.length ? 'info' : 'muted'}>
                        {sensor.length ? `${sensor.length} sensor` : 'Belum ada'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatRupiah(total)}</td>
                    <td className="px-3 py-2 text-on-surface-variant">
                      {perUnit ? `${formatRupiah(perUnit)} / ${area.populationUnit}` : '·'}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-on-surface-variant">
            <span>
              Total biaya tercatat: <strong className="text-on-surface">{formatRupiah(totalHpp)}</strong>
            </span>
            <span>
              Volume air dikelola: <strong className="text-on-surface">{waterVolume.toLocaleString('id-ID')} L</strong>
            </span>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Catatan Terbaru" title="Pemantauan & kondisi device" />
          <div className="space-y-3">
            {activeAlerts.length > 0 && (
              <div className="space-y-2">
                {activeAlerts.map((device) => (
                  <div key={device.id} className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">{device.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {device.code} · {STATUS_LABEL[device.status]}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[device.status]} className="ml-auto">
                      {device.battery}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {monitoringSaya.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-outline-variant/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-on-surface">{entry.note || 'Catatan pemantauan'}</p>
                  <span className="text-[11px] text-outline">{entry.at}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {entry.ph != null && `pH ${entry.ph}`}
                  {entry.temp != null && ` · ${entry.temp} °C`}
                  {entry.tds != null && ` · TDS ${entry.tds} ppm`}
                </p>
              </div>
            ))}
            {monitoringSaya.length === 0 && <Empty title="Belum ada catatan" hint="Catat pemantauan dari menu Kelola Area." icon="history" />}
          </div>
        </Card>
      </div>
    </div>
  );
}
